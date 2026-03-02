// ═══════════════════════════════════════════════════════════════════
// Sync Management API — Manual sync triggers and job management
//
// Now queue-aware: enqueues jobs to BullMQ when Redis is available,
// falls back to direct execution otherwise.
// ═══════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-guard';
import { syncScheduler } from '@/lib/data-integration/sync-scheduler';
import { syncEngine } from '@/lib/data-integration/sync-engine';
import { prisma } from '@/lib/db';

/**
 * POST /api/data-integration/sync
 * 
 * Trigger a manual sync for a connection.
 * Body: { connectionId, mode?: 'INCREMENTAL'|'FULL'|'DELTA', level?, dateFrom?, dateTo? }
 */
export async function POST(request: Request) {
    try {
        const [, authError] = await requireAuth();
        if (authError) return authError;

        const body = await request.json();
        const { connectionId, mode, level, dateFrom, dateTo } = body;

        if (!connectionId) {
            return NextResponse.json({ error: 'connectionId is required' }, { status: 400 });
        }

        // Validate mode if provided
        const validModes = ['INCREMENTAL', 'FULL', 'DELTA'];
        if (mode && !validModes.includes(mode)) {
            return NextResponse.json({ error: `Invalid mode: ${mode}. Must be one of: ${validModes.join(', ')}` }, { status: 400 });
        }

        // If date range provided, treat as backfill
        if (dateFrom && dateTo) {
            const result = await syncScheduler.scheduleBackfill(
                connectionId,
                new Date(dateFrom),
                new Date(dateTo),
                level,
                mode || 'FULL'
            );
            return NextResponse.json({ success: true, type: 'backfill', ...result });
        }

        // Otherwise, immediate sync with specified mode
        const result = await syncScheduler.scheduleNow(connectionId, mode || 'INCREMENTAL');
        return NextResponse.json({ success: true, type: 'immediate', ...result });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Sync failed' },
            { status: 500 }
        );
    }
}

/**
 * GET /api/data-integration/sync?connectionId=xxx
 * 
 * Get recent sync jobs for a connection.
 */
export async function GET(request: Request) {
    try {
        const [, authError] = await requireAuth();
        if (authError) return authError;

        const { searchParams } = new URL(request.url);
        const connectionId = searchParams.get('connectionId');
        const jobId = searchParams.get('jobId');

        if (jobId) {
            const job = await syncEngine.getJobStatus(jobId);
            return NextResponse.json({ success: true, job });
        }

        if (connectionId) {
            const jobs = await syncEngine.getRecentJobs(connectionId, 20);
            return NextResponse.json({ success: true, jobs });
        }

        // Return scheduler status (now includes queue health)
        const status = await syncScheduler.getSchedulerStatus();
        return NextResponse.json({ success: true, status });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Failed' },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/data-integration/sync
 * 
 * Update connection sync settings (pause/resume/interval).
 * Body: { connectionId, action: 'pause' | 'resume' | 'update_interval', interval?: number }
 */
export async function PATCH(request: Request) {
    try {
        const [, authError] = await requireAuth();
        if (authError) return authError;

        const body = await request.json();
        const { connectionId, action, interval } = body;

        if (!connectionId || !action) {
            return NextResponse.json({ error: 'connectionId and action required' }, { status: 400 });
        }

        switch (action) {
            case 'pause':
                await syncScheduler.pauseConnection(connectionId);
                return NextResponse.json({ success: true, message: 'Connection paused' });

            case 'resume':
                await syncScheduler.resumeConnection(connectionId);
                return NextResponse.json({ success: true, message: 'Connection resumed' });

            case 'update_interval':
                if (!interval) {
                    return NextResponse.json({ error: 'interval required for update_interval' }, { status: 400 });
                }
                await syncScheduler.updateInterval(connectionId, interval);
                return NextResponse.json({ success: true, message: `Interval updated to ${interval} minutes` });

            case 'update_lookback':
                const { lookbackDays } = body;
                if (!lookbackDays) {
                    return NextResponse.json({ error: 'lookbackDays required' }, { status: 400 });
                }
                await prisma.dataSource.update({
                    where: { id: connectionId },
                    data: { lookbackDays },
                });
                return NextResponse.json({ success: true, message: `Lookback updated to ${lookbackDays} days` });

            default:
                return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
        }
    } catch (error) {
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Failed' },
            { status: 500 }
        );
    }
}
