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
    const projectId = decodeOAuthState(rawState); // projectId passed in state
    const error = searchParams.get("error");
    const origin = process.env.NEXTAUTH_URL || new URL(req.url).origin;

    if (error || !code || !projectId) {
        const redirectPath = projectId
            ? `/projects/${projectId}/data/sources?error=${error === "access_denied" ? "Koppeling geannuleerd" : "AnalyticsLinkFailed"}`
            : "/";
        return NextResponse.redirect(`${origin}${redirectPath}`);
    }

    try {
        const origin = process.env.NEXTAUTH_URL || new URL(req.url).origin;
        const redirectUri = `${origin}/api/auth/google-analytics/callback`;

        // Exchange code for tokens
        const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                code,
                project_id: process.env.GOOGLE_OAUTH_CLIENT_ID || "",
                client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || "",
                redirect_uri: redirectUri,
                grant_type: "authorization_code",
            }),
        });

        const tokenData = await tokenResponse.json();
        if (tokenData.error) throw new Error(tokenData.error_description || tokenData.error);

        const refreshToken = tokenData.refresh_token;

        if (!refreshToken) {
            // Usually happens if the user has already granted access. Need prompt=consent in link route to force it.
            return NextResponse.redirect(`${origin}/projects/${projectId}/data/sources?error=NoRefreshToken`);
        }

        // Create pending data source
        const pendingSource = await prisma.dataSource.create({
            data: {
                projectId: projectId,
                type: "GOOGLE_ANALYTICS",
                category: "APP",
                externalId: "PENDING",
                token: encrypt(refreshToken), // Store encrypted refresh token for GA
                active: false,
                name: "Pending Google Analytics Link"
            }
        });

        // Redirect to selection UI
        return NextResponse.redirect(`${origin}/projects/${projectId}/link-analytics?sourceId=${pendingSource.id}`);
    } catch (error: any) {
        console.error("Google Analytics OAuth Callback Error:", error);
        return NextResponse.redirect(`${origin}/projects/${projectId}/data/sources?error=AnalyticsLinkFailed`);
    }
}
