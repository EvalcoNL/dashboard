export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");

    if (!clientId) {
        return NextResponse.json({ error: "Missing clientId parameter" }, { status: 400 });
    }

    const slackClientId = process.env.SLACK_CLIENT_ID;
    if (!slackClientId) {
        return NextResponse.json({ error: "Slack OAuth credentials are not configured in .env" }, { status: 500 });
    }

    const origin = new URL(req.url).origin;
    const redirectUri = `${origin}/api/auth/slack/callback`;

    // We only need the incoming-webhook scope for incident notifications
    const scopes = ["incoming-webhook"];

    const authUrl = new URL("https://slack.com/oauth/v2/authorize");
    authUrl.searchParams.set("client_id", slackClientId);
    authUrl.searchParams.set("scope", scopes.join(","));
    authUrl.searchParams.set("redirect_uri", redirectUri);
    // Use state to pass the clientId so we know which project to update in the callback
    authUrl.searchParams.set("state", clientId);

    return NextResponse.redirect(authUrl.toString());
}
