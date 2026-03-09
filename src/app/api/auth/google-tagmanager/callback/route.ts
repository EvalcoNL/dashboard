export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { decodeOAuthState } from "@/lib/oauth-state";
import { encrypt } from "@/lib/encryption";

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
            ? `/projects/${projectId}/data/sources?error=${error === "access_denied" ? "Koppeling geannuleerd" : "GTMLinkFailed"}`
            : "/";
        return NextResponse.redirect(`${origin}${redirectPath}`);
    }

    try {
        const redirectUri = `${origin}/api/auth/google-tagmanager/callback`;
        const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                code, project_id: process.env.GOOGLE_OAUTH_CLIENT_ID || "",
                client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || "",
                redirect_uri: redirectUri, grant_type: "authorization_code",
            }),
        });
        const tokenData = await tokenResponse.json();
        if (tokenData.error) throw new Error(tokenData.error_description || tokenData.error);
        const refreshToken = tokenData.refresh_token;
        if (!refreshToken) return NextResponse.redirect(`${origin}/projects/${projectId}/data/sources?error=NoRefreshToken`);

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
                    projectId, type: "GOOGLE_TAG_MANAGER", category: "APP",
                    externalId: "PENDING", name: "Google Tag Manager (geen accounts gevonden)",
                    token: encrypt(refreshToken), active: false,
                },
            });
            return NextResponse.redirect(`${origin}/projects/${projectId}/data/sources?error=NoGTMAccounts`);
        }

        if (accounts.length === 1) {
            // Auto-link if single account
            const containers = await fetchContainers(accessToken, accounts[0].path);
            const containerName = containers.length > 0 ? containers[0].name : accounts[0].name;

            await prisma.dataSource.create({
                data: {
                    projectId, type: "GOOGLE_TAG_MANAGER", category: "APP",
                    externalId: accounts[0].accountId,
                    name: containerName || accounts[0].name || "Google Tag Manager",
                    token: encrypt(refreshToken), active: true,
                    config: { containers: containers.map((c: any) => ({ id: c.containerId, name: c.name })) },
                },
            });
            return NextResponse.redirect(`${origin}/projects/${projectId}/data/sources`);
        }

        // Multiple accounts — create pending source with account list and redirect to picker
        const pendingSource = await prisma.dataSource.create({
            data: {
                projectId, type: "GOOGLE_TAG_MANAGER", category: "APP",
                externalId: "PENDING", name: "Pending Google Tag Manager Link",
                token: encrypt(refreshToken), active: false,
                config: { accounts: accounts.map((a: any) => ({ id: a.accountId, name: a.name, path: a.path })) },
            },
        });
        return NextResponse.redirect(`${origin}/projects/${projectId}/link-gtm?sourceId=${pendingSource.id}`);
    } catch (error: unknown) {
        console.error("GTM OAuth Error:", error);
        return NextResponse.redirect(`${origin}/projects/${projectId}/data/sources?error=GTMLinkFailed&message=${encodeURIComponent(error instanceof Error ? error.message : "Onbekende fout")}`);
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
