export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import GlobalIncidentsClient from "./GlobalIncidentsClient";
import { getGlobalNotificationSettings } from "@/lib/services/notification-resolver";

export default async function GlobalIncidentsPage() {
    const session = await auth();
    if (!session) redirect("/login");

    const isAdmin = session.user.role === "ADMIN";

    // For non-admin users, only show data for their linked clients
    let clientFilter: any = {};
    if (!isAdmin) {
        const userWithClients = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { projects: { select: { id: true } } }
        });
        const accessibleClientIds = userWithClients?.projects.map((c: any) => c.id) || [];
        clientFilter = { projectId: { in: accessibleClientIds } };
    }

    const incidents = await (prisma as any).incident.findMany({
        where: clientFilter,
        orderBy: { startedAt: "desc" },
        take: 100,
        include: {
            project: { select: { id: true, name: true } },
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

    // Get all users for the user picker (admin only for global settings)
    const allUsers = isAdmin
        ? await (prisma as any).user.findMany({
            select: { id: true, name: true, email: true },
            orderBy: { name: "asc" }
        })
        : [];

    // Get global notification settings (admin only)
    const globalSettings = isAdmin
        ? await getGlobalNotificationSettings()
        : { userIds: [], slackWebhookUrl: null };

    // Get clients with their notification mode (filtered for non-admin)
    const clients = await (prisma as any).project.findMany({
        where: !isAdmin ? { users: { some: { id: session.user.id } } } : {},
        select: {
            id: true,
            name: true,
            notificationMode: true,
        },
        orderBy: { name: "asc" }
    });

    // Get user's own notification preferences (for opt-in toggles)
    const userPrefs = await (prisma as any).userNotificationPreference.findMany({
        where: { userId: session.user.id },
        select: { projectId: true, enabled: true }
    });
    const userPreferences: Record<string, boolean> = {};
    for (const p of userPrefs) {
        userPreferences[p.projectId] = p.enabled;
    }

    return (
        <GlobalIncidentsClient
            incidents={serialized}
            allUsers={allUsers}
            globalNotificationUserIds={globalSettings.userIds}
            globalSlackWebhookUrl={globalSettings.slackWebhookUrl || ""}
            projects={clients}
            isAdmin={isAdmin}
            userPreferences={userPreferences}
        />
    );
}

