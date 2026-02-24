export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const clientId = searchParams.get("state");
    if (!code || !clientId) return NextResponse.json({ error: "Missing code or state" }, { status: 400 });

    const origin = new URL(req.url).origin;

    try {
        const redirectUri = `${origin}/api/auth/google-business/callback`;
        const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                code, client_id: process.env.GOOGLE_OAUTH_CLIENT_ID || "",
                client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || "",
                redirect_uri: redirectUri, grant_type: "authorization_code",
            }),
        });
        const tokenData = await tokenResponse.json();
        if (tokenData.error) throw new Error(tokenData.error_description || tokenData.error);
        const refreshToken = tokenData.refresh_token;
        if (!refreshToken) return NextResponse.redirect(`${origin}/dashboard/projects/${clientId}/data/sources?error=NoRefreshToken`);

        // Fetch business accounts
        const accessToken = tokenData.access_token;
        const accountsRes = await fetch("https://mybusinessaccountmanagement.googleapis.com/v1/accounts", {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        const accountsData = await accountsRes.json();
        console.log("[GBP] Accounts response:", JSON.stringify(accountsData));
        const accounts = accountsData.accounts || [];

        if (accounts.length === 0) {
            // No accounts found — create pending source for visibility
            await prisma.dataSource.create({
                data: {
                    clientId, type: "GOOGLE_BUSINESS", category: "APP",
                    externalId: "PENDING",
                    name: "Google Business Profile (geen accounts gevonden)",
                    token: refreshToken, active: false,
                },
            });
            return NextResponse.redirect(`${origin}/dashboard/projects/${clientId}/data/sources?error=NoBusinessAccounts`);
        }

        if (accounts.length === 1) {
            // Single account — auto-link
            const account = accounts[0];
            const accountName = account.accountName || account.name || "Google Business Profile";
            const accountId = account.name?.split("/").pop() || "default";

            // Skip if already linked
            const existing = await prisma.dataSource.findFirst({
                where: { clientId, type: "GOOGLE_BUSINESS", externalId: accountId },
            });

            if (!existing) {
                await prisma.dataSource.create({
                    data: {
                        clientId, type: "GOOGLE_BUSINESS", category: "APP",
                        externalId: accountId,
                        name: accountName,
                        token: refreshToken, active: true,
                    },
                });
            }
            return NextResponse.redirect(`${origin}/dashboard/projects/${clientId}/data/sources`);
        }

        // Multiple accounts — create pending source with account list and redirect to picker
        const pendingSource = await prisma.dataSource.create({
            data: {
                clientId, type: "GOOGLE_BUSINESS", category: "APP",
                externalId: "PENDING",
                name: "Pending Google Business Profile Link",
                token: refreshToken, active: false,
                config: {
                    accounts: accounts.map((a: any) => ({
                        id: a.name?.split("/").pop() || "unknown",
                        name: a.accountName || a.name || "Business Profile",
                        type: a.type || "PERSONAL",
                    })),
                },
            },
        });

        return NextResponse.redirect(`${origin}/dashboard/projects/${clientId}/link-business?sourceId=${pendingSource.id}`);
    } catch (error: any) {
        console.error("Google Business OAuth Error:", error);
        return NextResponse.redirect(`${origin}/dashboard/projects/${clientId}/data/sources?error=BusinessLinkFailed`);
    }
}
