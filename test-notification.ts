import { prisma } from "@/lib/db";
import { sendIncidentAlertEmail, sendSlackAlert } from "@/lib/services/email-service";
import * as dotenv from "dotenv";

dotenv.config({ path: "./.env" });

async function testQuery(clientId: string) {
    try {
        console.log("Querying client:", clientId);
        const client = await (prisma as any).client.findUnique({
            where: { id: clientId },
            select: {
                name: true,
                slackWebhookUrl: true,
                notificationUsers: { select: { email: true } }
            }
        });

        console.log("Found client:", client);

        if (!client) return;

        const recipients = client.notificationUsers.map((u: any) => u.email);
        console.log("Recipients:", recipients);

        const payload = {
            incidentTitle: "TEST: Waarschuwing uit de Evalco Dashboard Monitor",
            incidentCause: "Dit is een testbericht, handmatig gegenereerd via de instellingen.",
            clientName: client.name,
            startedAt: new Date(),
            recipients: recipients
        };

        if (recipients.length > 0) {
            console.log("Sending email...");
            const res = await sendIncidentAlertEmail(payload);
            console.log("Email result:", res);
        }

        if (client.slackWebhookUrl) {
            console.log("Sending slack...");
            await sendSlackAlert(client.slackWebhookUrl, payload);
            console.log("Slack sent.");
        }

    } catch (e: any) {
        console.error("Test failed:", e);
    }
}

// Find a client ID to test with
async function run() {
    const clients = await prisma.client.findFirst();
    if (clients) {
        await testQuery(clients.id);
    } else {
        console.log("No clients found");
    }
}

run();
