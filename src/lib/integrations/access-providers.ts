import { GoogleAdsApi } from "google-ads-api";
import { prisma } from "@/lib/db";

// ─── Interface ───────────────────────────────────────────────────────

export interface AccessProvider {
    /**
     * Send a platform-level invitation to give a user access.
     * Returns true on success, throws on failure.
     */
    inviteUser(params: {
        email: string;
        role: string;
        token: string;
        externalId: string;
        config?: Record<string, any>;
    }): Promise<{ success: boolean; message: string }>;

    /**
     * Revoke a user's access at the platform level.
     * Returns true on success, throws on failure.
     */
    removeUser(params: {
        email: string;
        token: string;
        externalId: string;
        config?: Record<string, any>;
    }): Promise<{ success: boolean; message: string }>;

    /**
     * List all users and linked accounts from the platform.
     * Optional — returns null if not supported.
     */
    listUsers?(params: {
        token: string;
        externalId: string;
        config?: Record<string, any>;
    }): Promise<{
        users: Array<{
            email: string;
            name?: string;
            role: string;
            status: string;
            kind: string; // "USER" | "MANAGER"
        }>;
    }>;
}

// ─── Google Ads Config Helper ────────────────────────────────────────

interface GoogleAdsConfig {
    client_id: string;
    client_secret: string;
    developer_token: string;
}

let _configCache: { data: GoogleAdsConfig; expiry: number } | null = null;

async function getGoogleAdsConfig(): Promise<GoogleAdsConfig> {
    if (_configCache && Date.now() < _configCache.expiry) {
        return _configCache.data;
    }
    const settings = await prisma.globalSetting.findMany();
    const map = settings.reduce((acc: Record<string, string>, s) => {
        acc[s.key] = s.value;
        return acc;
    }, {});
    const config: GoogleAdsConfig = {
        client_id: map.GOOGLE_ADS_CLIENT_ID || process.env.GOOGLE_ADS_CLIENT_ID || "",
        client_secret: map.GOOGLE_ADS_CLIENT_SECRET || process.env.GOOGLE_ADS_CLIENT_SECRET || "",
        developer_token: map.GOOGLE_ADS_DEVELOPER_TOKEN || process.env.GOOGLE_ADS_DEVELOPER_TOKEN || "",
    };
    _configCache = { data: config, expiry: Date.now() + 60_000 };
    return config;
}

// ─── Google Ads Provider ─────────────────────────────────────────────

export class GoogleAdsAccessProvider implements AccessProvider {
    async inviteUser(params: {
        email: string;
        role: string;
        token: string;
        externalId: string;
        config?: Record<string, any>;
    }) {
        const { email, role, token, externalId, config: sourceConfig } = params;
        const cfg = await getGoogleAdsConfig();
        const accessRole = this.mapRole(role);

        try {
            // The google-ads-api library has a bug: its buildRequest creates { operations: [...] }
            // but the proto MutateCustomerUserAccessInvitationRequest expects { operation: {...} } (singular).
            // We bypass the library and call the gRPC service directly.
            const { CustomerUserAccessInvitationServiceClient } = require("google-ads-node");
            const { grpc } = require("google-gax");
            const { UserRefreshClient } = require("google-auth-library");

            const sslCreds = grpc.credentials.createSsl();
            const authClient = new UserRefreshClient(cfg.client_id, cfg.client_secret, token);
            const credentials = grpc.credentials.combineChannelCredentials(
                sslCreds,
                grpc.credentials.createFromGoogleCredential(authClient)
            );

            const service = new CustomerUserAccessInvitationServiceClient({
                sslCreds: credentials,
            });

            const request = {
                customer_id: externalId.replace(/-/g, ""),
                operation: {
                    create: {
                        email_address: email,
                        access_role: accessRole,
                    },
                },
            };

            const headers: Record<string, string> = {
                "developer-token": cfg.developer_token,
            };
            if (sourceConfig?.loginCustomerId) {
                headers["login-customer-id"] = sourceConfig.loginCustomerId.replace(/-/g, "");
            }

            await service.mutateCustomerUserAccessInvitation(request, {
                otherArgs: {
                    headers,
                },
            });

            return {
                success: true,
                message: `Uitnodiging verstuurd naar ${email} voor Google Ads account ${externalId}`,
            };
        } catch (err: any) {
            const message = err?.errors?.[0]?.message || err?.message || "Onbekende fout bij het versturen van de uitnodiging";
            console.error(`[GoogleAds] inviteUser failed for ${email}:`, err);
            throw new Error(message);
        }
    }

