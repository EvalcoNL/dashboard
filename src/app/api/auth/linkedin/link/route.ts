export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");
    if (!clientId) return NextResponse.json({ error: "Missing clientId" }, { status: 400 });

    if (!process.env.LINKEDIN_CLIENT_ID) {
        return NextResponse.json({ error: "LinkedIn credentials not configured" }, { status: 500 });
    }

    const origin = new URL(req.url).origin;
    const redirectUri = `${origin}/api/auth/linkedin/callback`;

    const scopes = ["r_liteprofile", "r_organization_social", "rw_organization_admin", "r_ads_reporting"].join(" ");

    const qs = new URLSearchParams({
        response_type: "code",
        client_id: process.env.LINKEDIN_CLIENT_ID,
        redirect_uri: redirectUri,
        scope: scopes,
        state: clientId,
    });

    return NextResponse.redirect(`https://www.linkedin.com/oauth/v2/authorization?${qs.toString()}`);
}
