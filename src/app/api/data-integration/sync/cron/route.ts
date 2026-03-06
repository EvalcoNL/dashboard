// ═══════════════════════════════════════════════════════════════════
// Sync Cron Endpoint — Called periodically to trigger scheduled syncs
// ═══════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { syncScheduler } from '@/lib/data-integration/sync-scheduler';
import { connectionHealthMonitor } from '@/lib/data-integration/connection-health';

/**
 * GET /api/data-integration/sync/cron
 * 
 * Main scheduler tick — call this every 5 minutes via:
 * - External cron (Vercel Cron, GitHub Actions, etc.)
 * - Or internal setInterval in middleware
 * 
 * Protected by CRON_SECRET header.
 */
export async function GET(request: Request) {
    // Verify cron secret via Authorization: Bearer (consistent with uptime cron)
    const authHeader = request.headers.get('authorization');
    const expectedSecret = process.env.CRON_SECRET;

    if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Clean stuck jobs first
        const stuckCleaned = await connectionHealthMonitor.cleanStuckJobs(60);

        // Run the scheduler tick
        const result = await syncScheduler.tick();

        // Get current status
        const status = await syncScheduler.getSchedulerStatus();

        return NextResponse.json({
            success: true,
            tick: result,
            stuckJobsCleaned: stuckCleaned,
            schedulerStatus: status,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Cron sync tick failed:', error);
        return NextResponse.json(
            { success: false, error: 'Sync cron failed' },
            { status: 500 }
        );
    }
}
