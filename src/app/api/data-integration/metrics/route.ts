// ═══════════════════════════════════════════════════════════════════
// Metrics API — CRUD for MetricDefinition + DerivedMetricDefinition
// Enhanced: auto-discovers metrics from normalized data, uses central metadata
// ═══════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-guard';
import { prisma } from '@/lib/db';
import { query as chQuery } from '@/lib/clickhouse';
import {
    METRIC_METADATA,
    getAllMetricSlugs,
} from '@/lib/data-integration/field-registry';
type FieldMeta = { name: string; category: string; dataType: string; description?: string; aggregationType?: string };

// ─── Derived (calculated) metrics – always shown as built-in ───

const DERIVED_METRICS = [
    { slug: 'ctr', name: 'CTR (%)', formula: '(clicks / impressions) * 100', outputType: 'PERCENTAGE', description: 'Click-through rate' },
    { slug: 'cpc', name: 'CPC', formula: 'cost / clicks', outputType: 'CURRENCY', description: 'Kosten per klik' },
    { slug: 'cpm', name: 'CPM', formula: '(cost / impressions) * 1000', outputType: 'CURRENCY', description: 'Kosten per 1.000 impressies' },
    { slug: 'roas', name: 'ROAS', formula: 'conversion_value / cost', outputType: 'NUMBER', description: 'Return on ad spend' },
    { slug: 'conversion_rate', name: 'Conversiepercentage (%)', formula: '(conversions / clicks) * 100', outputType: 'PERCENTAGE', description: 'Conversieratio' },
    { slug: 'cost_per_conversion', name: 'Kosten per Conversie', formula: 'cost / conversions', outputType: 'CURRENCY', description: 'Gemiddelde kosten per conversie' },
    { slug: 'conv_value_per_cost', name: 'Conv. Waarde / Kosten', formula: 'conversion_value / cost', outputType: 'NUMBER', description: 'Conversiewaarde gedeeld door kosten' },
];

// ─── Built-in metrics (always available) ───

const BUILTIN_METRICS = [
    {
        slug: 'row_count',
        name: 'Rij Aantal',
        dataType: 'NUMBER',
        aggregationType: 'COUNT',
        description: 'Aantal rauwe datarijen verwerkt (telling per groep)',
    },
];

/**
 * GET /api/data-integration/metrics
 * Returns metrics in three groups: imported, custom, builtin.
 * Auto-discovers from ClickHouse data.
 */
