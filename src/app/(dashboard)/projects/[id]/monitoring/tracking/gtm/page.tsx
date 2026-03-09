import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import GtmMonitoringClient from "./GtmMonitoringClient";

export default async function GtmMonitoringPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const session = await auth();
    if (!session) redirect("/login");

    const { id } = await params;

    const client = await (prisma as any).project.findUnique({
        where: { id },
        include: {
            dataSources: {
                where: { type: "DOMAIN" },
            }
        }
    });

    if (!client) notFound();

    const serializedDomains = client.dataSources.map((d: any) => ({
        id: d.id,
        name: d.name,
        value: d.value,
        createdAt: d.createdAt?.toISOString?.() || null,
    }));

    return (
        <GtmMonitoringClient
            projectId={id}
            clientName={client.name}
            domains={serializedDomains}
        />
    );
}
