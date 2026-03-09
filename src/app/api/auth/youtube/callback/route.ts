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
            ? `/projects/${projectId}/data/sources?error=${error === "access_denied" ? "Koppeling geannuleerd" : "YouTubeLinkFailed"}`
            : "/";
        return NextResponse.redirect(`${origin}${redirectPath}`);
    }

    try {
        const redirectUri = `${origin}/api/auth/youtube/callback`;
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

        // Fetch YouTube channel
        const accessToken = tokenData.access_token;
        const channelRes = await fetch(
            "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const channelData = await channelRes.json();
        const channel = channelData.items?.[0];
        const channelName = channel?.snippet?.title || "YouTube Studio";
        const channelId = channel?.id || "default";

        await prisma.dataSource.create({
            data: {
                projectId, type: "YOUTUBE", category: "APP",
                externalId: channelId, name: channelName,
                token: encrypt(refreshToken), active: true,
            },
        });

        return NextResponse.redirect(`${origin}/projects/${projectId}/data/sources`);
    } catch (error: unknown) {
        console.error("YouTube OAuth Error:", error);
        return NextResponse.redirect(`${origin}/projects/${projectId}/data/sources?error=YouTubeLinkFailed`);
    }
}
