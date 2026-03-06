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

    if (!process.env.MICROSOFT_ADS_CLIENT_ID) {
        return NextResponse.json({ error: "Microsoft Ads credentials not configured" }, { status: 500 });
    }

    const origin = process.env.NEXTAUTH_URL || new URL(req.url).origin;
    const redirectUri = `${origin}/api/auth/microsoft-ads/callback`;

    const scopes = ["https://ads.microsoft.com/msads.manage", "offline_access"].join(" ");

    const qs = new URLSearchParams({
        project_id: process.env.MICROSOFT_ADS_CLIENT_ID,
        response_type: "code",
        redirect_uri: redirectUri,
        scope: scopes,
        state: encodeOAuthState(projectId),
    });

    return NextResponse.redirect(`https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${qs.toString()}`);
}
