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

    const { id: clientId } = await params;

    const client = await (prisma as any).client.findUnique({
        where: { id: clientId },
        select: {
            id: true,
            name: true,
            slackWebhookUrl: true,
            notificationUsers: { select: { id: true, name: true, email: true } }
        },
    });

    if (!client) notFound();

    const incidents = await (prisma as any).incident.findMany({
        where: { clientId },
        orderBy: { startedAt: "desc" },
        take: 100,
        include: {
            client: { select: { id: true, name: true } },
            dataSource: { select: { id: true, name: true, externalId: true } },
        },
    });

    const allUsers = await (prisma as any).user.findMany({
        select: { id: true, name: true, email: true },
        orderBy: { name: "asc" }
    });

    const serialized = incidents.map((inc: any) => ({
        ...inc,
        startedAt: inc.startedAt?.toISOString(),
        acknowledgedAt: inc.acknowledgedAt?.toISOString() || null,
        resolvedAt: inc.resolvedAt?.toISOString() || null,
        createdAt: inc.createdAt?.toISOString(),
    }));

    return (
        <IncidentsClient
            clientId={clientId}
            clientName={client.name}
            incidents={serialized}
            allUsers={allUsers}
            notificationUsers={client.notificationUsers || []}
            initialSlackWebhookUrl={client.slackWebhookUrl || ""}
        />
    );
}
