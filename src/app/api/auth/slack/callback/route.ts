export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session) return NextResponse.redirect(new URL("/login", req.url));

    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state"); // This represents the clientId
    const error = searchParams.get("error");

    const clientId = state;

    if (error) {
        console.error("[Slack OAuth] User denied permission or error occurred:", error);
        return NextResponse.redirect(new URL(`/dashboard/projects/${clientId}/monitoring/incidents?error=slack_denied`, req.url));
    }

    if (!code || !clientId) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    const slackClientId = process.env.SLACK_CLIENT_ID;
    const slackClientSecret = process.env.SLACK_CLIENT_SECRET;

    if (!slackClientId || !slackClientSecret) {
        console.error("Slack OAuth credentials missing");
        return NextResponse.redirect(new URL(`/dashboard/projects/${clientId}/monitoring/incidents?error=slack_config_missing`, req.url));
    }

    const origin = new URL(req.url).origin;
    const redirectUri = `${origin}/api/auth/slack/callback`;

    try {
        // Exchange code for token & webhook
        const response = await fetch("https://slack.com/api/oauth.v2.access", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                client_id: slackClientId,
                client_secret: slackClientSecret,
                code,
                redirect_uri: redirectUri,
            }),
        });

        const data = await response.json();

        if (!data.ok) {
            console.error("[Slack OAuth] Error trading code:", data.error);
            return NextResponse.redirect(new URL(`/dashboard/projects/${clientId}/monitoring/incidents?error=slack_auth_failed`, req.url));
        }

        // Validate that we got an incoming webhook
        if (!data.incoming_webhook || !data.incoming_webhook.url) {
            console.error("[Slack OAuth] Missing incoming_webhook in response:", data);
            return NextResponse.redirect(new URL(`/dashboard/projects/${clientId}/monitoring/incidents?error=slack_webhook_missing`, req.url));
        }

        const webhookUrl = data.incoming_webhook.url;

        // Verify User has access to this Client
        const projectAccess = await prisma.client.findFirst({
            where: {
                id: clientId,
                users: { some: { id: session.user.id } }
            }
        });

        if (!projectAccess && session.user.role !== "ADMIN") {
            return NextResponse.redirect(new URL(`/dashboard/projects`, req.url));
        }

        // Save the webhook URL to the Client record
        await prisma.client.update({
            where: { id: clientId },
            data: { slackWebhookUrl: webhookUrl },
        });

        // Redirect back to incidents page
        return NextResponse.redirect(new URL(`/dashboard/projects/${clientId}/monitoring/incidents`, req.url));

    } catch (e) {
        console.error("[Slack OAuth] Caught error:", e);
        return NextResponse.redirect(new URL(`/dashboard/projects/${clientId}/monitoring/incidents?error=slack_server_error`, req.url));
    }
}