    async removeUser(params: {
        email: string;
        token: string;
        externalId: string;
        config?: Record<string, any>;
    }) {
        const { email, token, externalId, config: sourceConfig } = params;
        const cfg = await getGoogleAdsConfig();

        const client = new GoogleAdsApi({
            client_id: cfg.client_id,
            client_secret: cfg.client_secret,
            developer_token: cfg.developer_token,
        });

        const customer = client.Customer({
            customer_id: externalId,
            refresh_token: token,
            login_customer_id: sourceConfig?.loginCustomerId,
        });

        try {
            // First, find the user access resource by email
            const rows = await customer.query(`
                SELECT
                    customer_user_access.resource_name,
                    customer_user_access.email_address,
                    customer_user_access.access_role
                FROM customer_user_access
                WHERE customer_user_access.email_address = '${email}'
            `);

            if (rows.length === 0) {
                return {
                    success: true,
                    message: `Gebruiker ${email} had al geen toegang tot dit account`,
                };
            }

            const resourceName = rows[0].customer_user_access?.resource_name;
            if (!resourceName) {
                throw new Error("Kon de toegangsregel niet vinden voor deze gebruiker");
            }

            // The google-ads-api library has the same bug here: its buildRequest creates
            // { operations: [...] } but the proto expects { operation: {...} } (singular).
            // Bypass the library and call the gRPC service directly.
            const { CustomerUserAccessServiceClient } = require("google-ads-node");
            const { grpc } = require("google-gax");
            const { UserRefreshClient } = require("google-auth-library");

            const sslCreds = grpc.credentials.createSsl();
            const authClient = new UserRefreshClient(cfg.client_id, cfg.client_secret, token);
            const credentials = grpc.credentials.combineChannelCredentials(
                sslCreds,
                grpc.credentials.createFromGoogleCredential(authClient)
            );

            const service = new CustomerUserAccessServiceClient({
                sslCreds: credentials,
            });

            const headers: Record<string, string> = {
                "developer-token": cfg.developer_token,
            };
            if (sourceConfig?.loginCustomerId) {
                headers["login-customer-id"] = sourceConfig.loginCustomerId.replace(/-/g, "");
            }

            await service.mutateCustomerUserAccess(
                {
                    customer_id: externalId.replace(/-/g, ""),
                    operation: {
                        remove: resourceName,
                    },
                },
                {
                    otherArgs: { headers },
                }
            );

            return {
                success: true,
                message: `Toegang voor ${email} verwijderd uit Google Ads account ${externalId}`,
            };
        } catch (err: any) {
            const message = err?.errors?.[0]?.message || err?.message || "Onbekende fout bij het verwijderen van toegang";
            console.error(`[GoogleAds] removeUser failed for ${email}:`, err);
            throw new Error(message);
        }
    }

    private mapRole(role: string): number {
        // Google Ads AccessRoleEnum
        // 2 = ADMIN, 3 = STANDARD, 4 = READ_ONLY, 5 = EMAIL_ONLY
        const roleMap: Record<string, number> = {
            ADMIN: 2,
            STANDARD: 3,
            READ_ONLY: 4,
            EMAIL_ONLY: 5,
            USER: 4, // Default to read-only for "USER" role
        };
        return roleMap[role.toUpperCase()] || 4;
    }

    private reverseMapRole(accessRole: number | string): string {
        const map: Record<string, string> = {
            "2": "ADMIN",
            "3": "STANDARD",
            "4": "READ_ONLY",
            "5": "EMAIL_ONLY",
            "ADMIN": "ADMIN",
            "STANDARD": "STANDARD",
            "READ_ONLY": "READ_ONLY",
            "EMAIL_ONLY": "EMAIL_ONLY",
        };
        return map[String(accessRole)] || String(accessRole);
    }

