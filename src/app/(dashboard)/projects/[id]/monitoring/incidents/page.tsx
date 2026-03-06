export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import IncidentsClient from "./IncidentsClient";

export default async function IncidentsPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const session = await auth();
    if (!session) redirect("/login");

    const { id: projectId } = await params;
    const isAdmin = session.user.role === "ADMIN";

    const client = await (prisma as any).project.findUnique({
        where: { id: projectId },
        select: {
            id: true,
            name: true,
            slackWebhookUrl: true,
        },
    });

    if (!client) notFound();

    const incidents = await (prisma as any).incident.findMany({
        where: { projectId },
        orderBy: { startedAt: "desc" },
        take: 100,
        include: {
            project: { select: { id: true, name: true } },
            dataSource: { select: { id: true, name: true, externalId: true } },
        },
    });

    const serialized = incidents.map((inc: any) => ({
        ...inc,
        startedAt: inc.startedAt?.toISOString(),
        acknowledgedAt: inc.acknowledgedAt?.toISOString() || null,
        resolvedAt: inc.resolvedAt?.toISOString() || null,
        createdAt: inc.createdAt?.toISOString(),
    }));

    // Check if the current user has opted in for notifications
    const userPref = await (prisma as any).userNotificationPreference.findUnique({
        where: {
            userId_projectId: {
                userId: session.user.id,
                projectId
            }
        }
    });
    const userOptedIn = userPref?.enabled ?? false;

    return (
        <IncidentsClient
            projectId={projectId}
            clientName={client.name}
            incidents={serialized}
            initialSlackWebhookUrl={client.slackWebhookUrl || ""}
            isAdmin={isAdmin}
            userOptedIn={userOptedIn}
        />
    );
}

