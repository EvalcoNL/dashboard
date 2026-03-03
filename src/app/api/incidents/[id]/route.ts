export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { sendIncidentResolvedEmail, sendSlackResolvedAlert } from "@/lib/services/email-service";
import { resolveNotificationConfig } from "@/lib/services/notification-resolver";

// GET /api/incidents/[id] — get single incident with events
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const incident = await (prisma as any).incident.findUnique({
        where: { id },
        include: {
            client: { select: { id: true, name: true } },
            dataSource: { select: { id: true, name: true, externalId: true } },
            events: { orderBy: { createdAt: "asc" } },
        },
    });

    if (!incident) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json(incident);
}

// PATCH /api/incidents/[id] — update status (acknowledge/resolve)
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const { action } = body; // "acknowledge" | "resolve" | "reopen"

    const incident = await (prisma as any).incident.findUnique({ where: { id } });
    if (!incident) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const userName = session.user?.name || "Onbekend";
    const userId = session.user?.id || null;

    let updateData: any = {};
    let eventType = "";
    let eventMessage = "";

    if (action === "acknowledge") {
        updateData = { status: "ACKNOWLEDGED", acknowledgedAt: new Date(), acknowledgedBy: userName };
        eventType = "ACKNOWLEDGED";
        eventMessage = `Incident bevestigd door ${userName}`;
    } else if (action === "resolve") {
        updateData = { status: "RESOLVED", resolvedAt: new Date(), resolvedBy: userName };
        eventType = "RESOLVED";
        eventMessage = `Incident opgelost door ${userName}`;
    } else if (action === "reopen") {
        updateData = { status: "ONGOING", resolvedAt: null, resolvedBy: null, acknowledgedAt: null, acknowledgedBy: null };
        eventType = "REOPENED";
        eventMessage = `Incident heropend door ${userName}`;
    } else {
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const updated = await (prisma as any).incident.update({
        where: { id },
        data: {
            ...updateData,
            events: {
                create: {
                    type: eventType,
                    message: eventMessage,
                    userId,
                    userName,
                },
            },
        },
        include: {
            client: {
                select: {
                    id: true,
                    name: true,
                    slackWebhookUrl: true,
                    notificationUsers: { select: { email: true } }
                }
            },
            dataSource: { select: { id: true, name: true, externalId: true, config: true } },
            events: { orderBy: { createdAt: "asc" } },
        },
    });

    // If resolved, send notifications
    if (action === "resolve" && updated.client && updated.dataSource) {
        const config = updated.dataSource.config as any || {};
        const client = updated.client;

        // Use resolveNotificationConfig for global/custom/disabled mode
        const notifConfig = await resolveNotificationConfig(client.id);

        if (notifConfig.enabled) {
            const payload = {
                incidentTitle: updated.dataSource.name || updated.dataSource.externalId,
                incidentCause: updated.cause,
                clientName: client.name,
                startedAt: updated.startedAt,
                recipients: notifConfig.recipients
            };

            const notifiedChannels = [];

            if (payload.recipients.length > 0 && config.notifyEmail !== false) {
                sendIncidentResolvedEmail(payload).catch(err => console.error(err));
                notifiedChannels.push(`E-mail (${payload.recipients.join(', ')})`);
            }

            if (notifConfig.slackWebhookUrl && config.notifySlack) {
                sendSlackResolvedAlert(notifConfig.slackWebhookUrl, payload).catch(err => console.error(err));
                notifiedChannels.push("Slack");
            }

            if (notifiedChannels.length > 0) {
                await (prisma as any).incidentEvent.create({
                    data: {
                        incidentId: id,
                        type: "NOTIFICATION_SENT",
                        message: `Resolutie-notificatie verzonden via: ${notifiedChannels.join(' en ')} (handmatige oplossing)`,
                        userName: "Systeem",
                    }
                });
            }
        }
    }

    return NextResponse.json(updated);
}
