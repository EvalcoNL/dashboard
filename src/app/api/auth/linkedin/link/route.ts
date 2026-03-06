export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { encodeOAuthState } from "@/lib/oauth-state";

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    if (!projectId) return NextResponse.json({ error: "Missing projectId" }, { status: 400 });

    if (!process.env.LINKEDIN_CLIENT_ID) {
        return NextResponse.json({ error: "LinkedIn credentials not configured" }, { status: 500 });
    }

    const origin = process.env.NEXTAUTH_URL || new URL(req.url).origin;
    const redirectUri = `${origin}/api/auth/linkedin/callback`;

    const scopes = ["openid", "profile", "r_ads", "r_ads_reporting", "r_organization_social"].join(" ");

    const qs = new URLSearchParams({
        response_type: "code",
        project_id: process.env.LINKEDIN_CLIENT_ID,
        redirect_uri: redirectUri,
        scope: scopes,
        state: encodeOAuthState(projectId),
    });

    return NextResponse.redirect(`https://www.linkedin.com/oauth/v2/authorization?${qs.toString()}`);
}
