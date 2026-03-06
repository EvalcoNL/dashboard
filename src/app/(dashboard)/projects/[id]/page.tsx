export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import ProjectHubClient from "@/components/project/ProjectHubClient";
import { aggregateNormalizedMetrics } from "@/lib/normalized-helpers";

export default async function ProjectHomePage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const session = await auth();
    if (!session) redirect("/login");

    const { id } = await params;

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [client, monitoringData, performanceSummary, ongoingIncidents] = await Promise.all([
        prisma.project.findUnique({
            where: { id },
            include: {
                dataSources: {
                    where: { active: true },
                    include: {
                        uptimeChecks: {
                            orderBy: { checkedAt: "desc" },
                            take: 1
                        }
                    }
                }
            }
        }),
        // Monitoring Stats
        prisma.dataSource.findMany({
            where: { projectId: id, active: true },
            select: {
                id: true,
                type: true,
                externalId: true,
                config: true,
                uptimeChecks: {
                    orderBy: { checkedAt: "desc" },
                    take: 1
                }
            }
        }),
        // Performance Stats (last 7 days) via ClickHouse
        aggregateNormalizedMetrics(id, sevenDaysAgo),
        // Ongoing Incidents
        prisma.incident.count({
            where: { projectId: id, status: { not: "RESOLVED" } }
        })
    ]);

    if (!client) notFound();

    // Get latest health score from analyst reports
    const latestReport = await prisma.analystReport.findFirst({
        where: { projectId: id },
        orderBy: { createdAt: "desc" }
    });

    return (
        <ProjectHubClient
            project={client}
            monitoringData={monitoringData}
            performanceSummary={performanceSummary}
            ongoingIncidents={ongoingIncidents}
            healthScore={latestReport?.healthScore || null}
            userRole={session.user.role}
        />
    );
}
