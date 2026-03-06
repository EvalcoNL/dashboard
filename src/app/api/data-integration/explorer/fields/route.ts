// ═══════════════════════════════════════════════════════════════════
// Explorer Fields API — Optimized field discovery
// Uses field-registry as single source of truth, minimizes DB calls
// ═══════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-guard';
import { prisma } from '@/lib/db';
import { query as chQuery } from '@/lib/clickhouse';
import {
    getBuiltinDimensions, getFieldMeta, getColumnName,
    getAllDimensionSlugs, getAllMetricSlugs, getDerivedMetricSlugs,
    getField, DIMENSION_METADATA, METRIC_METADATA,
} from '@/lib/data-integration/field-registry';

// Connector slug → display name mapping
const CONNECTOR_NAMES: Record<string, string> = {
    'google-ads': 'Google Ads',
    'meta-ads': 'Meta Ads',
    'ga4': 'Google Analytics',
    'google-analytics': 'Google Analytics',
    'linkedin-ads': 'LinkedIn Ads',
    'tiktok-ads': 'TikTok Ads',
    'microsoft-ads': 'Microsoft Advertising',
};

// GA4-specific field slugs (for connector assignment)
const GA4_FIELDS = new Set([
    'page_path', 'page_title', 'landing_page', 'session_source', 'session_medium',
    'session_campaign_name', 'device_category', 'browser',
    'sessions', 'total_users', 'active_users', 'new_users',
    'screen_page_views', 'bounce_rate', 'average_session_duration', 'event_count',
]);

