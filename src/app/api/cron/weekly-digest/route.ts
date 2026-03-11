import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendWeeklyDigestEmail } from "@/lib/services/email-service";
import { formatDistanceStrict } from "date-fns";
import { nl } from "date-fns/locale";

export const dynamic = "force-dynamic";

/**
 * Weekly incident digest cron job.
 * Called weekly — sends each user with notification access a summary of
 * ALL incidents across their projects, but ONLY when there were incidents.
 *
 * Optimized: batch queries instead of per-user / per-datasource loops.
 */
export async function GET(request: Request) {
    // Verify cron secret
    const cronSecret = request.headers.get("x-cron-secret");
    if (cronSecret !== process.env.CRON_SECRET && process.env.NODE_ENV === "production") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

        // ── Batch: get all users with their projects ──────────────────
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                projects: {
                    select: { id: true, name: true },
                },
            },
        });

        // Collect all project IDs across all users
        const allProjectIds = [...new Set(users.flatMap(u => u.projects.map(p => p.id)))];
        if (allProjectIds.length === 0) {
            return NextResponse.json({ success: true, sent: 0, skipped: users.length, total: users.length });
        }

        // ── Batch: fetch ALL incidents this week in one query ─────────
        const allIncidentsThisWeek = await prisma.incident.findMany({
            where: {
                projectId: { in: allProjectIds },
                startedAt: { gte: weekAgo },
            },
            include: {
                project: { select: { name: true } },
                dataSource: { select: { name: true, externalId: true } },
            },
            orderBy: { startedAt: "desc" },
        });

        // ── Batch: previous week count per project ────────────────────
        const previousWeekIncidents = await prisma.incident.groupBy({
            by: ["projectId"],
            where: {
                projectId: { in: allProjectIds },
                startedAt: { gte: twoWeeksAgo, lt: weekAgo },
            },
            _count: { id: true },
        });
        const prevWeekByProject = new Map(previousWeekIncidents.map(g => [g.projectId, g._count.id]));

        // ── Batch: fetch ALL monitored data sources ───────────────────
        const allDataSources = await (prisma as any).dataSource.findMany({
            where: {
                projectId: { in: allProjectIds },
                type: { in: ["DOMAIN", "WEBSITE"] },
                active: true,
            },
            select: {
                id: true,
                name: true,
                externalId: true,
                projectId: true,
            },
        });

        // ── Batch: fetch ALL uptime checks for the week ───────────────
        const allDsIds = allDataSources.map((ds: any) => ds.id);
        const allUptimeChecks = allDsIds.length > 0
            ? await (prisma as any).uptimeCheck.findMany({
                where: {
                    dataSourceId: { in: allDsIds },
                    checkedAt: { gte: weekAgo, lt: now },
                },
                select: {
                    dataSourceId: true,
                    checkedAt: true,
                    status: true,
                },
            })
            : [];

        // Index uptime checks by dataSourceId
        const uptimeByDs = new Map<string, Array<{ checkedAt: Date; status: string }>>();
        for (const check of allUptimeChecks as any[]) {
            const arr = uptimeByDs.get(check.dataSourceId) || [];
            arr.push(check);
            uptimeByDs.set(check.dataSourceId, arr);
        }

        let sent = 0;
        let skipped = 0;

        for (const user of users) {
            if (!user.email || user.projects.length === 0) {
                skipped++;
                continue;
            }

            const projectIds = new Set(user.projects.map(p => p.id));

            // Filter this user's incidents from the batch
            const userIncidents = allIncidentsThisWeek.filter(inc => projectIds.has(inc.projectId));

            // Only send if there were incidents
            if (userIncidents.length === 0) {
                skipped++;
                continue;
            }

            // Previous week delta
            let previousWeekCount = 0;
            for (const pid of projectIds) {
                previousWeekCount += prevWeekByProject.get(pid) || 0;
            }

            const openIncidents = userIncidents.filter(
                inc => inc.status === "ONGOING" || inc.status === "ACKNOWLEDGED"
            ).length;

            const resolvedIncidents = userIncidents.filter(
                inc => inc.status === "RESOLVED"
            ).length;

            // ── Process monitors (no extra queries!) ──────────────────
            const userDataSources = allDataSources.filter((ds: any) => projectIds.has(ds.projectId));
            const monitors: {
                name: string;
                projectName: string;
                dailyStatus: boolean[];
                uptimePct: string;
            }[] = [];

            for (const ds of userDataSources as any[]) {
                const project = user.projects.find(p => p.id === ds.projectId);
                if (!project) continue;

                const dsChecks = uptimeByDs.get(ds.id) || [];

                const dailyStatus: boolean[] = [];
                let totalChecks = 0;
                let upChecks = 0;

                for (let d = 0; d < 7; d++) {
                    const dayStart = new Date(weekAgo.getTime() + d * 24 * 60 * 60 * 1000);
                    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

                    // Check incidents (from batch, no query!)
                    const hadDowntime = userIncidents.some(inc => {
                        if (inc.dataSourceId !== ds.id) return false;
                        const incStart = new Date(inc.startedAt);
                        const incEnd = inc.resolvedAt ? new Date(inc.resolvedAt) : now;
                        return incStart < dayEnd && incEnd > dayStart;
                    });
                    dailyStatus.push(!hadDowntime);

                    // Count uptime checks (from batch!)
                    const dayChecks = dsChecks.filter((c: any) => {
                        const t = new Date(c.checkedAt).getTime();
                        return t >= dayStart.getTime() && t < dayEnd.getTime();
                    });
                    totalChecks += dayChecks.length;
                    upChecks += dayChecks.filter((c: any) => c.status === "UP").length;
                }

                monitors.push({
                    name: ds.name || ds.externalId,
                    projectName: project.name,
                    dailyStatus,
                    uptimePct: totalChecks > 0
                        ? ((upChecks / totalChecks) * 100).toFixed(3)
                        : "100.000",
                });
            }

            // ── Longest incidents ─────────────────────────────────────
            const longestIncidents = userIncidents
                .map(inc => {
                    const endTime = inc.resolvedAt ? new Date(inc.resolvedAt) : now;
                    const durationMs = endTime.getTime() - new Date(inc.startedAt).getTime();
                    const duration = inc.resolvedAt
                        ? formatDistanceStrict(new Date(inc.startedAt), endTime, { locale: nl })
                        : "Ongoing";
                    return {
                        title: inc.title,
                        cause: inc.cause,
                        duration,
                        durationMs,
                        projectId: inc.projectId,
                        incidentId: inc.id,
                    };
                })
                .sort((a, b) => b.durationMs - a.durationMs)
                .slice(0, 5)
                .map(({ durationMs, ...rest }) => rest);

            // ── Send the digest ───────────────────────────────────────
            await sendWeeklyDigestEmail({
                recipientEmail: user.email,
                recipientName: user.name || "Gebruiker",
                periodStart: weekAgo,
                periodEnd: now,
                totalIncidents: userIncidents.length,
                resolvedIncidents,
                openIncidents,
                previousWeekIncidents: previousWeekCount,
                monitors,
                longestIncidents,
            });

            sent++;
        }

        return NextResponse.json({
            success: true,
            sent,
            skipped,
            total: users.length,
        });
    } catch (error) {
        console.error("[WeeklyDigest] Error:", error);
        return NextResponse.json({ error: "Failed to send weekly digest" }, { status: 500 });
    }
}
