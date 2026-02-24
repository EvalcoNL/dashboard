import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { sendIncidentAlertEmail, sendSlackAlert } from "@/lib/services/email-service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const clientId = params.id;

        // Fetch the client with notification users
        const client = await prisma.client.findUnique({
            where: { id: clientId },
            include: {
                notificationUsers: { select: { email: true } }
            }
        });

        if (!client) {
            return NextResponse.json({ error: "Client not found" }, { status: 404 });
        }

        const recipients = client.notificationUsers.map((u: any) => u.email);
        const hasSlack = !!client.slackWebhookUrl;
        const hasEmail = recipients.length > 0;

        if (!hasSlack && !hasEmail) {
            return NextResponse.json({ error: "Geen notificatiekanalen geconfigureerd." }, { status: 400 });
        }

        const payload = {
            incidentTitle: "TEST: Waarschuwing uit de Evalco Dashboard Monitor",
            incidentCause: "Dit is een testbericht, handmatig gegenereerd via de instellingen.",
            clientName: client.name,
            startedAt: new Date(),
            recipients: recipients
        };

        const results = { email: false, slack: false };

        // Send Email
        if (hasEmail) {
            const result = await sendIncidentAlertEmail(payload);
            results.email = !!result?.success;
        }

        // Send Slack (Fire & forget typically, but we await here for the test)
        if (hasSlack && client.slackWebhookUrl) {
            try {
                await sendSlackAlert(client.slackWebhookUrl, payload);
                results.slack = true;
            } catch (err) {
                console.error("[Test Notification] Slack error:", err);
            }
        }

        return NextResponse.json({
            success: true,
            message: "Test notificaties succesvol verstuurd!",
            channels: results
        });

    } catch (error: any) {
        console.error("[Test Notification] Error:", error);
        return NextResponse.json({
            error: "Internal Server Error",
            details: error?.message || String(error),
            stack: error?.stack
        }, { status: 500 });
    }
}
