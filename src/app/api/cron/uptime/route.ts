import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { performUptimeCheck } from "@/lib/services/domain-checker";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    // Optional: Add basic authorization for the cron caller
    // const authHeader = req.headers.get("authorization");
    // if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }

    try {
        console.log("[CRON] Starting uptime checks");

        // Fetch all active DOMAIN data sources
        const domains = await prisma.dataSource.findMany({
            where: {
                type: "DOMAIN",
                active: true,
            }
        });

        const now = new Date();
        const results = [];

        for (const domain of domains) {
            const config = domain.config as any || {};

            // Skip if uptime monitoring is not enabled
            if (!config.uptime) continue;

            const intervalMinutes = config.uptimeInterval || 1;
            const msSinceLastSync = domain.lastSyncedAt ? now.getTime() - domain.lastSyncedAt.getTime() : Infinity;

            // Check if it's time to scan this domain again
            if (msSinceLastSync >= (intervalMinutes * 60 * 1000) - 5000) { // 5s buffer

                // Execture the centralized check
                const result = await performUptimeCheck(domain.id);

                results.push({
                    domain: domain.externalId,
                    ...result
                });
            }
        }

        console.log(`[CRON] Finished uptime checks. Checked ${results.length} domains.`);
        return NextResponse.json({ success: true, checked: results.length, results });

    } catch (error: any) {
        console.error("[CRON] Uptime check failed:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
