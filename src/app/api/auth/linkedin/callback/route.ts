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
            ? `/projects/${projectId}/data/sources?error=${error === "access_denied" ? "Koppeling geannuleerd" : "LinkedInLinkFailed"}`
            : "/";
        return NextResponse.redirect(`${origin}${redirectPath}`);
    }

    try {
        const redirectUri = `${origin}/api/auth/linkedin/callback`;

        // Exchange authorization code for tokens
        const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                grant_type: "authorization_code",
                code,
                project_id: process.env.LINKEDIN_CLIENT_ID || "",
                client_secret: process.env.LINKEDIN_CLIENT_SECRET || "",
                redirect_uri: redirectUri,
            }),
        });
        const tokenData = await tokenRes.json();
        if (tokenData.error) throw new Error(tokenData.error_description || tokenData.error);

        const accessToken = tokenData.access_token;
        const refreshToken = tokenData.refresh_token;

        // Fetch user profile info
        let profileName = "LinkedIn";
        try {
            const profileRes = await fetch("https://api.linkedin.com/v2/userinfo", {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            const profile = await profileRes.json();
            profileName = profile.name || `${profile.given_name || ""} ${profile.family_name || ""}`.trim() || "LinkedIn";
            console.log(`[LinkedIn] Authenticated as: ${profileName}`);
        } catch (profileErr) {
            console.error("[LinkedIn] Failed to fetch profile (non-fatal):", profileErr);
        }

        // Find or create the linkedin-ads connector definition
        let connector = await prisma.connectorDefinition.findUnique({
            where: { slug: "linkedin-ads" },
        });
        if (!connector) {
            connector = await prisma.connectorDefinition.create({
                data: {
                    slug: "linkedin-ads",
                    name: "LinkedIn Ads",
                    category: "PAID_SOCIAL",
                    authType: "oauth2",
                },
            });
            console.log(`[LinkedIn] Created ConnectorDefinition: ${connector.id}`);
        }

        // Discover ad accounts
        const discoveredAccounts: { id: string; name: string; currency: string }[] = [];

        try {
            const accountsRes = await fetch(
                "https://api.linkedin.com/rest/adAccounts?q=search&search=(status:(values:List(ACTIVE)))&count=100",
                {
                    headers: {
                        "Authorization": `Bearer ${accessToken}`,
                        "LinkedIn-Version": "202401",
                        "X-Restli-Protocol-Version": "2.0.0",
                    },
                }
            );
            const accountsData = await accountsRes.json();
            const accounts = accountsData.elements || [];
            console.log(`[LinkedIn] Found ${accounts.length} active ad accounts`);

            for (const acc of accounts) {
                discoveredAccounts.push({
                    id: String(acc.id),
                    name: acc.name || String(acc.id),
                    currency: acc.currency || "EUR",
                });
            }
        } catch (discoveryErr) {
            console.error("[LinkedIn] Account discovery error (non-fatal):", discoveryErr);
        }

        // Create the data source with proper connector linkage
        const newSource = await prisma.dataSource.create({
            data: {
                projectId,
                type: "LINKEDIN",
                category: "APP",
                externalId: discoveredAccounts.length > 0 ? discoveredAccounts[0].id : "linkedin",
                name: `LinkedIn Ads - ${profileName}`,
                token: encrypt(JSON.stringify({
                    accessToken,
                    refreshToken: refreshToken || undefined,
                })),
                active: true,
                connectorId: connector.id,
            },
        });
        console.log(`[LinkedIn] Created DataSource ${newSource.id} with connectorId ${connector.id}`);

        // Create DataSourceAccount records for each discovered account
        for (const acc of discoveredAccounts) {
            await prisma.dataSourceAccount.create({
                data: {
                    dataSourceId: newSource.id,
                    externalId: acc.id,
                    name: acc.name,
                    currency: acc.currency,
                },
            });
            console.log(`[LinkedIn] Created sync account: ${acc.name} (${acc.id})`);
        }

        // Auto-trigger first sync in background
        syncScheduler.scheduleNow(newSource.id).catch(err =>
            console.error(`[AutoSync] Failed to schedule sync for LinkedIn source ${newSource.id}:`, err)
        );

        return NextResponse.redirect(`${origin}/projects/${projectId}/data/sources`);
    } catch (error: unknown) {
        console.error("LinkedIn OAuth Error:", error);
        return NextResponse.redirect(`${origin}/projects/${projectId}/data/sources?error=LinkedInLinkFailed`);
    }
}
