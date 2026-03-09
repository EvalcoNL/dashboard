import { NextRequest, NextResponse } from "next/server";
import { syncAllMerchantSources } from "@/lib/services/merchant-center-sync";
import { rateLimitCron } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/merchant-health
 * 
 * Periodically syncs all active Google Merchant Center sources.
 * Fetches product statuses, stores health snapshots, and creates
 * incidents when new disapprovals are detected.
 * 
 * Protected by CRON_SECRET.
 */
export async function GET(req: NextRequest) {
    // Rate limit: max 2 requests per minute
    const rateLimited = rateLimitCron(req);
    if (rateLimited) return rateLimited;

    // Verify cron secret
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        console.log("[CRON] Starting Merchant Center health sync");

        const results = await syncAllMerchantSources();

        const summary = {
            synced: results.length,
            totalProducts: results.reduce((sum, r) => sum + r.totalProducts, 0),
            totalDisapproved: results.reduce((sum, r) => sum + r.disapprovedProducts, 0),
            newDisapprovals: results.reduce((sum, r) => sum + r.newDisapprovals, 0),
            incidentsCreated: results.filter(r => r.incidentCreated).length,
            incidentsResolved: results.filter(r => r.incidentResolved).length,
            errors: results.filter(r => r.error).map(r => `${r.merchantId}: ${r.error}`),
        };

        console.log(`[CRON] Merchant Center sync complete: ${summary.synced} sources, ${summary.totalDisapproved} disapproved, ${summary.newDisapprovals} new`);

        return NextResponse.json({
            success: true,
            ...summary,
            results,
            timestamp: new Date().toISOString(),
        });
    } catch (error: unknown) {
        console.error("[CRON] Merchant Center sync failed:", error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : "Onbekende fout" },
            { status: 500 }
        );
    }
}
