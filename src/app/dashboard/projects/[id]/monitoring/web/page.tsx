export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import WebMonitoringClient from "./WebMonitoringClient";

export default async function WebMonitoringPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const session = await auth();
    if (!session) redirect("/login");

    const { id } = await params;

    // Fetch domains configured for this client with their uptime checks
    const client = await (prisma as any).client.findUnique({
        where: { id },
        include: {
            dataSources: {
                where: { type: "DOMAIN" },
                include: {
                    uptimeChecks: {
                        orderBy: { checkedAt: "desc" },
                        take: 100
                    },
                    monitoredPages: {
                        orderBy: { url: "asc" }
                    }
                }
            }
        }
    });

    if (!client) notFound();

    // Calculate 7-day and 30-day aggregates
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

    const domainsWithStats = await Promise.all(client.dataSources.map(async (domain: any) => {
        const [checks7d, checks30d] = await Promise.all([
            (prisma as any).uptimeCheck.groupBy({
                by: ['status'],
                where: { dataSourceId: domain.id, checkedAt: { gte: sevenDaysAgo } },
                _count: true
            }),
            (prisma as any).uptimeCheck.groupBy({
                by: ['status'],
                where: { dataSourceId: domain.id, checkedAt: { gte: thirtyDaysAgo } },
                _count: true
            })
        ]);

        return {
            ...domain,
            uptime7d: calculateUptime(checks7d),
            uptime30d: calculateUptime(checks30d),
        };
    }));

    // Gather incidents (DOWN checks) across all domains, recent 30
    const allDataSourceIds = client.dataSources.map((ds: any) => ds.id);
    let incidents: any[] = [];
    if (allDataSourceIds.length > 0) {
        incidents = await (prisma as any).uptimeCheck.findMany({
            where: {
                dataSourceId: { in: allDataSourceIds },
                status: "DOWN"
            },
            orderBy: { checkedAt: "desc" },
            take: 30,
            include: {
                dataSource: { select: { name: true, externalId: true } }
            }
        });
    }

    // Serialize dates for client component
    const serializedDomains = domainsWithStats.map((d: any) => ({
        ...d,
        createdAt: d.createdAt?.toISOString?.() || null,
        lastSyncedAt: d.lastSyncedAt?.toISOString?.() || null,
        uptimeChecks: d.uptimeChecks.map((c: any) => ({
            ...c,
            checkedAt: c.checkedAt?.toISOString?.() || null
        })),
        monitoredPages: d.monitoredPages.map((p: any) => ({
            ...p,
            lastCheckedAt: p.lastCheckedAt?.toISOString?.() || null
        }))
    }));

    const serializedIncidents = incidents.map((inc: any) => ({
        ...inc,
        checkedAt: inc.checkedAt?.toISOString?.() || null
    }));

    // Summary counts
    const upCount = domainsWithStats.filter((d: any) => {
        const checks = d.uptimeChecks || [];
        return checks.length === 0 || checks[0].status === "UP";
    }).length;
    const downCount = domainsWithStats.length - upCount;

    return (
        <WebMonitoringClient
            clientId={id}
            clientName={client.name}
            domains={serializedDomains}
            incidents={serializedIncidents}
            summary={{ total: domainsWithStats.length, up: upCount, down: downCount }}
        />
    );
}