// ─── Cache for data presence check (5 min TTL) ───
const DATA_PRESENCE_CACHE = new Map<string, { data: Set<string>; expiry: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * GET /api/data-integration/explorer/fields?projectId=xxx
 *
 * Optimized: single DESCRIBE TABLE call, no dynamic imports,
 * all DB queries parallelized.
 */
export async function GET(request: Request) {
    try {
        const [, authError] = await requireAuth();
        if (authError) return authError;

        const { searchParams } = new URL(request.url);
        const projectId = searchParams.get('projectId');

        if (!projectId) {
            return NextResponse.json({ error: 'projectId required' }, { status: 400 });
        }

        // ─── Run all queries in parallel ───

        const [sources, dbDimensions, tableColumns] = await Promise.all([
            // 1. Active data sources
            prisma.dataSource.findMany({
                where: { projectId, active: true },
                select: {
                    id: true,
                    connector: { select: { slug: true, name: true } },
                },
            }),
            // 2. Custom dimensions from DB
            prisma.dimensionDefinition.findMany({
                select: { slug: true, name: true, dataType: true, description: true },
            }).catch(() => []),
            // 3. Single DESCRIBE TABLE — replaces two separate calls
            chQuery<{ name: string; type: string }>('DESCRIBE TABLE metrics_data').catch(() => []),
        ]);

        const connectionIds = sources.map(s => s.id);

        if (connectionIds.length === 0) {
            return NextResponse.json({
                success: true,
                dimensions: [],
                metrics: [],
                connectors: [],
            });
        }

        // Build connector lookup
        const activeConnectors = new Map<string, string>();
        for (const s of sources) {
            if (s.connector) {
                const slug = s.connector.slug;
                activeConnectors.set(slug, CONNECTOR_NAMES[slug] || s.connector.name || slug);
            }
        }

        // Build set of existing ClickHouse columns and their types
        const existingColumns = new Set(tableColumns.map(c => c.name));
        const columnTypes = new Map(tableColumns.map(c => [c.name, c.type]));

        // ─── Check actual data presence per column ───
        // Build a single query that checks which columns have non-empty data
        // for this project's data sources
        const knownDimSlugs = getAllDimensionSlugs();
        const knownMetricSlugs = getAllMetricSlugs();

        // Collect all column names that exist in the table
        const dimColumnsToCheck: { slug: string; colName: string }[] = [];
        for (const slug of knownDimSlugs) {
            const colName = getColumnName(slug);
            if (existingColumns.has(colName) || existingColumns.has(slug)) {
                dimColumnsToCheck.push({ slug, colName: existingColumns.has(colName) ? colName : slug });
            }
        }

        const metricColumnsToCheck: { slug: string; colName: string }[] = [];
        for (const slug of knownMetricSlugs) {
            const colName = getColumnName(slug);
            if (existingColumns.has(colName) || existingColumns.has(slug)) {
                metricColumnsToCheck.push({ slug, colName: existingColumns.has(colName) ? colName : slug });
            }
        }

        // Build a single efficient query: one countIf per column
        // Uses in-memory cache to avoid re-querying on every field picker open
        const allColumnsToCheck = [...dimColumnsToCheck, ...metricColumnsToCheck];
        const columnsWithData = new Set<string>();
        const cacheKey = connectionIds.sort().join(',');

        if (allColumnsToCheck.length > 0 && connectionIds.length > 0) {
            // Check cache first
            const cached = DATA_PRESENCE_CACHE.get(cacheKey);
            if (cached && cached.expiry > Date.now()) {
                // Cache hit — use cached data
                for (const slug of cached.data) columnsWithData.add(slug);
            } else {
                // Cache miss — run ClickHouse query
                const placeholders = connectionIds.map((_, i) => `{id${i}:String}`).join(', ');
                const params: Record<string, string> = {};
                connectionIds.forEach((id, i) => { params[`id${i}`] = id; });

                // For string columns: check != ''
                // For numeric columns: check != 0
                // For date columns: check IS NOT NULL
                const selectParts = allColumnsToCheck.map(({ slug, colName }) => {
                    const chType = columnTypes.get(colName) || '';
                    const isNumeric = /Int|Float|Decimal|UInt/.test(chType);
                    const isDate = /Date/.test(chType);
                    if (isNumeric) {
                        return `countIf(${colName} != 0) > 0 as has_${slug}`;
                    }
                    if (isDate) {
                        return `countIf(${colName} IS NOT NULL) > 0 as has_${slug}`;
                    }
                    return `countIf(${colName} != '' AND ${colName} IS NOT NULL) > 0 as has_${slug}`;
                });

                try {
                    const result = await chQuery<Record<string, number | boolean>>(`
                        SELECT ${selectParts.join(',\n                           ')}
                        FROM metrics_data FINAL
                        WHERE data_source_id IN (${placeholders})
                    `, params);

                    if (result.length > 0) {
                        const row = result[0];
                        for (const { slug } of allColumnsToCheck) {
                            const val = row[`has_${slug}`];
                            if (val === 1 || val === true || String(val) === '1') {
                                columnsWithData.add(slug);
                            }
                        }
                    }
                    // Store in cache
                    DATA_PRESENCE_CACHE.set(cacheKey, { data: new Set(columnsWithData), expiry: Date.now() + CACHE_TTL_MS });
                } catch (e) {
                    // Fallback: mark all existing columns as having data
                    console.error('Data presence check failed, falling back:', e);
                    for (const { slug } of allColumnsToCheck) columnsWithData.add(slug);
                }
            }
        }

        // ─── Build dimension and metric sets ───

        const dimsWithData = new Set<string>();
        dimsWithData.add('date'); // always available

        for (const { slug } of dimColumnsToCheck) {
            if (columnsWithData.has(slug)) dimsWithData.add(slug);
        }

        // Custom dimensions from DB
        for (const dim of dbDimensions) {
            if (columnsWithData.has(dim.slug) || existingColumns.has(dim.slug)) {
                dimsWithData.add(dim.slug);
            }
            // Register custom metadata for this request
            if (!DIMENSION_METADATA[dim.slug] && !METRIC_METADATA[dim.slug]) {
                (DIMENSION_METADATA as Record<string, { name: string; category: string; dataType: string; description?: string }>)[dim.slug] = {
                    name: dim.name,
                    category: 'Custom',
                    dataType: dim.dataType || 'STRING',
                    description: dim.description || undefined,
                };
            }
        }

        // ─── Discover available metrics ───

        const metricsWithData = new Set<string>();

        for (const { slug } of metricColumnsToCheck) {
            if (columnsWithData.has(slug)) metricsWithData.add(slug);
        }

        // Add derived metrics whose inputs are available
        const derivedSlugs = getDerivedMetricSlugs();
        for (const slug of derivedSlugs) {
            const def = getField(slug);
            if (!def?.formula) continue;
            const inputFields = def.formula.match(/[a-z_]+/g) || [];
            const uniqueInputs = [...new Set(inputFields.filter(f => f !== 'undefined'))];
            if (uniqueInputs.length > 0 && uniqueInputs.every(input => metricsWithData.has(input))) {
                metricsWithData.add(slug);
            }
        }

        // ─── Assign connector to each field ───

        const assignConnector = (slug: string): { connectorSlug: string; connectorName: string } => {
            const meta = getFieldMeta(slug);
            if (!meta) return { connectorSlug: 'overig', connectorName: 'Overig' };

            if (meta.category === 'Berekend') {
                return { connectorSlug: 'calculated', connectorName: 'Berekend' };
            }
            if (meta.category === 'Custom') {
                return { connectorSlug: 'custom', connectorName: 'Custom' };
            }
            if (GA4_FIELDS.has(slug) && activeConnectors.has('ga4')) {
                return { connectorSlug: 'ga4', connectorName: activeConnectors.get('ga4')! };
            }
            for (const c of ['google-ads', 'meta-ads', 'linkedin-ads', 'microsoft-ads', 'tiktok-ads']) {
                if (activeConnectors.has(c)) {
                    return { connectorSlug: c, connectorName: activeConnectors.get(c)! };
                }
            }
            const [firstSlug, firstName] = activeConnectors.entries().next().value || ['overig', 'Overig'];
            return { connectorSlug: firstSlug, connectorName: firstName };
        };

        // ─── Build dimension field definitions ───

        const allDimensionSlugs = new Set([...knownDimSlugs, ...dbDimensions.map(d => d.slug)]);

        const dimensions = Array.from(allDimensionSlugs)
            .filter(slug => {
                if (slug === 'date') return false; // handled by built-in
                // Include all fields that have a column in ClickHouse (both with and without data)
                const colName = getColumnName(slug);
                if (existingColumns.has(colName) || existingColumns.has(slug)) return true;
                if (dimsWithData.has(slug)) return true;
                const meta = getFieldMeta(slug);
                if (meta?.category === 'Custom') return true;
                return false;
            })
            .map(slug => {
                const meta = getFieldMeta(slug) || { name: slug, category: 'Overig', dataType: 'STRING' };
                return {
                    slug,
                    type: 'dimension' as const,
                    ...meta,
                    ...assignConnector(slug),
                    hasData: dimsWithData.has(slug),
                };
            });

        // ─── Build metric field definitions ───

        // Include all metric columns in schema + derived metrics (with correct hasData)
        const allMetricSlugs = new Set<string>();
        for (const { slug } of metricColumnsToCheck) allMetricSlugs.add(slug);
        for (const slug of metricsWithData) allMetricSlugs.add(slug); // includes derived

        const metrics = Array.from(allMetricSlugs).map(slug => ({
            slug,
            type: 'metric' as const,
            ...(METRIC_METADATA[slug] || { name: slug, category: 'Overig', dataType: 'NUMBER' }),
            ...assignConnector(slug),
            hasData: metricsWithData.has(slug),
        }));

        // ─── Built-in dimensions ───

        const builtinDimensions = [
            // Date is always available and shown as a system dimension
            {
                slug: 'date',
                type: 'dimension' as const,
                name: 'Datum',
                category: 'Systeem',
                dataType: 'DATE',
                description: 'De datum waarop de prestaties zijn gemeten',
                connectorSlug: 'system',
                connectorName: 'Systeem',
                hasData: true,
            },
            ...getBuiltinDimensions()
                .map(d => ({
                    slug: d.slug,
                    type: 'dimension' as const,
                    name: d.nameNl,
                    category: 'Systeem',
                    dataType: d.dataType,
                    description: d.description || '',
                    connectorSlug: 'system',
                    connectorName: 'Systeem',
                    hasData: true,
                })),
        ];

        // ─── Connector summary ───

        const connectorList = Array.from(activeConnectors.entries()).map(([slug, name]) => ({
            slug,
            name,
        }));

        return NextResponse.json({
            success: true,
            dimensions: [...dimensions, ...builtinDimensions],
            metrics,
            connectors: [
                ...connectorList,
                { slug: 'custom', name: 'Custom' },
                { slug: 'system', name: 'Systeem' },
            ],
        });
    } catch (error) {
        console.error('Explorer fields error:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Failed' },
            { status: 500 }
        );
    }
}
