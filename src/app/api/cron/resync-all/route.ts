// ═══════════════════════════════════════════════════════════════════
// Resync All Data Sources — Cron/Admin endpoint
//
// Enqueues a FULL sync for every active, connected data source.
// Useful after ClickHouse data loss / volume reset.
//
// Usage:  POST /api/cron/resync-all
// Header: x-cron-secret: <CRON_SECRET>
// ═══════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { addBulkSyncJobs, isQueueAvailable, type SyncJobPayload } from '@/lib/data-integration/sync-queue';
import { syncEngine } from '@/lib/data-integration/sync-engine';

export async function POST(request: Request) {
    try {
        // Auth: require CRON_SECRET
        const cronSecret = request.headers.get('x-cron-secret');
        if (!process.env.CRON_SECRET || cronSecret !== process.env.CRON_SECRET) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Find all active data sources that have a connector linked
        const sources = await prisma.dataSource.findMany({
            where: {
                connectorId: { not: null },
                syncStatus: { in: ['ACTIVE', 'ERROR'] },
            },
            include: {
                connector: { select: { slug: true } },
                project: { select: { name: true } },
            },
            orderBy: { createdAt: 'asc' },
        });

        if (sources.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No active data sources found',
                enqueued: 0,
            });
        }

        // Reset any ERROR status back to ACTIVE so they can sync
        const errorSources = sources.filter(s => s.syncStatus === 'ERROR');
        if (errorSources.length > 0) {
            await prisma.dataSource.updateMany({
                where: { id: { in: errorSources.map(s => s.id) } },
                data: { syncStatus: 'ACTIVE', syncError: null },
            });
        }

        const useQueue = await isQueueAvailable();
        const results: { id: string; project: string; connector: string; status: string }[] = [];

        if (useQueue) {
            // ─── Queue mode: enqueue all as FULL syncs ───
            const payloads: SyncJobPayload[] = sources.map(source => ({
                dataSourceId: source.id,
                mode: 'FULL' as const,
                priority: 5,
            }));

            const jobIds = await addBulkSyncJobs(payloads);

            sources.forEach((source, i) => {
                results.push({
                    id: source.id,
                    project: source.project?.name || 'Unknown',
                    connector: source.connector?.slug || 'unknown',
                    status: `queued (${jobIds[i]})`,
                });
            });

            console.log(`[resync-all] Enqueued ${jobIds.length} FULL sync jobs via queue`);
        } else {
            // ─── Fallback: sequential direct execution ───
            console.log(`[resync-all] Redis unavailable — running ${sources.length} syncs directly`);

            for (const source of sources) {
                try {
                    await syncEngine.syncDataSource({
                        dataSourceId: source.id,
                        mode: 'FULL',
                        force: true,
                    });
                    results.push({
                        id: source.id,
                        project: source.project?.name || 'Unknown',
                        connector: source.connector?.slug || 'unknown',
                        status: 'completed',
                    });
                } catch (error) {
                    results.push({
                        id: source.id,
                        project: source.project?.name || 'Unknown',
                        connector: source.connector?.slug || 'unknown',
                        status: `failed: ${error instanceof Error ? error.message : 'unknown'}`,
                    });
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: `Enqueued FULL resync for ${results.length} data sources`,
            mode: useQueue ? 'queue' : 'direct',
            enqueued: results.length,
            resetFromError: errorSources.length,
            sources: results,
        });
    } catch (error) {
        console.error('[resync-all] Error:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Failed' },
            { status: 500 }
        );
    }
}
