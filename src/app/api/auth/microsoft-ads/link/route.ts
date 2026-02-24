export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");
    if (!clientId) return NextResponse.json({ error: "Missing clientId" }, { status: 400 });

    if (!process.env.MICROSOFT_ADS_CLIENT_ID) {
        return NextResponse.json({ error: "Microsoft Ads credentials not configured" }, { status: 500 });
    }

    const origin = new URL(req.url).origin;
    const redirectUri = `${origin}/api/auth/microsoft-ads/callback`;

    const scopes = ["https://ads.microsoft.com/msads.manage", "offline_access"].join(" ");

    const qs = new URLSearchParams({
        client_id: process.env.MICROSOFT_ADS_CLIENT_ID,
        response_type: "code",
        redirect_uri: redirectUri,
        scope: scopes,
        state: clientId,
    });

    return NextResponse.redirect(`https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${qs.toString()}`);
}
