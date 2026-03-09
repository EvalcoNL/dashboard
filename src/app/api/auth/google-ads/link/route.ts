export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { googleAdsService } from "@/lib/integrations/google-ads";
import { auth } from "@/lib/auth";
import { encodeOAuthState } from "@/lib/oauth-state";

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
        return NextResponse.json({ error: "Missing projectId parameter" }, { status: 400 });
    }

    if (!process.env.GOOGLE_ADS_CLIENT_ID || !process.env.GOOGLE_ADS_CLIENT_SECRET) {
        return NextResponse.json({
            error: "Google Ads API credentials are not configured in .env"
        }, { status: 500 });
    }

    // Dynamically determine the redirect URI based on the current origin
    const origin = process.env.NEXTAUTH_URL || new URL(req.url).origin;
    const redirectUri = `${origin}/api/auth/google-ads/callback`;


    const authUrl = await googleAdsService.getAuthUrl(redirectUri);

    // Append CSRF-protected state to the authUrl
    const urlWithState = new URL(authUrl);
    urlWithState.searchParams.set("state", encodeOAuthState(projectId));

    return NextResponse.redirect(urlWithState.toString());
}
