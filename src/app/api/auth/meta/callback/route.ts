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
            ? `/projects/${projectId}/data/sources?error=${error === "access_denied" ? "Koppeling geannuleerd" : "MetaLinkFailed"}`
            : "/";
        return NextResponse.redirect(`${origin}${redirectPath}`);
    }

    try {
        const redirectUri = `${origin}/api/auth/meta/callback`;

        // Exchange code for access token
        const tokenRes = await fetch(
            `https://graph.facebook.com/v19.0/oauth/access_token?` +
            new URLSearchParams({
                project_id: process.env.META_APP_ID || "",
                client_secret: process.env.META_APP_SECRET || "",
                redirect_uri: redirectUri,
                code,
            })
        );
        const tokenData = await tokenRes.json();
        if (tokenData.error) throw new Error(tokenData.error.message || tokenData.error);

        // Exchange for long-lived token
        const longLivedRes = await fetch(
            `https://graph.facebook.com/v19.0/oauth/access_token?` +
            new URLSearchParams({
                grant_type: "fb_exchange_token",
                project_id: process.env.META_APP_ID || "",
                client_secret: process.env.META_APP_SECRET || "",
                fb_exchange_token: tokenData.access_token,
            })
        );
        const longLivedData = await longLivedRes.json();
        const accessToken = longLivedData.access_token || tokenData.access_token;

        // Fetch business accounts
        const bizRes = await fetch(
            "https://graph.facebook.com/v19.0/me/businesses?fields=id,name&limit=50",
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const bizData = await bizRes.json();
        // Debug info removed for production

        const businesses = bizData.data || [];

        if (businesses.length === 0) {
            // No businesses found at all
            await prisma.dataSource.create({
                data: {
                    projectId, type: "META", category: "APP",
                    externalId: "PENDING",
                    name: "Meta Business (geen accounts gevonden)",
                    token: encrypt(accessToken), active: false,
                },
            });
            return NextResponse.redirect(`${origin}/projects/${projectId}/data/sources?error=NoBusinessAccounts`);
        }

        // Find the best business: prefer the one with the most business_users (= portfolio)
        let bestBiz = businesses[0];
        let bestCount = 0;

        if (businesses.length > 1) {
            for (const biz of businesses) {
                try {
                    const usersRes = await fetch(
                        `https://graph.facebook.com/v19.0/${biz.id}/business_users?fields=id&limit=1&summary=true`,
                        { headers: { Authorization: `Bearer ${accessToken}` } }
                    );
                    const usersData = await usersRes.json();
                    const count = usersData.summary?.total_count || usersData.data?.length || 0;
                    // Debug: count users per business
                    if (count > bestCount) {
                        bestCount = count;
                        bestBiz = biz;
                    }
                } catch {
                    // Skip on error
                }
            }
            // Selected best business by user count
        }

        // Find or create the meta-ads connector definition
        let connector = await prisma.connectorDefinition.findUnique({
            where: { slug: "meta-ads" },
        });
        if (!connector) {
            connector = await prisma.connectorDefinition.create({
                data: {
                    slug: "meta-ads",
                    name: "Meta Ads",
                    category: "PAID_SOCIAL",
                    authType: "oauth2",
                },
            });
            // ConnectorDefinition created
        }

        const newSource = await prisma.dataSource.create({
            data: {
                projectId, type: "META", category: "APP",
                externalId: bestBiz.id,
                name: bestBiz.name || "Meta Business Suite",
                token: encrypt(JSON.stringify({ accessToken })),
                active: true,
                connectorId: connector.id,
            },
        });
        // DataSource created with connector linked

        // Fetch ad accounts owned by this business portfolio
        try {
            const adAccountsRes = await fetch(
                `https://graph.facebook.com/v19.0/${bestBiz.id}/owned_ad_accounts?fields=account_id,name,currency,timezone_name&limit=100`,
                { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            const adData = await adAccountsRes.json();
            const adAccounts = adData.data || [];
            // Found ad accounts for business

            for (const acc of adAccounts) {
                await prisma.dataSourceAccount.create({
                    data: {
                        dataSourceId: newSource.id,
                        externalId: acc.account_id,
                        name: acc.name || acc.account_id,
                        currency: acc.currency || "EUR",
                        timezone: acc.timezone_name || "Europe/Amsterdam",
                    },
                });
                // Sync account created
            }
        } catch (adErr) {
            console.error("[Meta] Failed to fetch ad accounts:", adErr);
            // Non-fatal: data source is still created, ad accounts can be added later
        }

        // Auto-trigger first sync in background
        syncScheduler.scheduleNow(newSource.id).catch(err =>
            console.error(`[AutoSync] Failed to schedule sync for Meta source ${newSource.id}:`, err)
        );

        return NextResponse.redirect(`${origin}/projects/${projectId}/data/sources`);
    } catch (error: unknown) {
        console.error("Meta OAuth Error:", error);
        return NextResponse.redirect(`${origin}/projects/${projectId}/data/sources?error=MetaLinkFailed`);
    }
}
