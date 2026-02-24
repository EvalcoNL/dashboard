export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");
    if (!clientId) return NextResponse.json({ error: "Missing clientId" }, { status: 400 });

    const origin = new URL(req.url).origin;
    const redirectUri = `${origin}/api/auth/google-business/callback`;

    const scopes = [
        "https://www.googleapis.com/auth/business.manage",
        "https://www.googleapis.com/auth/userinfo.email",
    ].join(" ");

    const qs = new URLSearchParams({
        client_id: process.env.GOOGLE_OAUTH_CLIENT_ID || "",
        redirect_uri: redirectUri, response_type: "code",
        scope: scopes, access_type: "offline", prompt: "consent", state: clientId,
    });

    return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${qs.toString()}`);
}
