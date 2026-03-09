import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { sendIncidentAlertEmail, sendSlackAlert } from "@/lib/services/email-service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const resolvedParams = await params;
        const monitorId = resolvedParams.id;

        // Fetch the monitor and its client
        const monitor = await prisma.dataSource.findUnique({
            where: { id: monitorId },
            include: {
                project: {
                    include: {
                        notificationUsers: { select: { email: true } }
                    }
                }
            }
        });

        if (!monitor || monitor.type !== "DOMAIN") {
            return NextResponse.json({ error: "Monitor niet gevonden" }, { status: 404 });
        }

        const client = monitor.project;
        const config = monitor.config as any || {};

        const notifyEmail = config.notifyEmail !== false;
        const notifySlack = !!config.notifySlack;

        const recipients = client.notificationUsers.map((u: any) => u.email);
        const hasSlackWebhook = !!client.slackWebhookUrl;

        const payload = {
            incidentTitle: `TEST: Monitor Alert voor ${monitor.name || monitor.externalId}`,
            incidentCause: "Dit is een handmatige testnotificatie om je instellingen te controleren.",
            clientName: client.name,
            startedAt: new Date(),
            recipients: recipients
        };

        const results = { email: false, slack: false };
        let count = 0;

        // Send Email if enabled in monitor AND client has users
        if (notifyEmail && recipients.length > 0) {
            try {
                await sendIncidentAlertEmail(payload);
                results.email = true;
                count++;
            } catch (err) {
                console.error("[Monitor Test] Email error:", err);
            }
        }

        // Send Slack if enabled in monitor AND client has webhook
        if (notifySlack && hasSlackWebhook && client.slackWebhookUrl) {
            try {
                await sendSlackAlert(client.slackWebhookUrl, payload);
                results.slack = true;
                count++;
            } catch (err) {
                console.error("[Monitor Test] Slack error:", err);
            }
        }

        if (count === 0) {
            let reason = "Geen kanalen geselecteerd.";
            if (!notifyEmail && !notifySlack) reason = "Notificaties staan uit voor deze monitor.";
            else if (notifyEmail && recipients.length === 0) reason = "Geen e-mailontvangers ingesteld voor dit project.";
            else if (notifySlack && !hasSlackWebhook) reason = "Slack is nog niet gekoppeld voor dit project.";

            return NextResponse.json({
                success: false,
                error: reason,
                channels: results
            }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            message: "Test notificaties succesvol verstuurd!",
            channels: results
        });

    } catch (error: unknown) {
        console.error("[Monitor Test Notification] Error:", error);
        return NextResponse.json({
            error: "Interne serverfout",
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
