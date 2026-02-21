export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { googleAdsService } from "@/lib/google-ads";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");

    if (!clientId) {
        return NextResponse.json({ error: "Missing clientId parameter" }, { status: 400 });
    }

    if (!process.env.GOOGLE_ADS_CLIENT_ID || !process.env.GOOGLE_ADS_CLIENT_SECRET) {
        return NextResponse.json({
            error: "Google Ads API credentials are not configured in .env"
        }, { status: 500 });
    }

    // Dynamically determine the redirect URI based on the current origin
    const origin = new URL(req.url).origin;
    const redirectUri = `${origin}/api/auth/google-ads/callback`;

    console.log(`[OAuth] Initiating link with redirect_uri: ${redirectUri}`);

    const authUrl = await googleAdsService.getAuthUrl(redirectUri);

    // Append state to the authUrl
    const urlWithState = new URL(authUrl);
    urlWithState.searchParams.set("state", clientId);

    return NextResponse.redirect(urlWithState.toString());
}
