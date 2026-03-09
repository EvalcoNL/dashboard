import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendWeeklyDigestEmail } from "@/lib/services/email-service";

export const dynamic = "force-dynamic";

/**
 * Weekly performance digest cron job.
 * Called weekly to send each user a summary of their projects' performance.
 */
export async function GET(request: Request) {
    // Verify cron secret
    const cronSecret = request.headers.get("x-cron-secret");
    if (cronSecret !== process.env.CRON_SECRET && process.env.NODE_ENV === "production") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // Get all users with their projects
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                projects: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        let sent = 0;
        let skipped = 0;

        for (const user of users) {
            if (!user.email || user.projects.length === 0) {
                skipped++;
                continue;
            }

            // Gather per-project stats
            const projectStats = [];

            for (const project of user.projects) {
                // Get incident count for the week
                const incidents = await prisma.incident.count({
                    where: {
                        projectId: project.id,
                        startedAt: { gte: weekAgo },
                    },
                });

                // Get open incidents
                const openIncidents = await prisma.incident.count({
                    where: {
                        projectId: project.id,
                        resolvedAt: null,
                    },
                });

                // Get active rules count
                const activeRules = await prisma.rule.count({
                    where: {
                        projectId: project.id,
                        enabled: true,
                    },
                });

                projectStats.push({
                    name: project.name,
                    targetCPA: null,
                    incidentsThisWeek: incidents,
                    openIncidents,
                    activeRules,
                });
            }

            // Send the digest
            await sendWeeklyDigestEmail({
                recipientEmail: user.email,
                recipientName: user.name || "Gebruiker",
                projects: projectStats,
                periodStart: weekAgo,
                periodEnd: now,
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
