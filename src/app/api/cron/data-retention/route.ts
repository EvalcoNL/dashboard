// ═══════════════════════════════════════════════════════════════════
// Data Retention Cron — Clean up old log/check records
// Prevents unbounded growth of SyncLog, SyncJob, UptimeCheck,
// AuditLog, and PromptLog tables.
// ═══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// Retention periods in days
const RETENTION = {
    syncLog: 30,
    syncJob: 90,       // Only COMPLETED or FAILED
    uptimeCheck: 90,
    auditLog: 365,
    promptLog: 90,
} as const;

function daysAgo(days: number): Date {
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

/**
 * POST /api/cron/data-retention
 * Delete old records from log/check tables to keep the SQLite database lean.
 * Should be called daily by a cron scheduler.
 */
export async function POST(request: NextRequest) {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const results: Record<string, number> = {};

    // 1. SyncLog — oldest first, 30 days
    const syncLogResult = await prisma.syncLog.deleteMany({
        where: { createdAt: { lt: daysAgo(RETENTION.syncLog) } },
    });
    results.syncLogs = syncLogResult.count;

    // 2. SyncJob — completed/failed only, 90 days
    const syncJobResult = await prisma.syncJob.deleteMany({
        where: {
            status: { in: ["COMPLETED", "FAILED", "CANCELLED"] },
            createdAt: { lt: daysAgo(RETENTION.syncJob) },
        },
    });
    results.syncJobs = syncJobResult.count;

    // 3. UptimeCheck — 90 days
    const uptimeResult = await prisma.uptimeCheck.deleteMany({
        where: { checkedAt: { lt: daysAgo(RETENTION.uptimeCheck) } },
    });
    results.uptimeChecks = uptimeResult.count;

    // 4. AuditLog — 365 days
    const auditResult = await prisma.auditLog.deleteMany({
        where: { createdAt: { lt: daysAgo(RETENTION.auditLog) } },
    });
    results.auditLogs = auditResult.count;

    // 5. PromptLog — 90 days
    const promptResult = await prisma.promptLog.deleteMany({
        where: { createdAt: { lt: daysAgo(RETENTION.promptLog) } },
    });
    results.promptLogs = promptResult.count;

    const totalDeleted = Object.values(results).reduce((a, b) => a + b, 0);

    console.log(`[DataRetention] Cleaned up ${totalDeleted} records:`, results);

    return NextResponse.json({
        success: true,
        totalDeleted,
        details: results,
    });
}
