export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import MonitorDetailPage from "./MonitorDetailPage";

export default async function MonitorPage({
    params,
}: {
    params: Promise<{ id: string; monitorId: string }>;
}) {
    const session = await auth();
    if (!session) redirect("/login");

    const { id: clientId, monitorId } = await params;

    // Fetch the single domain data source with uptime checks and monitored pages
    const domain = await (prisma as any).dataSource.findUnique({
        where: { id: monitorId },
        include: {
            uptimeChecks: {
                orderBy: { checkedAt: "desc" },
                take: 100,
            },
            monitoredPages: {
                orderBy: { url: "asc" },
            },
            incidents: {
                orderBy: { startedAt: "desc" },
                take: 10,
            },
            client: { select: { name: true } },
        },
    });

    if (!domain || domain.clientId !== clientId || domain.type !== "DOMAIN") {
        notFound();
    }

    // Calculate 7-day and 30-day uptime
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const calculateUptime = (groups: { status: string; _count: number }[]) => {
        const upCount = groups.find(g => g.status === "UP")?._count || 0;
        const downCount = groups.find(g => g.status === "DOWN")?._count || 0;
        const total = upCount + downCount;
        return total === 0 ? "100.00" : ((upCount / total) * 100).toFixed(2);
    };

    const [checks7d, checks30d] = await Promise.all([
        (prisma as any).uptimeCheck.groupBy({
            by: ["status"],
            where: { dataSourceId: monitorId, checkedAt: { gte: sevenDaysAgo } },
            _count: true,
        }),
        (prisma as any).uptimeCheck.groupBy({
            by: ["status"],
            where: { dataSourceId: monitorId, checkedAt: { gte: thirtyDaysAgo } },
            _count: true,
        }),
    ]);

    const domainWithStats = {
        ...domain,
        uptime7d: calculateUptime(checks7d),
        uptime30d: calculateUptime(checks30d),
    };

    // Serialize dates for client component
    const serializedDomain = {
        ...domainWithStats,
        createdAt: domain.createdAt?.toISOString?.() || null,
        lastSyncedAt: domain.lastSyncedAt?.toISOString?.() || null,
        uptimeChecks: domain.uptimeChecks.map((c: any) => ({
            ...c,
            checkedAt: c.checkedAt?.toISOString?.() || null,
        })),
        monitoredPages: domain.monitoredPages.map((p: any) => ({
            ...p,
            lastCheckedAt: p.lastCheckedAt?.toISOString?.() || null,
        })),
        incidents: domain.incidents.map((i: any) => ({
            ...i,
            startedAt: i.startedAt?.toISOString?.() || null,
            acknowledgedAt: i.acknowledgedAt?.toISOString?.() || null,
            resolvedAt: i.resolvedAt?.toISOString?.() || null,
            createdAt: i.createdAt?.toISOString?.() || null,
        })),
    };

    return (
        <MonitorDetailPage
            clientId={clientId}
            clientName={domain.client.name}
            domain={serializedDomain}
        />
    );
}
