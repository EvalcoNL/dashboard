// ═══════════════════════════════════════════════════════════════════
// Datasets API — List and create datasets
// ═══════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-guard';
import { prisma } from '@/lib/db';
import { query as chQuery } from '@/lib/clickhouse';

/**
 * GET /api/data-integration/datasets?projectId=xxx
 * List all datasets with source data sources and field info.
 */
export async function GET(request: Request) {
    try {
        const [, authError] = await requireAuth();
        if (authError) return authError;

        const { searchParams } = new URL(request.url);
        const projectId = searchParams.get('projectId');
        if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

        const datasets = await prisma.dataset.findMany({
            where: { projectId },
            include: {
                sources: {
                    select: {
                        id: true,
                        dataSourceId: true,
                        level: true,
                    },
                },
            },
            orderBy: { createdAt: 'asc' },
        });

        const enriched = await Promise.all(datasets.map(async (ds) => {
            const sourceIds = ds.sources.map(s => s.dataSourceId);

            const dataSources = sourceIds.length > 0
                ? await prisma.dataSource.findMany({
                    where: { id: { in: sourceIds } },
                    include: { connector: { select: { slug: true, name: true } } },
                })
                : [];

            let recordCount = 0;
            if (sourceIds.length > 0) {
                try {
                    const placeholders = sourceIds.map((_, i) => `{id${i}:String}`).join(', ');
                    const params: Record<string, string> = {};
                    sourceIds.forEach((id, i) => { params[`id${i}`] = id; });
                    const result = await chQuery<{ cnt: string }>(
                        `SELECT count() AS cnt FROM metrics_data FINAL WHERE data_source_id IN (${placeholders})`,
                        params
                    );
                    recordCount = Number(result[0]?.cnt || 0);
                } catch {
                    recordCount = 0;
                }
            }

            const config = ds.config as { selectedDimensions?: string[]; selectedMetrics?: string[] } | null;

            return {
                ...ds,
                connections: dataSources.map(s => ({
                    id: s.id,
                    name: s.name,
                    connectorSlug: s.connector?.slug || s.type,
                    connectorName: s.connector?.name || s.type,
                })),
                recordCount,
                dimensionCount: config?.selectedDimensions?.length || 0,
                metricCount: config?.selectedMetrics?.length || 0,
            };
        }));

        return NextResponse.json({ success: true, datasets: enriched, total: enriched.length });
    } catch (error) {
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}

/**
 * POST /api/data-integration/datasets
 * Create system datasets for a client.
 */
export async function POST(request: Request) {
    try {
        const [, authError] = await requireAuth();
        if (authError) return authError;

        const { projectId } = await request.json();
        if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

        const sources = await prisma.dataSource.findMany({
            where: { projectId, syncStatus: 'ACTIVE' },
            include: { connector: true },
        });

        if (sources.length === 0) {
            return NextResponse.json({ error: 'No active data sources found.' }, { status: 400 });
        }

        const systemDatasets = [
            {
                slug: 'paid-performance',
                name: 'Paid Advertising Performance',
                description: 'Cross-platform paid advertising metrics',
                categories: ['PAID_SEARCH', 'PAID_SOCIAL'],
                dimensions: ['date', 'campaign_name', 'campaign_type', 'device', 'country'],
                metrics: ['impressions', 'clicks', 'cost', 'conversions', 'conversion_value'],
            },
            {
                slug: 'cross-channel',
                name: 'Cross-Channel Overview',
                description: 'Unified view across all connected platforms',
                categories: null,
                dimensions: ['date', 'campaign_name'],
                metrics: ['impressions', 'clicks', 'cost', 'conversions', 'conversion_value'],
            },
        ];

        const created: string[] = [];

        for (const def of systemDatasets) {
            const existing = await prisma.dataset.findUnique({
                where: { projectId_slug: { projectId, slug: def.slug } },
            });
            if (existing) continue;

            const matchingSources = def.categories
                ? sources.filter(s => s.connector && def.categories!.includes(s.connector.category))
                : sources;

            if (matchingSources.length === 0) continue;

            const dataset = await prisma.dataset.create({
                data: {
                    projectId,
                    slug: def.slug,
                    name: def.name,
                    description: def.description,
                    isSystem: true,
                    config: {
                        selectedDimensions: def.dimensions,
                        selectedMetrics: def.metrics,
                    },
                },
            });

            for (const source of matchingSources) {
                await prisma.datasetSource.create({
                    data: {
                        datasetId: dataset.id,
                        dataSourceId: source.id,
                        level: 'campaign',
                    },
                });
            }

            created.push(def.slug);
        }

        return NextResponse.json({
            success: true,
            created,
            message: created.length > 0 ? `Created ${created.length} system datasets` : 'All system datasets already exist',
        });
    } catch (error) {
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}