export async function GET() {
    try {
        const [, authError] = await requireAuth();
        if (authError) return authError;

        // 1. Fetch DB-defined metrics
        const [dbBaseMetrics, dbDerivedMetrics] = await Promise.all([
            prisma.metricDefinition.findMany({
                include: { connector: { select: { slug: true, name: true } } },
                orderBy: [{ connectorId: 'asc' }, { slug: 'asc' }],
            }),
            prisma.derivedMetricDefinition.findMany({
                include: { connector: { select: { slug: true, name: true } } },
                orderBy: { slug: 'asc' },
            }),
        ]);

        // 2. Auto-discover metrics from ClickHouse — show all that exist as columns
        const allMetricSlugs = getAllMetricSlugs();
        const metToConnector = new Map<string, string>();

        try {
            // Get all columns that exist in the metrics_data table
            const tableColumns = await chQuery<{ name: string; type: string }>(`DESCRIBE TABLE metrics_data`);
            const existingColumns = new Set(tableColumns.map(c => c.name));
            const columnTypes = new Map(tableColumns.map(c => [c.name, c.type]));

            // Find the primary connector (most rows)
            let primaryConnector = '';
            try {
                const connResult = await chQuery<{ connector_slug: string }>(`
                    SELECT connector_slug FROM metrics_data FINAL LIMIT 1
                `);
                if (connResult.length > 0) primaryConnector = connResult[0].connector_slug;
            } catch { /* ignore */ }

            // Batch check: find all metric columns with data in a single query
            const metricCols = [...allMetricSlugs].filter(slug => existingColumns.has(slug));
            if (metricCols.length > 0) {
                const selectParts = metricCols.map(slug => {
                    const chType = columnTypes.get(slug) || '';
                    const isNumeric = /Int|Float|Decimal|UInt/.test(chType);
                    if (isNumeric) {
                        return `countIf(${slug} != 0) > 0 as has_${slug}`;
                    }
                    return `countIf(${slug} != '' AND ${slug} IS NOT NULL) > 0 as has_${slug}`;
                });

                try {
                    const result = await chQuery<Record<string, number | boolean>>(`
                        SELECT ${selectParts.join(',\n                               ')}
                        FROM metrics_data FINAL
                    `);

                    if (result.length > 0) {
                        const row = result[0];
                        for (const slug of metricCols) {
                            const val = row[`has_${slug}`];
                            if (val === 1 || val === true || String(val) === '1') {
                                metToConnector.set(slug, primaryConnector);
                            }
                        }
                    }
                } catch {
                    // Fallback: mark all existing columns as having data
                    for (const slug of metricCols) {
                        metToConnector.set(slug, primaryConnector);
                    }
                }
            }
        } catch {
            // ClickHouse not available
        }

        // 3. Map connector slugs to connector definitions
        const connectors = await prisma.connectorDefinition.findMany({
            select: { id: true, slug: true, name: true },
        });
        const connectorBySlug = new Map(connectors.map(c => [c.slug, c]));
        const connectorById = new Map(connectors.map(c => [c.id, c]));

        // 4. Categorize: custom vs imported
        const customMetrics: any[] = [];
        const importedMetrics: any[] = [];

        // DB metrics that are NOT auto-discovered → custom
        for (const m of dbBaseMetrics) {
            if (m.id.startsWith('auto-')) continue; // skip auto-generated
            if (!m.isDefault) {
                customMetrics.push({
                    ...m,
                    source: 'custom',
                    description: m.description || METRIC_METADATA[m.slug]?.description || null,
                });
            }
        }

        // Auto-discovered from ClickHouse → imported
        for (const [slug, connSlug] of metToConnector.entries()) {
            const meta = METRIC_METADATA[slug] || { name: formatSlug(slug), category: 'Overig', dataType: 'NUMBER' };
            const conn = connectorBySlug.get(connSlug) || null;
            importedMetrics.push({
                id: `auto-${slug}`,
                slug,
                name: meta.name,
                dataType: meta.dataType,
                aggregationType: (meta as FieldMeta).aggregationType || 'SUM',
                description: meta.description || null,
                category: meta.category,
                canonicalName: slug,
                isDefault: true,
                connectorId: conn?.id || null,
                connector: conn ? { slug: conn.slug, name: conn.name } : null,
                source: 'imported',
            });
        }

        // Sort imported alphabetically by name
        importedMetrics.sort((a, b) => a.name.localeCompare(b.name));

        // 5. Built-in metrics (row_count + derived formulas)
        const builtinMetrics = BUILTIN_METRICS.map(m => ({
            id: `builtin-${m.slug}`,
            slug: m.slug,
            name: m.name,
            dataType: m.dataType,
            aggregationType: m.aggregationType,
            description: m.description,
            category: 'Systeem',
            isDefault: true,
            connectorId: null,
            connector: null,
            source: 'builtin',
        }));

        // 6. Derived metrics — standard formulas as custom templates + user-created
        const templateDerived = DERIVED_METRICS.map(dm => ({
            id: `derived-${dm.slug}`,
            slug: dm.slug,
            name: dm.name,
            formula: dm.formula,
            outputType: dm.outputType,
            description: dm.description,
            connectorId: null,
            connector: null,
            source: 'custom' as const,
            isTemplate: true, // marks these as system-provided templates
        }));

        const userDerived = dbDerivedMetrics
            .filter(m => !DERIVED_METRICS.some(d => d.slug === m.slug))
            .map(m => ({
                ...m,
                source: 'custom' as const,
                isTemplate: false,
            }));

        // Merge all derived into one custom list
        const allDerivedCustom = [...templateDerived, ...userDerived];

        return NextResponse.json({
            success: true,
            imported: importedMetrics,
            custom: customMetrics,
            builtin: builtinMetrics,
            derivedCustom: allDerivedCustom,
            counts: {
                imported: importedMetrics.length,
                custom: customMetrics.length + allDerivedCustom.length,
                builtin: builtinMetrics.length,
            },
        });
    } catch (error) {
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}

/**
 * POST /api/data-integration/metrics
 * Create a metric or derived metric.
 */
export async function POST(request: Request) {
    try {
        const [, authError] = await requireAuth();
        if (authError) return authError;

        const body = await request.json();
        const { type } = body; // 'base' or 'derived'

        if (type === 'derived') {
            const { connectorId, slug, name, formula, inputMetrics, outputType, description } = body;
            if (!slug || !name || !formula) {
                return NextResponse.json({ error: 'slug, name, formula required' }, { status: 400 });
            }
            const metric = await prisma.derivedMetricDefinition.create({
                data: {
                    connectorId: connectorId || null,
                    slug,
                    name,
                    formula,
                    inputMetrics: JSON.stringify(inputMetrics || []),
                    outputType: outputType || 'NUMBER',
                    description: description || null,
                },
            });
            return NextResponse.json({ success: true, metric, kind: 'derived' });
        } else {
            const { connectorId, slug, name, dataType, aggregationType, description, canonicalName } = body;
            if (!slug || !name) {
                return NextResponse.json({ error: 'slug, name required' }, { status: 400 });
            }
            const metric = await prisma.metricDefinition.create({
                data: {
                    connectorId: connectorId || null,
                    slug,
                    name,
                    canonicalName: canonicalName || slug,
                    dataType: dataType || 'NUMBER',
                    aggregationType: aggregationType || 'SUM',
                    description: description || null,
                    isDefault: false,
                },
            });
            return NextResponse.json({ success: true, metric, kind: 'base' });
        }
    } catch (error) {
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}

/**
 * PATCH /api/data-integration/metrics
 * Update a metric definition.
 */
export async function PATCH(request: Request) {
    try {
        const [, authError] = await requireAuth();
        if (authError) return authError;

        const body = await request.json();
        const { id, kind, name, dataType, aggregationType, description, formula, outputType } = body;

        if (!id || !kind) return NextResponse.json({ error: 'id and kind required' }, { status: 400 });

        if (kind === 'derived') {
            const metric = await prisma.derivedMetricDefinition.update({
                where: { id },
                data: {
                    ...(name && { name }),
                    ...(formula && { formula }),
                    ...(outputType && { outputType }),
                    ...(description !== undefined && { description }),
                },
            });
            return NextResponse.json({ success: true, metric });
        } else {
            const metric = await prisma.metricDefinition.update({
                where: { id },
                data: {
                    ...(name && { name }),
                    ...(dataType && { dataType }),
                    ...(aggregationType && { aggregationType }),
                    ...(description !== undefined && { description }),
                },
            });
            return NextResponse.json({ success: true, metric });
        }
    } catch (error) {
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}

/**
 * DELETE /api/data-integration/metrics
 */
export async function DELETE(request: Request) {
    try {
        const [, authError] = await requireAuth();
        if (authError) return authError;

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const kind = searchParams.get('kind') || 'base';

        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

        if (kind === 'derived') {
            await prisma.derivedMetricDefinition.delete({ where: { id } });
        } else {
            await prisma.metricDefinition.delete({ where: { id } });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}

// Helper: format slug to human-readable
function formatSlug(slug: string): string {
    return slug.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
