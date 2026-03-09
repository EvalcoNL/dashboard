export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { decodeOAuthState } from "@/lib/oauth-state";
import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { saveGlobalNotificationSettings, getGlobalNotificationSettings } from "@/lib/services/notification-resolver";

export async function GET(req: NextRequest) {
    const origin = process.env.NEXTAUTH_URL || new URL(req.url).origin;
    const session = await auth();
    if (!session) return NextResponse.redirect(new URL("/login", origin));

    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const rawState = searchParams.get("state") || "";
    const decodedState = decodeOAuthState(rawState);
    const error = searchParams.get("error");

    const isGlobal = decodedState === "__global__";
    const projectId = isGlobal ? null : decodedState;
    const redirectBase = isGlobal ? "/incidents" : `/projects/${projectId}/monitoring/incidents`;

    if (error) {
        console.error("[Slack OAuth] User denied permission or error occurred:", error);
        return NextResponse.redirect(new URL(`${redirectBase}?error=slack_denied&tab=settings`, origin));
    }

    if (!code || (!projectId && !isGlobal)) {
        return NextResponse.redirect(new URL("/", origin));
    }

    const slackClientId = process.env.SLACK_CLIENT_ID;
    const slackClientSecret = process.env.SLACK_CLIENT_SECRET;

    if (!slackClientId || !slackClientSecret) {
        console.error("Slack OAuth credentials missing");
        return NextResponse.redirect(new URL(`${redirectBase}?error=slack_config_missing&tab=settings`, origin));
    }

    // origin already defined at top of function
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
            return NextResponse.redirect(new URL(`${redirectBase}?error=slack_auth_failed&tab=settings`, origin));
        }

        // Validate that we got an incoming webhook
        if (!data.incoming_webhook || !data.incoming_webhook.url) {
            console.error("[Slack OAuth] Missing incoming_webhook in response:", data);
            return NextResponse.redirect(new URL(`${redirectBase}?error=slack_webhook_missing&tab=settings`, origin));
        }

        const webhookUrl = data.incoming_webhook.url;

        if (isGlobal) {
            // ─── Global Settings ───
            // Save the webhook to GlobalSetting (encrypted)
            const globalSettings = await getGlobalNotificationSettings();
            await saveGlobalNotificationSettings({
                userIds: globalSettings.userIds,
                slackWebhookUrl: webhookUrl,
            });

            return NextResponse.redirect(new URL(`/incidents?tab=settings`, origin));
        }

        // ─── Project-level Settings ───

        // Verify User has access to this Client
        const projectAccess = await prisma.project.findFirst({
            where: {
                id: projectId!,
                users: { some: { id: session.user.id } }
            }
        });

        if (!projectAccess && session.user.role !== "ADMIN") {
            return NextResponse.redirect(new URL(`/projects`, origin));
        }

        // Save the webhook URL to the Client record
        await prisma.project.update({
            where: { id: projectId! },
            data: { slackWebhookUrl: encrypt(webhookUrl) },
        });

        // Also save as a formal DataSource so it shows up in "Connected Apps"
        const existingSlackSource = await prisma.dataSource.findFirst({
            where: {
                projectId: projectId!,
                type: "SLACK",
                externalId: "SLACK"
            }
        });

        if (existingSlackSource) {
            await prisma.dataSource.update({
                where: { id: existingSlackSource.id },
                data: {
                    active: true,
                    config: { webhookUrl } as any,
                }
            });
        } else {
            await prisma.dataSource.create({
                data: {
                    projectId: projectId!,
                    externalId: "SLACK",
                    type: "SLACK",
                    name: "Slack Notifications",
                    category: "APP",
                    active: true,
                    token: "WEBHOOK",
                    config: { webhookUrl } as any
                }
            });
        }

        // Redirect back to incidents page
        return NextResponse.redirect(new URL(`/projects/${projectId}/monitoring/incidents`, origin));

    } catch (e) {
        console.error("[Slack OAuth] Caught error:", e);
        return NextResponse.redirect(new URL(`${redirectBase}?error=slack_server_error&tab=settings`, origin));
    }
}