    async listUsers(params: {
        token: string;
        externalId: string;
        config?: Record<string, any>;
    }) {
        const { token, externalId, config: sourceConfig } = params;
        const cfg = await getGoogleAdsConfig();

        const client = new GoogleAdsApi({
            client_id: cfg.client_id,
            client_secret: cfg.client_secret,
            developer_token: cfg.developer_token,
        });

        const customer = client.Customer({
            customer_id: externalId,
            refresh_token: token,
            login_customer_id: sourceConfig?.loginCustomerId,
        });

        const users: Array<{
            email: string;
            name?: string;
            role: string;
            status: string;
            kind: string;
        }> = [];

        try {
            // 1. Query email-based user access
            const userRows = await customer.query(`
                SELECT
                    customer_user_access.user_id,
                    customer_user_access.email_address,
                    customer_user_access.access_role,
                    customer_user_access.access_creation_date_time,
                    customer_user_access.inviter_user_email_address
                FROM customer_user_access
            `);

            for (const row of userRows) {
                const access = row.customer_user_access;
                if (!access) continue;

                // Users with email_address are standard users
                if (access.email_address) {
                    users.push({
                        email: access.email_address,
                        role: this.reverseMapRole(access.access_role ?? 4),
                        status: "ACTIVE",
                        kind: "USER",
                    });
                } else if (access.user_id) {
                    // Email-only access entries (no Google account linked)
                    users.push({
                        email: `user-${access.user_id}`,
                        name: `Alleen toegang via e-mail (ID: ${access.user_id})`,
                        role: this.reverseMapRole(access.access_role ?? 4),
                        status: "ACTIVE",
                        kind: "USER",
                    });
                }
            }

            // 2. Query pending invitations
            try {
                const inviteRows = await customer.query(`
                    SELECT
                        customer_user_access_invitation.email_address,
                        customer_user_access_invitation.access_role,
                        customer_user_access_invitation.creation_date_time
                    FROM customer_user_access_invitation
                `);

                for (const row of inviteRows) {
                    const invite = row.customer_user_access_invitation;
                    if (!invite?.email_address) continue;
                    // Don't add if already in the active users list
                    if (users.some(u => u.email === invite.email_address)) continue;
                    users.push({
                        email: invite.email_address,
                        role: this.reverseMapRole(invite.access_role ?? 4),
                        status: "PENDING",
                        kind: "USER",
                    });
                }
            } catch (inviteErr: any) {
                // Invitation queries may fail on some account types — that's OK
                console.warn("[GoogleAds] Could not query invitations:", inviteErr.message);
            }

            // 3. Query MCC manager links
            try {
                const mccRows = await customer.query(`
                    SELECT
                        customer_manager_link.manager_customer,
                        customer_manager_link.status
                    FROM customer_manager_link
                `);

                for (const row of mccRows) {
                    const link = row.customer_manager_link;
                    if (!link?.manager_customer) continue;
                    // Extract manager ID from resource name (format: customers/1234567890)
                    const managerId = link.manager_customer.replace("customers/", "");
                    const formattedId = managerId.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3");
                    const statusMap: Record<string, string> = {
                        "2": "ACTIVE",
                        "3": "PENDING",
                        "4": "REFUSED",
                        "5": "CANCELLED",
                        ACTIVE: "ACTIVE",
                        PENDING: "PENDING",
                        REFUSED: "REFUSED",
                        CANCELLED: "CANCELLED",
                    };

                    // Try to fetch the manager's descriptive name
                    let managerName = `MCC Manager ${formattedId}`;
                    try {
                        const managerCustomer = client.Customer({
                            customer_id: managerId,
                            refresh_token: token,
                            login_customer_id: managerId,
                        });
                        const nameRows = await managerCustomer.query(`
                            SELECT customer.descriptive_name
                            FROM customer
                            LIMIT 1
                        `);
                        if (nameRows.length > 0 && nameRows[0].customer?.descriptive_name) {
                            managerName = nameRows[0].customer.descriptive_name;
                        }
                    } catch {
                        // Fallback to formatted ID if we can't access the manager account
                    }

                    users.push({
                        email: formattedId,
                        name: managerName,
                        role: "MANAGER",
                        status: statusMap[String(link.status)] || "ACTIVE",
                        kind: "MANAGER",
                    });
                }
            } catch (mccErr: any) {
                // MCC query may fail on non-managed accounts — that's OK
                console.warn("[GoogleAds] Could not query manager links:", mccErr.message);
            }
        } catch (err: any) {
            console.error("[GoogleAds] listUsers failed:", err);
            throw new Error(err?.errors?.[0]?.message || err?.message || "Fout bij ophalen van gebruikers");
        }

        return { users };
    }
}

