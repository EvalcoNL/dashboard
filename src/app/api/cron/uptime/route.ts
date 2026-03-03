import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { performUptimeCheck } from "@/lib/services/domain-checker";
import { rateLimitCron } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    // Rate limit: max 2 requests per minute
    const rateLimited = rateLimitCron(req);
    if (rateLimited) return rateLimited;

    // Verify cron secret — mandatory, block if not configured
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        console.log("[CRON] Starting uptime checks");

        // Fetch all active DOMAIN data sources
        const domains = await prisma.dataSource.findMany({
            where: {
                type: { in: ["DOMAIN", "WEBSITE"] },
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
                try {
                    // Execute the centralized check
                    const result = await performUptimeCheck(domain.id);

                    results.push({
                        domain: domain.externalId,
                        ...result
                    });
                } catch (domainError: any) {
                    console.error(`[CRON] Uptime check failed for ${domain.externalId}:`, domainError?.message || domainError);
                    results.push({
                        domain: domain.externalId,
                        status: "ERROR",
                        error: domainError?.message || "Unknown error"
                    });
                }
            }
        }

        console.log(`[CRON] Finished uptime checks. Checked ${results.length} domains.`);
        return NextResponse.json({ success: true, checked: results.length, results });

    } catch (error: any) {
        console.error("[CRON] Uptime check failed:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
