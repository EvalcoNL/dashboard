export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { encodeOAuthState } from "@/lib/oauth-state";

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const scope = searchParams.get("scope");

    // Either projectId or scope=global must be provided
    if (!projectId && scope !== "global") {
        return NextResponse.json({ error: "Missing projectId or scope=global parameter" }, { status: 400 });
    }

    const slackClientId = process.env.SLACK_CLIENT_ID;
    if (!slackClientId) {
        return NextResponse.json({ error: "Slack OAuth credentials are not configured in .env" }, { status: 500 });
    }

    const origin = process.env.NEXTAUTH_URL || new URL(req.url).origin;
    const redirectUri = `${origin}/api/auth/slack/callback`;

    // We only need the incoming-webhook scope for incident notifications
    const scopes = ["incoming-webhook"];

    const authUrl = new URL("https://slack.com/oauth/v2/authorize");
    authUrl.searchParams.set("client_id", slackClientId);
    authUrl.searchParams.set("scope", scopes.join(","));
    authUrl.searchParams.set("redirect_uri", redirectUri);
    // Use CSRF-protected state: "__global__" for global settings, encoded projectId for project-level
    authUrl.searchParams.set("state", scope === "global" ? encodeOAuthState("__global__") : encodeOAuthState(projectId!));

    return NextResponse.redirect(authUrl.toString());
}
