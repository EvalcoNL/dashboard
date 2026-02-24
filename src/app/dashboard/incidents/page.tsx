export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import GlobalIncidentsClient from "./GlobalIncidentsClient";

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

    return <GlobalIncidentsClient incidents={serialized} />;
}
