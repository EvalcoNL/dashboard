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
        const redirectUri = `${origin}/api/auth/google-tagmanager/callback`;
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

        // fetch GTM accounts
        const accessToken = tokenData.access_token;
        const accountsRes = await fetch("https://www.googleapis.com/tagmanager/v2/accounts", {
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!accountsRes.ok) {
            const errData = await accountsRes.json().catch(() => ({}));
            console.error("GTM accounts API error:", errData);
            throw new Error(errData?.error?.message || `GTM API returned ${accountsRes.status}`);
        }

        const accountsData = await accountsRes.json();
        const accounts = accountsData.account || [];

        if (accounts.length === 0) {
            // No accounts found — still create a pending source so user sees it
            await prisma.dataSource.create({
                data: {
                    clientId, type: "GOOGLE_TAG_MANAGER", category: "APP",
                    externalId: "PENDING", name: "Google Tag Manager (geen accounts gevonden)",
                    token: refreshToken, active: false,
                },
            });
            return NextResponse.redirect(`${origin}/dashboard/projects/${clientId}/data/sources?error=NoGTMAccounts`);
        }

        if (accounts.length === 1) {
            // Auto-link if single account
            const containers = await fetchContainers(accessToken, accounts[0].path);
            const containerName = containers.length > 0 ? containers[0].name : accounts[0].name;

            await prisma.dataSource.create({
                data: {
                    clientId, type: "GOOGLE_TAG_MANAGER", category: "APP",
                    externalId: accounts[0].accountId,
                    name: containerName || accounts[0].name || "Google Tag Manager",
                    token: refreshToken, active: true,
                    config: { containers: containers.map((c: any) => ({ id: c.containerId, name: c.name })) },
                },
            });
            return NextResponse.redirect(`${origin}/dashboard/projects/${clientId}/data/sources`);
        }

        // Multiple accounts — create pending source with account list and redirect to picker
        const pendingSource = await prisma.dataSource.create({
            data: {
                clientId, type: "GOOGLE_TAG_MANAGER", category: "APP",
                externalId: "PENDING", name: "Pending Google Tag Manager Link",
                token: refreshToken, active: false,
                config: { accounts: accounts.map((a: any) => ({ id: a.accountId, name: a.name, path: a.path })) },
            },
        });
        return NextResponse.redirect(`${origin}/dashboard/projects/${clientId}/link-gtm?sourceId=${pendingSource.id}`);
    } catch (error: any) {
        console.error("GTM OAuth Error:", error);
        return NextResponse.redirect(`${origin}/dashboard/projects/${clientId}/data/sources?error=GTMLinkFailed&message=${encodeURIComponent(error.message || "")}`);
    }
}

async function fetchContainers(accessToken: string, accountPath: string) {
    try {
        const res = await fetch(`https://www.googleapis.com/tagmanager/v2/${accountPath}/containers`, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) return [];
        const data = await res.json();
        return data.container || [];
    } catch {
        return [];
    }
}
