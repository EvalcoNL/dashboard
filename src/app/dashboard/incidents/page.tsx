export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import GlobalIncidentsClient from "./GlobalIncidentsClient";
import { getGlobalNotificationSettings } from "@/lib/services/notification-resolver";

export default async function GlobalIncidentsPage() {
    const session = await auth();
    if (!session) redirect("/login");

    const incidents = await (prisma as any).incident.findMany({
        orderBy: { startedAt: "desc" },
        take: 100,
        include: {
            client: { select: { id: true, name: true } },
            dataSource: { select: { id: true, name: true, externalId: true } },
        },
    });

    // Serialize dates
    const serialized = incidents.map((inc: any) => ({
        ...inc,
        startedAt: inc.startedAt?.toISOString(),
        acknowledgedAt: inc.acknowledgedAt?.toISOString() || null,
        resolvedAt: inc.resolvedAt?.toISOString() || null,
        createdAt: inc.createdAt?.toISOString(),
    }));

    // Get all users for the user picker
    const allUsers = await (prisma as any).user.findMany({
        select: { id: true, name: true, email: true },
        orderBy: { name: "asc" }
    });

    // Get global notification settings
    const globalSettings = await getGlobalNotificationSettings();

    // Get clients with their notification mode
    const clients = await (prisma as any).client.findMany({
        select: {
            id: true,
            name: true,
            notificationMode: true,
        },
        orderBy: { name: "asc" }
    });

    return (
        <GlobalIncidentsClient
            incidents={serialized}
            allUsers={allUsers}
            globalNotificationUserIds={globalSettings.userIds}
            globalSlackWebhookUrl={globalSettings.slackWebhookUrl || ""}
            clients={clients}
        />
    );
}
