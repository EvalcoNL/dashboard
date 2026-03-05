export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { saveGlobalNotificationSettings, getGlobalNotificationSettings } from "@/lib/services/notification-resolver";

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session) return NextResponse.redirect(new URL("/login", req.url));

    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state"); // "__global__" or clientId
    const error = searchParams.get("error");

    const isGlobal = state === "__global__";
    const clientId = isGlobal ? null : state;
    const redirectBase = isGlobal ? "/dashboard/incidents" : `/dashboard/projects/${clientId}/monitoring/incidents`;

    if (error) {
        console.error("[Slack OAuth] User denied permission or error occurred:", error);
        return NextResponse.redirect(new URL(`${redirectBase}?error=slack_denied&tab=settings`, req.url));
    }

    if (!code || (!clientId && !isGlobal)) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    const slackClientId = process.env.SLACK_CLIENT_ID;
    const slackClientSecret = process.env.SLACK_CLIENT_SECRET;

    if (!slackClientId || !slackClientSecret) {
        console.error("Slack OAuth credentials missing");
        return NextResponse.redirect(new URL(`${redirectBase}?error=slack_config_missing&tab=settings`, req.url));
    }

    const origin = process.env.NEXTAUTH_URL || new URL(req.url).origin;
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
            return NextResponse.redirect(new URL(`${redirectBase}?error=slack_auth_failed&tab=settings`, req.url));
        }

        // Validate that we got an incoming webhook
        if (!data.incoming_webhook || !data.incoming_webhook.url) {
            console.error("[Slack OAuth] Missing incoming_webhook in response:", data);
            return NextResponse.redirect(new URL(`${redirectBase}?error=slack_webhook_missing&tab=settings`, req.url));
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

            return NextResponse.redirect(new URL(`/dashboard/incidents?tab=settings`, req.url));
        }

        // ─── Project-level Settings ───

        // Verify User has access to this Client
        const projectAccess = await prisma.client.findFirst({
            where: {
                id: clientId!,
                users: { some: { id: session.user.id } }
            }
        });

        if (!projectAccess && session.user.role !== "ADMIN") {
            return NextResponse.redirect(new URL(`/dashboard/projects`, req.url));
        }

        // Save the webhook URL to the Client record
        await prisma.client.update({
            where: { id: clientId! },
            data: { slackWebhookUrl: encrypt(webhookUrl) },
        });

        // Also save as a formal DataSource so it shows up in "Connected Apps"
        const existingSlackSource = await prisma.dataSource.findFirst({
            where: {
                clientId: clientId!,
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
                    clientId: clientId!,
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
        return NextResponse.redirect(new URL(`/dashboard/projects/${clientId}/monitoring/incidents`, req.url));

    } catch (e) {
        console.error("[Slack OAuth] Caught error:", e);
        return NextResponse.redirect(new URL(`${redirectBase}?error=slack_server_error&tab=settings`, req.url));
    }
}
