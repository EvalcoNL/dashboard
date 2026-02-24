export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");
    if (!clientId) return NextResponse.json({ error: "Missing clientId" }, { status: 400 });

    if (!process.env.META_APP_ID) {
        return NextResponse.json({ error: "Meta App credentials not configured" }, { status: 500 });
    }

    const origin = new URL(req.url).origin;
    const redirectUri = `${origin}/api/auth/meta/callback`;

    const scopes = [
        "business_management",
        "ads_read",
        "pages_show_list",
        "read_insights",
    ].join(",");

    const qs = new URLSearchParams({
        client_id: process.env.META_APP_ID,
        redirect_uri: redirectUri,
        scope: scopes,
        response_type: "code",
        state: clientId,
    });

    return NextResponse.redirect(`https://www.facebook.com/v19.0/dialog/oauth?${qs.toString()}`);
}