// ─── Google Analytics Access Provider ────────────────────────────────
// Uses the GA4 Admin API to list users with property access.

async function refreshGoogleOAuthToken(refreshToken: string): Promise<string> {
    const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            refresh_token: refreshToken,
            client_id: process.env.GOOGLE_OAUTH_CLIENT_ID || "",
            client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || "",
            grant_type: "refresh_token",
        }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error_description || data.error);
    return data.access_token;
}

class GoogleAnalyticsAccessProvider implements AccessProvider {
    async inviteUser(params: { email: string; role: string; token: string; externalId: string }) {
        // GA4 Admin API: create access binding
        const accessToken = await refreshGoogleOAuthToken(params.token);
        const propertyId = params.externalId.replace("properties/", "");

        const roleMap: Record<string, string> = {
            ADMIN: "predefinedRoles/admin",
            EDITOR: "predefinedRoles/editor",
            ANALYST: "predefinedRoles/analyst",
            VIEWER: "predefinedRoles/viewer",
        };

        const res = await fetch(
            `https://analyticsadmin.googleapis.com/v1alpha/properties/${propertyId}/accessBindings`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    user: params.email,
                    roles: [roleMap[params.role] || "predefinedRoles/viewer"],
                }),
            }
        );

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error?.message || `GA4 invite failed: ${res.status}`);
        }

        return { success: true, message: `Uitnodiging verstuurd naar ${params.email} in Google Analytics` };
    }

    async removeUser(params: { email: string; token: string; externalId: string }) {
        const accessToken = await refreshGoogleOAuthToken(params.token);
        const propertyId = params.externalId.replace("properties/", "");

        // Search for the user's access binding at both property-level and account-level
        let bindingName: string | null = null;

        // 1. Check property-level bindings
        const propRes = await fetch(
            `https://analyticsadmin.googleapis.com/v1alpha/properties/${propertyId}/accessBindings`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (propRes.ok) {
            const propData = await propRes.json();
            const binding = (propData.accessBindings || []).find((b: any) => b.user === params.email);
            if (binding) bindingName = binding.name;
        }

        // 2. If not found at property level, check account-level bindings
        if (!bindingName) {
            const propMetaRes = await fetch(
                `https://analyticsadmin.googleapis.com/v1beta/properties/${propertyId}`,
                { headers: { Authorization: `Bearer ${accessToken}` } }
            );

            if (propMetaRes.ok) {
                const propMeta = await propMetaRes.json();
                const accountId = propMeta.account?.replace("accounts/", "") || propMeta.parent?.replace("accounts/", "");

                if (accountId) {
                    const acctRes = await fetch(
                        `https://analyticsadmin.googleapis.com/v1alpha/accounts/${accountId}/accessBindings`,
                        { headers: { Authorization: `Bearer ${accessToken}` } }
                    );

                    if (acctRes.ok) {
                        const acctData = await acctRes.json();
                        const binding = (acctData.accessBindings || []).find((b: any) => b.user === params.email);
                        if (binding) bindingName = binding.name;
                    }
                }
            }
        }

        if (!bindingName) {
            return { success: true, message: `${params.email} niet gevonden in Google Analytics` };
        }

        const deleteRes = await fetch(
            `https://analyticsadmin.googleapis.com/v1alpha/${bindingName}`,
            {
                method: "DELETE",
                headers: { Authorization: `Bearer ${accessToken}` },
            }
        );

        if (!deleteRes.ok) {
            const err = await deleteRes.json().catch(() => ({}));
            throw new Error(err.error?.message || `GA4 delete failed: ${deleteRes.status}`);
        }

        return { success: true, message: `Toegang verwijderd voor ${params.email} in Google Analytics` };
    }

    async listUsers(params: { token: string; externalId: string }) {
        const accessToken = await refreshGoogleOAuthToken(params.token);
        const propertyId = params.externalId.replace("properties/", "");

        const users: Array<{
            email: string;
            name?: string;
            role: string;
            status: string;
            kind: string;
        }> = [];

        const seenEmails = new Set<string>();

        const parseBindings = (bindings: any[], source: string) => {
            for (const binding of bindings) {
                if (!binding.user || seenEmails.has(binding.user)) continue;
                seenEmails.add(binding.user);

                const roles = (binding.roles || []) as string[];
                let role = "VIEWER";
                if (roles.some((r: string) => r.includes("admin"))) role = "ADMIN";
                else if (roles.some((r: string) => r.includes("editor"))) role = "EDITOR";
                else if (roles.some((r: string) => r.includes("analyst"))) role = "ANALYST";

                users.push({
                    email: binding.user,
                    name: binding.user.split("@")[0],
                    role,
                    status: "ACTIVE",
                    kind: "USER",
                });
            }
        };

        try {
            // 1. Fetch property-level access bindings
            const propUrl = `https://analyticsadmin.googleapis.com/v1alpha/properties/${propertyId}/accessBindings`;
            const propRes = await fetch(propUrl, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });

            if (propRes.ok) {
                const propData = await propRes.json();
                parseBindings(propData.accessBindings || [], "property");
            }

            // 2. Get the parent account ID from the property metadata
            const propMetaRes = await fetch(
                `https://analyticsadmin.googleapis.com/v1beta/properties/${propertyId}`,
                { headers: { Authorization: `Bearer ${accessToken}` } }
            );

            if (propMetaRes.ok) {
                const propMeta = await propMetaRes.json();
                const accountId = propMeta.account?.replace("accounts/", "") || propMeta.parent?.replace("accounts/", "");

                if (accountId) {
                    // 3. Fetch account-level access bindings
                    const acctUrl = `https://analyticsadmin.googleapis.com/v1alpha/accounts/${accountId}/accessBindings`;
                    const acctRes = await fetch(acctUrl, {
                        headers: { Authorization: `Bearer ${accessToken}` }
                    });

                    if (acctRes.ok) {
                        const acctData = await acctRes.json();
                        parseBindings(acctData.accessBindings || [], "account");
                    }
                }
            }
        } catch (err: any) {
            console.error("[GA4] listUsers failed:", err);
            throw err;
        }

        return { users };
    }
}

