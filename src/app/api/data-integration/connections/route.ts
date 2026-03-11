// ═══════════════════════════════════════════════════════════════════
// Connections API — List and configure data source sync settings
// ═══════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-guard';
import { prisma } from '@/lib/db';
import { query as chQuery } from '@/lib/clickhouse';

/**
 * GET /api/data-integration/connections?projectId=xxx
 * List all data sources with sync capabilities and connector metadata.
 */
export async function GET(request: Request) {
    try {
        const [, authError] = await requireAuth();
        if (authError) return authError;

        const { searchParams } = new URL(request.url);
        const projectId = searchParams.get('projectId');
        if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

        const sources = await prisma.dataSource.findMany({
            where: { projectId },
            include: {
                connector: {
                    select: {
                        slug: true,
                        name: true,
                        category: true,
                        dimensions: { select: { id: true, slug: true, name: true, dataType: true, isDefault: true } },
                        metrics: { select: { id: true, slug: true, name: true, dataType: true, aggregationType: true, isDefault: true } },
                    },
                },
                syncAccounts: { select: { id: true, externalId: true, name: true, currency: true, isActive: true } },
            },
            orderBy: { linkedAt: 'asc' },
        });

        // ── Batch: record counts from ClickHouse (one query for all sources) ──
        const allSourceIds = sources.map(s => s.id);
        const merchantSources = sources.filter(s => s.type === 'GOOGLE_MERCHANT');
        const regularSourceIds = allSourceIds.filter(id => !merchantSources.some(m => m.id === id));

        // Batch ClickHouse count per regular source
        const countsBySource = new Map<string, number>();
        if (regularSourceIds.length > 0) {
            try {
                const countPlaceholders = regularSourceIds.map((_, i) => `{sid${i}:String}`).join(', ');
                const countParams: Record<string, string> = {};
                regularSourceIds.forEach((id, i) => { countParams[`sid${i}`] = id; });
                const countRows = await chQuery<{ data_source_id: string; cnt: string }>(
                    `SELECT data_source_id, count() AS cnt FROM metrics_data FINAL WHERE data_source_id IN (${countPlaceholders}) GROUP BY data_source_id`,
                    countParams
                );
                for (const row of countRows) countsBySource.set(row.data_source_id, Number(row.cnt));
            } catch { /* ClickHouse unavailable */ }
        }

        // Batch Merchant Center health
        const merchantHealthBySource = new Map<string, any>();
        if (merchantSources.length > 0) {
            const merchantIds = merchantSources.map(m => m.id);
            try {
                const healthRows = await prisma.merchantCenterHealth.findMany({
                    where: { dataSourceId: { in: merchantIds } },
                    orderBy: { date: 'desc' },
                    select: { dataSourceId: true, date: true, totalItems: true, disapprovedItems: true, disapprovedPct: true, topReasons: true },
                    distinct: ['dataSourceId'],
                });
                for (const h of healthRows) {
                    if (h.dataSourceId) merchantHealthBySource.set(h.dataSourceId, h);
                }
            } catch { /* ignore */ }
        }

        // Batch: recent sync jobs for all sources
        const allRecentJobs = await prisma.syncJob.findMany({
            where: { dataSourceId: { in: allSourceIds } },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                dataSourceId: true,
                status: true,
                syncMode: true,
                level: true,
                recordsFetched: true,
                recordsStored: true,
                recordsNew: true,
                recordsUpdated: true,
                recordsDeleted: true,
                recordsSkipped: true,
                startedAt: true,
                completedAt: true,
                errorMessage: true,
                createdAt: true,
            },
        });

        // Group jobs by source and take top 5 per source
        const jobsBySource = new Map<string, typeof allRecentJobs>();
        for (const job of allRecentJobs) {
            const list = jobsBySource.get(job.dataSourceId) || [];
            if (list.length < 5) list.push(job);
            jobsBySource.set(job.dataSourceId, list);
        }

        const enriched = sources.map((source) => {
            let recordCount = 0;
            let merchantHealth: any = null;

            if (source.type === 'GOOGLE_MERCHANT') {
                merchantHealth = merchantHealthBySource.get(source.id) || null;
                recordCount = merchantHealth?.totalItems || 0;
            } else {
                recordCount = countsBySource.get(source.id) || 0;
            }

            const recentJobs = jobsBySource.get(source.id) || [];

            // Calculate next sync time
            const nextSyncAt = source.lastSyncedAt
                ? new Date(source.lastSyncedAt.getTime() + source.syncInterval * 60 * 1000)
                : null;

            return {
                ...source,
                recordCount,
                merchantHealth,
                recentJobs,
                nextSyncAt: nextSyncAt?.toISOString() || null,
                // Backwards compatibility
                accounts: source.syncAccounts,
                status: source.syncStatus,
                lastSyncAt: source.lastSyncedAt,
                errorMessage: source.syncError,
                selectedDimensions: (source.config as { selectedDimensions?: string[] })?.selectedDimensions || [],
                selectedMetrics: (source.config as { selectedMetrics?: string[] })?.selectedMetrics || [],
            };
        });

        return NextResponse.json({ success: true, connections: enriched });
    } catch (error) {
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}

/**
 * PATCH /api/data-integration/connections
 * Update data source sync config.
 */
export async function PATCH(request: Request) {
    try {
        const [, authError] = await requireAuth();
        if (authError) return authError;

        const { connectionId, selectedDimensions, selectedMetrics, syncInterval, lookbackDays } = await request.json();
        if (!connectionId) return NextResponse.json({ error: 'connectionId required' }, { status: 400 });

        const current = await prisma.dataSource.findUnique({ where: { id: connectionId } });
        if (!current) return NextResponse.json({ error: 'DataSource not found' }, { status: 404 });

        const config = (current.config as Record<string, unknown>) || {};
        if (selectedDimensions) config.selectedDimensions = selectedDimensions;
        if (selectedMetrics) config.selectedMetrics = selectedMetrics;

        await prisma.dataSource.update({
            where: { id: connectionId },
            data: {
                config,
                ...(syncInterval && { syncInterval }),
                ...(lookbackDays && { lookbackDays }),
            },
        });

        return NextResponse.json({ success: true, message: 'Config updated' });
    } catch (error) {
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}
