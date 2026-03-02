import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import TrackingMonitoringClient from "./TrackingMonitoringClient";

export default async function DataTrackingPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const session = await auth();
    if (!session) redirect("/login");

    const { id } = await params;

    const client = await (prisma as any).client.findUnique({
        where: { id },
        include: {
            dataSources: {
                where: { type: "DOMAIN" },
            }
        }
    });

    if (!client) notFound();

    // Serialize data for client component
    const serializedDomains = client.dataSources.map((d: any) => ({
        ...d,
        createdAt: d.createdAt?.toISOString?.() || null,
        lastSyncedAt: d.lastSyncedAt?.toISOString?.() || null,
    }));

    return (
        <TrackingMonitoringClient
            clientId={id}
            clientName={client.name}
            domains={serializedDomains}
        />
    );
}
