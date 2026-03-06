export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { decodeOAuthState } from "@/lib/oauth-state";
import { encrypt } from "@/lib/encryption";
import { syncScheduler } from "@/lib/data-integration/sync-scheduler";

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const rawState = searchParams.get("state") || "";
    const projectId = decodeOAuthState(rawState);
    const error = searchParams.get("error");

    const origin = process.env.NEXTAUTH_URL || new URL(req.url).origin;

    if (error || !code || !projectId) {
        const redirectPath = projectId
            ? `/projects/${projectId}/data/sources?error=${error === "access_denied" ? "Koppeling geannuleerd" : "MSAdsLinkFailed"}`
            : "/";
        return NextResponse.redirect(`${origin}${redirectPath}`);
    }

    try {
        const redirectUri = `${origin}/api/auth/microsoft-ads/callback`;

        // Exchange authorization code for tokens
        const tokenRes = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                project_id: process.env.MICROSOFT_ADS_CLIENT_ID || "",
                client_secret: process.env.MICROSOFT_ADS_CLIENT_SECRET || "",
                grant_type: "authorization_code",
                code,
                redirect_uri: redirectUri,
            }),
        });
        const tokenData = await tokenRes.json();
        if (tokenData.error) throw new Error(tokenData.error_description || tokenData.error);

        const refreshToken = tokenData.refresh_token;
        const accessToken = tokenData.access_token;

        if (!refreshToken) {
            throw new Error("No refresh token received. Make sure offline_access scope is included.");
        }

        // Find or create the microsoft-ads connector definition
        let connector = await prisma.connectorDefinition.findUnique({
            where: { slug: "microsoft-ads" },
        });
        if (!connector) {
            connector = await prisma.connectorDefinition.create({
                data: {
                    slug: "microsoft-ads",
                    name: "Microsoft Ads",
                    category: "PAID_SEARCH",
                    authType: "oauth2",
                },
            });
            console.log(`[MSAds] Created ConnectorDefinition: ${connector.id}`);
        }

        // Discover accounts via Customer Management API
        const developerToken = process.env.MICROSOFT_ADS_DEVELOPER_TOKEN || "";

        let accountName = "Microsoft Ads";
        let customerId = "";
        const discoveredAccounts: { id: string; name: string; number: string }[] = [];

        try {
            // Step 1: Get the user info to find customer IDs
            const userRes = await fetch("https://clientcenter.api.bingads.microsoft.com/CustomerManagement/v13/User/GetUser", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${accessToken}`,
                    "DeveloperToken": developerToken,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ UserId: null }),
            });
            const userData = await userRes.json();
            console.log("[MSAds] User data:", JSON.stringify(userData).substring(0, 500));

            // Step 2: Search for accounts the user has access to
            const accountsRes = await fetch("https://clientcenter.api.bingads.microsoft.com/CustomerManagement/v13/Accounts/SearchAccounts", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${accessToken}`,
                    "DeveloperToken": developerToken,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    Predicates: [
                        { Field: "UserId", Operator: "Equals", Value: userData?.User?.Id ? String(userData.User.Id) : "0" },
                    ],
                    Ordering: null,
                    PageInfo: { Index: 0, Size: 100 },
                }),
            });
            const accountsData = await accountsRes.json();
            console.log("[MSAds] Accounts search result:", JSON.stringify(accountsData).substring(0, 500));

            const accounts = accountsData?.Accounts || [];
            if (accounts.length > 0) {
                customerId = String(accounts[0].ParentCustomerId || "");
                accountName = accounts[0].Name || "Microsoft Ads";

                for (const acc of accounts) {
                    discoveredAccounts.push({
                        id: String(acc.Id),
                        name: acc.Name || acc.Number || String(acc.Id),
                        number: acc.Number || "",
                    });
                }
                console.log(`[MSAds] Found ${discoveredAccounts.length} ad accounts`);
            }
        } catch (discoveryErr) {
            console.error("[MSAds] Account discovery error (non-fatal):", discoveryErr);
            // Non-fatal: we can still create the data source
        }

        // Create the data source with proper connector linkage
        const newSource = await prisma.dataSource.create({
            data: {
                projectId,
                type: "MICROSOFT_ADS",
                category: "APP",
                externalId: customerId || "microsoft-ads",
                name: accountName,
                token: encrypt(JSON.stringify({
                    refreshToken,
                    developerToken,
                    customerId,
                })),
                active: true,
                connectorId: connector.id,
            },
        });
        console.log(`[MSAds] Created DataSource ${newSource.id} with connectorId ${connector.id}`);

        // Create DataSourceAccount records for each discovered account
        for (const acc of discoveredAccounts) {
            await prisma.dataSourceAccount.create({
                data: {
                    dataSourceId: newSource.id,
                    externalId: acc.id,
                    name: acc.name,
                },
            });
            console.log(`[MSAds] Created sync account: ${acc.name} (${acc.id})`);
        }

        // Auto-trigger first sync in background
        syncScheduler.scheduleNow(newSource.id).catch(err =>
            console.error(`[AutoSync] Failed to schedule sync for Microsoft Ads source ${newSource.id}:`, err)
        );

        return NextResponse.redirect(`${origin}/projects/${projectId}/data/sources`);
    } catch (error: any) {
        console.error("Microsoft Ads OAuth Error:", error);
        return NextResponse.redirect(`${origin}/projects/${projectId}/data/sources?error=MSAdsLinkFailed`);
    }
}
