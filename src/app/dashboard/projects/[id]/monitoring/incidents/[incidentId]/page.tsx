export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import IncidentDetailClient from "./IncidentDetailClient";

export default async function IncidentDetailPage({
    params,
}: {
    params: Promise<{ id: string; incidentId: string }>;
}) {
    const session = await auth();
    if (!session) redirect("/login");

    const { incidentId } = await params;

    const incident = await (prisma as any).incident.findUnique({
        where: { id: incidentId },
        include: {
            client: { select: { id: true, name: true } },
            dataSource: { select: { id: true, name: true, externalId: true } },
            events: { orderBy: { createdAt: "asc" } },
        },
    });

    if (!incident) notFound();

    // Serialize dates
    const serialized = {
        ...incident,
        startedAt: incident.startedAt?.toISOString(),
        acknowledgedAt: incident.acknowledgedAt?.toISOString() || null,
        resolvedAt: incident.resolvedAt?.toISOString() || null,
        createdAt: incident.createdAt?.toISOString(),
        events: incident.events.map((e: any) => ({
            ...e,
            createdAt: e.createdAt?.toISOString(),
        })),
    };

    return (
        <IncidentDetailClient
            incident={serialized}
            userName={session.user?.name || "Onbekend"}
        />
    );
}
