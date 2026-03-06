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

    if (!process.env.META_APP_ID) {
        return NextResponse.json({ error: "Meta App credentials not configured" }, { status: 500 });
    }

    const origin = process.env.NEXTAUTH_URL || new URL(req.url).origin;
    const redirectUri = `${origin}/api/auth/meta/callback`;

    const scopes = [
        "business_management",
        "ads_read",
        "ads_management",
        "pages_show_list",
        "pages_read_engagement",
        "pages_manage_metadata",
        "catalog_management",
    ].join(",");

    const qs = new URLSearchParams({
        project_id: process.env.META_APP_ID,
        redirect_uri: redirectUri,
        scope: scopes,
        response_type: "code",
        state: encodeOAuthState(projectId),
    });

    return NextResponse.redirect(`https://www.facebook.com/v19.0/dialog/oauth?${qs.toString()}`);
}
