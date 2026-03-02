// ═══════════════════════════════════════════════════════════════════
// Connection Health API — Health monitoring for data connections
// ═══════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-guard';
import { connectionHealthMonitor } from '@/lib/data-integration/connection-health';

/**
 * GET /api/data-integration/health?clientId=xxx
 * 
 * Get health status for all connections of a client.
 * Optional: connectionId for single connection detail.
 */
export async function GET(request: Request) {
    try {
        const [, authError] = await requireAuth();
        if (authError) return authError;

        const { searchParams } = new URL(request.url);
        const clientId = searchParams.get('clientId');
        const connectionId = searchParams.get('connectionId');

        if (connectionId) {
            const health = await connectionHealthMonitor.getConnectionHealth(connectionId);
            if (!health) {
                return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
            }

            const history = await connectionHealthMonitor.getSyncHistory(connectionId, 30);
            return NextResponse.json({ success: true, health, history });
        }

        if (clientId) {
            const summary = await connectionHealthMonitor.getClientHealth(clientId);
            return NextResponse.json({ success: true, summary });
        }

        return NextResponse.json({ error: 'clientId or connectionId required' }, { status: 400 });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Failed' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/data-integration/health
 * 
 * Maintenance actions: cleanup old data, fix stuck jobs.
 * Body: { action: 'cleanup' | 'fix_stuck_jobs', retentionDays?: number }
 */
export async function POST(request: Request) {
    try {
        const [, authError] = await requireAuth();
        if (authError) return authError;

        const body = await request.json();
        const { action, retentionDays } = body;

        switch (action) {
            case 'cleanup': {
                const result = await connectionHealthMonitor.cleanup(retentionDays || 90);
                return NextResponse.json({ success: true, ...result });
            }

            case 'fix_stuck_jobs': {
                const fixed = await connectionHealthMonitor.cleanStuckJobs(60);
                return NextResponse.json({ success: true, fixedJobs: fixed });
            }

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
