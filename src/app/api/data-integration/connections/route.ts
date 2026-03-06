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

        const enriched = await Promise.all(sources.map(async (source) => {
            // Count records — different strategy for Merchant Center vs other sources
            let recordCount = 0;
            let merchantHealth: any = null;

            if (source.type === 'GOOGLE_MERCHANT') {
                // MC data lives in merchant_center_health, not ClickHouse
                // Show product count from latest snapshot, not number of snapshots
                try {
                    merchantHealth = await (prisma as any).merchantCenterHealth.findFirst({
                        where: { dataSourceId: source.id },
                        orderBy: { date: 'desc' },
                        select: {
                            date: true,
                            totalItems: true,
                            disapprovedItems: true,
                            disapprovedPct: true,
                            topReasons: true,
                        },
                    });
                    recordCount = merchantHealth?.totalItems || 0;
                } catch {
                    recordCount = 0;
                }
            } else {
                // Standard sources: count from ClickHouse
                try {
                    const result = await chQuery<{ cnt: string }>(
                        `SELECT count() AS cnt FROM metrics_data FINAL WHERE data_source_id = {dsId:String}`,
                        { dsId: source.id }
                    );
                    recordCount = Number(result[0]?.cnt || 0);
                } catch {
                    recordCount = 0;
                }
            }

            const recentJobs = await prisma.syncJob.findMany({
                where: { dataSourceId: source.id },
                orderBy: { createdAt: 'desc' },
                take: 5,
                select: {
                    id: true,
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
        }));

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