// ─── Google Business Profile Access Provider ────────────────────────
// Uses the My Business Account Management API to list users/admins.

class GoogleBusinessAccessProvider implements AccessProvider {
    async inviteUser(params: {
        email: string; role: string; token: string; externalId: string;
    }) {
        const accessToken = await refreshGoogleOAuthToken(params.token);
        const roleMap: Record<string, string> = {
            ADMIN: "OWNER", STANDARD: "MANAGER", READ_ONLY: "SITE_MANAGER",
        };
        const adminRole = roleMap[params.role] || "SITE_MANAGER";

        const res = await fetch(
            `https://mybusinessaccountmanagement.googleapis.com/v1/accounts/${params.externalId}/admins`,
            {
                method: "POST",
                headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
                body: JSON.stringify({ admin: params.email, adminRole }),
            }
        );

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error?.message || `GBP invite failed: ${res.status}`);
        }

        return { success: true, message: `Uitnodiging verstuurd voor Google Business Profile` };
    }

    async removeUser(params: {
        email: string; token: string; externalId: string;
    }) {
        const accessToken = await refreshGoogleOAuthToken(params.token);

        // First list admins to find the admin name (resource path)
        const listRes = await fetch(
            `https://mybusinessaccountmanagement.googleapis.com/v1/accounts/${params.externalId}/admins`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (!listRes.ok) {
            throw new Error(`Could not list GBP admins: ${listRes.status}`);
        }

        const listData = await listRes.json();
        const admins = listData.admins || [];
        const target = admins.find((a: any) => a.admin?.toLowerCase() === params.email.toLowerCase());

        if (!target) {
            return { success: true, message: "Gebruiker niet gevonden op het platform (al verwijderd)" };
        }

        const deleteRes = await fetch(
            `https://mybusinessaccountmanagement.googleapis.com/v1/${target.name}`,
            { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (!deleteRes.ok) {
            const err = await deleteRes.json().catch(() => ({}));
            throw new Error(err.error?.message || `GBP remove failed: ${deleteRes.status}`);
        }

        return { success: true, message: `Gebruiker verwijderd van Google Business Profile` };
    }

    async listUsers(params: { token: string; externalId: string }) {
        const accessToken = await refreshGoogleOAuthToken(params.token);
        const users: Array<{ email: string; name?: string; role: string; status: string; kind: string }> = [];

        const res = await fetch(
            `https://mybusinessaccountmanagement.googleapis.com/v1/accounts/${params.externalId}/admins`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (!res.ok) {
            const errText = await res.text().catch(() => "");
            throw new Error(`GBP listUsers failed (${res.status}): ${errText}`);
        }

        const data = await res.json();
        const admins = data.admins || [];
        for (const admin of admins) {
            const roleMap: Record<string, string> = {
                OWNER: "ADMIN", PRIMARY_OWNER: "ADMIN",
                MANAGER: "STANDARD", SITE_MANAGER: "READ_ONLY",
            };
            users.push({
                email: admin.admin || admin.account || "",
                name: admin.admin,
                role: roleMap[admin.role] || admin.role || "READ_ONLY",
                status: admin.pendingInvitation ? "PENDING" : "ACTIVE",
                kind: "USER",
            });
        }

        return { users };
    }
}

// ─── Google Tag Manager Access Provider ─────────────────────────────
// Uses the GTM v2 API to manage user permissions on accounts.

class GoogleTagManagerAccessProvider implements AccessProvider {
    async inviteUser(params: {
        email: string; role: string; token: string; externalId: string;
    }) {
        const accessToken = await refreshGoogleOAuthToken(params.token);
        const roleMap: Record<string, string> = {
            ADMIN: "admin", STANDARD: "publish", READ_ONLY: "read",
        };
        const accountAccess = { permission: roleMap[params.role] || "read" };

        const res = await fetch(
            `https://www.googleapis.com/tagmanager/v2/accounts/${params.externalId}/user_permissions`,
            {
                method: "POST",
                headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
                body: JSON.stringify({
                    emailAddress: params.email,
                    accountAccess,
                }),
            }
        );

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error?.message || `GTM invite failed: ${res.status}`);
        }

        return { success: true, message: `Gebruikersrechten ingesteld voor Google Tag Manager` };
    }

    async removeUser(params: {
        email: string; token: string; externalId: string;
    }) {
        const accessToken = await refreshGoogleOAuthToken(params.token);

        // First list permissions to find the user's permission path
        const listRes = await fetch(
            `https://www.googleapis.com/tagmanager/v2/accounts/${params.externalId}/user_permissions`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (!listRes.ok) {
            throw new Error(`Could not list GTM permissions: ${listRes.status}`);
        }

        const listData = await listRes.json();
        const permissions = listData.userPermission || [];
        const target = permissions.find((p: any) => p.emailAddress?.toLowerCase() === params.email.toLowerCase());

        if (!target) {
            return { success: true, message: "Gebruiker niet gevonden op het platform (al verwijderd)" };
        }

        const deleteRes = await fetch(
            `https://www.googleapis.com/tagmanager/v2/${target.path}`,
            { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (!deleteRes.ok) {
            const err = await deleteRes.json().catch(() => ({}));
            throw new Error(err.error?.message || `GTM remove failed: ${deleteRes.status}`);
        }

        return { success: true, message: `Gebruiker verwijderd van Google Tag Manager` };
    }

    async listUsers(params: { token: string; externalId: string }) {
        const accessToken = await refreshGoogleOAuthToken(params.token);
        const users: Array<{ email: string; name?: string; role: string; status: string; kind: string }> = [];

        const res = await fetch(
            `https://www.googleapis.com/tagmanager/v2/accounts/${params.externalId}/user_permissions`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (!res.ok) {
            const errText = await res.text().catch(() => "");
            throw new Error(`GTM listUsers failed (${res.status}): ${errText}`);
        }

        const data = await res.json();
        const permissions = data.userPermission || [];
        for (const perm of permissions) {
            const roleMap: Record<string, string> = {
                admin: "ADMIN", publish: "STANDARD",
                approve: "STANDARD", edit: "STANDARD", read: "READ_ONLY",
            };
            const accountPermission = perm.accountAccess?.permission || "read";
            users.push({
                email: perm.emailAddress || "",
                role: roleMap[accountPermission] || accountPermission,
                status: "ACTIVE",
                kind: "USER",
            });
        }

        return { users };
    }
}

// ─── Google Merchant Center Access Provider ─────────────────────────
// Uses Content API v2.1 to manage users on a Merchant Center account.

class GoogleMerchantAccessProvider implements AccessProvider {
    async inviteUser(params: {
        email: string; role: string; token: string; externalId: string;
    }) {
        const accessToken = await refreshGoogleOAuthToken(params.token);
        const isAdmin = params.role === "ADMIN";

        const res = await fetch(
            `https://shoppingcontent.googleapis.com/content/v2.1/${params.externalId}/accounts/${params.externalId}`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (!res.ok) {
            throw new Error(`Could not fetch Merchant account: ${res.status}`);
        }

        const accountData = await res.json();
        const existingUsers = accountData.users || [];

        // Add the new user
        existingUsers.push({
            emailAddress: params.email,
            admin: isAdmin,
        });

        const updateRes = await fetch(
            `https://shoppingcontent.googleapis.com/content/v2.1/${params.externalId}/accounts/${params.externalId}`,
            {
                method: "PUT",
                headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
                body: JSON.stringify({ ...accountData, users: existingUsers }),
            }
        );

        if (!updateRes.ok) {
            const err = await updateRes.json().catch(() => ({}));
            throw new Error(err.error?.message || `GMC invite failed: ${updateRes.status}`);
        }

        return { success: true, message: `Gebruiker toegevoegd aan Google Merchant Center` };
    }

    async removeUser(params: {
        email: string; token: string; externalId: string;
    }) {
        const accessToken = await refreshGoogleOAuthToken(params.token);

        const res = await fetch(
            `https://shoppingcontent.googleapis.com/content/v2.1/${params.externalId}/accounts/${params.externalId}`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (!res.ok) {
            throw new Error(`Could not fetch Merchant account: ${res.status}`);
        }

        const accountData = await res.json();
        const existingUsers = accountData.users || [];
        const filteredUsers = existingUsers.filter(
            (u: any) => u.emailAddress?.toLowerCase() !== params.email.toLowerCase()
        );

        if (filteredUsers.length === existingUsers.length) {
            return { success: true, message: "Gebruiker niet gevonden op het platform (al verwijderd)" };
        }

        const updateRes = await fetch(
            `https://shoppingcontent.googleapis.com/content/v2.1/${params.externalId}/accounts/${params.externalId}`,
            {
                method: "PUT",
                headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
                body: JSON.stringify({ ...accountData, users: filteredUsers }),
            }
        );

        if (!updateRes.ok) {
            const err = await updateRes.json().catch(() => ({}));
            throw new Error(err.error?.message || `GMC remove failed: ${updateRes.status}`);
        }

        return { success: true, message: `Gebruiker verwijderd van Google Merchant Center` };
    }

    async listUsers(params: { token: string; externalId: string }) {
        const accessToken = await refreshGoogleOAuthToken(params.token);
        const users: Array<{ email: string; name?: string; role: string; status: string; kind: string }> = [];

        const res = await fetch(
            `https://shoppingcontent.googleapis.com/content/v2.1/${params.externalId}/accounts/${params.externalId}`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (!res.ok) {
            const errText = await res.text().catch(() => "");
            throw new Error(`GMC listUsers failed (${res.status}): ${errText}`);
        }

        const accountData = await res.json();
        const accountUsers = accountData.users || [];
        for (const u of accountUsers) {
            users.push({
                email: u.emailAddress || "",
                role: u.admin ? "ADMIN" : "STANDARD",
                status: "ACTIVE",
                kind: "USER",
            });
        }

        return { users };
    }
}

// ─── Factory ─────────────────────────────────────────────────────────

const providers: Record<string, AccessProvider> = {
    GOOGLE_ADS: new GoogleAdsAccessProvider(),
    GOOGLE_ANALYTICS: new GoogleAnalyticsAccessProvider(),
    GOOGLE_BUSINESS: new GoogleBusinessAccessProvider(),
    GOOGLE_TAG_MANAGER: new GoogleTagManagerAccessProvider(),
    GOOGLE_MERCHANT: new GoogleMerchantAccessProvider(),
};

/**
 * Returns the access provider for a given data source type.
 * Returns null if no provider is available (e.g. DOMAIN type).
 */
export function getAccessProvider(type: string): AccessProvider | null {
    return providers[type] || null;
}
