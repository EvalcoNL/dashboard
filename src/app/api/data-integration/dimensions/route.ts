// ═══════════════════════════════════════════════════════════════════
// Dimensions API — CRUD for DimensionDefinition records
// Enhanced: auto-discovers dimensions from normalized data when none defined
// ═══════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-guard';
import { prisma } from '@/lib/db';
import { query as chQuery } from '@/lib/clickhouse';
import { DIMENSION_METADATA } from '@/lib/data-integration/field-registry';
import { getBuiltinDimensions } from '@/lib/data-integration/field-registry';

// Re-export with display categories for the dimensions page grouping
const CATEGORY_DISPLAY: Record<string, string> = {
    'Campaign': 'Campagne Structuur',
    'Ad Group': 'Campagne Structuur',
    'Ad': 'Campagne Structuur',
    'Keyword': 'Campagne Structuur',
    'Segment': 'Targeting / Demografie',
    'Conversie': 'Conversie',
    'Website / Analytics': 'Website / Analytics',
    'Tijd': 'Tijd',
};

// Wrapper that maps categories for display on the dimensions page
const DIMENSION_META: Record<string, { name: string; category: string; dataType: string; description?: string }> = {};
for (const [slug, meta] of Object.entries(DIMENSION_METADATA)) {
    DIMENSION_META[slug] = {
        ...meta,
        category: CATEGORY_DISPLAY[meta.category] || meta.category,
    };
}

/**
 * GET /api/data-integration/dimensions
 * List all dimension definitions grouped by category.
 * Auto-discovers from normalized data when no definitions exist.
 */
export async function GET(request: Request) {
    try {
        const [, authError] = await requireAuth();
        if (authError) return authError;

        const { searchParams } = new URL(request.url);
        const projectId = searchParams.get('projectId');

        // 1) Load defined dimensions from database
        const definedDimensions = await prisma.dimensionDefinition.findMany({
            include: { connector: { select: { slug: true, name: true } } },
            orderBy: [{ connectorId: 'asc' }, { slug: 'asc' }],
        });

        const importedDimensions: any[] = definedDimensions.map(dim => ({
            id: dim.id,
            slug: dim.slug,
            name: dim.name,
            dataType: dim.dataType,
            description: dim.description,
            canonicalName: dim.canonicalName,
            isDefault: dim.isDefault,
            connectorId: dim.connectorId,
            connector: dim.connector,
            source: 'imported' as const,
        }));

        // Track slugs already defined
        const definedSlugs = new Set(definedDimensions.map(d => d.slug));

        // 2) Auto-discover additional dimensions from connector definitions
        // This uses the connector's getDimensionMappings() to find all possible dimensions,
        // then validates against ClickHouse data to see which ones actually have data.
        const connectors = await prisma.connectorDefinition.findMany({
            select: { id: true, slug: true, name: true },
        });
        const connectorBySlug = new Map(connectors.map(c => [c.slug, c]));

        // Get all data sources to find connected connectors
        const dataSources = await prisma.dataSource.findMany({
            where: projectId ? { projectId, active: true } : undefined,
            select: { connector: { select: { slug: true, name: true, id: true } } },
        });
        const activeConnectorSlugs = new Set(dataSources.map(ds => ds.connector?.slug).filter(Boolean));

        // Import connector registry to get dimension mappings
        try {
            // Import from connectors/index which auto-registers all connectors
            await import('@/lib/data-integration/connectors');
            const { connectorRegistry } = await import('@/lib/data-integration/connector-registry');

            for (const connSlug of activeConnectorSlugs) {
                if (!connSlug) continue;
                try {
                    const connector = connectorRegistry.getOrThrow(connSlug);
                    const mappings = connector.getDimensionMappings();
                    const conn = connectorBySlug.get(connSlug) || null;

                    for (const mapping of mappings) {
                        const slug = mapping.canonicalField;
                        if (definedSlugs.has(slug)) continue; // Already defined in DB

                        const meta = DIMENSION_META[slug];
                        importedDimensions.push({
                            id: `auto-${slug}`,
                            slug,
                            name: meta?.name || formatSlug(slug),
                            dataType: meta?.dataType || 'STRING',
                            description: meta?.description || null,
                            canonicalName: slug,
                            isDefault: false,
                            connectorId: conn?.id || null,
                            connector: conn ? { slug: conn.slug, name: conn.name } : null,
                            source: 'imported' as const,
                        });
                        definedSlugs.add(slug); // Avoid duplicates
                    }
                } catch {
                    // Connector not available
                }
            }
        } catch {
            // Connector registry not available — fall back to ClickHouse discovery
            const dimensionColumns = [
                'campaign_id', 'campaign_name', 'campaign_type', 'campaign_status', 'campaign_objective',
                'ad_group_id', 'ad_group_name', 'ad_group_status',
                'ad_id', 'ad_name', 'ad_type',
                'keyword_text', 'keyword_match_type',
                'device', 'country', 'network',
                'age', 'gender', 'placement', 'publisher_platform',
                'source', 'medium', 'page_path', 'page_title', 'landing_page',
                'session_source', 'session_medium', 'session_campaign_name', 'browser',
                'bidding_strategy_type', 'campaign_budget', 'campaign_labels',
                'campaign_start_date', 'campaign_end_date', 'hour_of_day',
                'ad_group_type', 'ad_group_cpc_bid', 'slot',
                'conversion_action_name', 'conversion_action_category',
            ];
            const missingColumns = dimensionColumns.filter(col => !definedSlugs.has(col));

            try {
                for (const dim of missingColumns) {
                    const result = await chQuery<{ connector_slug: string }>(`
                        SELECT DISTINCT connector_slug 
                        FROM metrics_data FINAL 
                        WHERE ${dim} IS NOT NULL AND ${dim} != ''
                        LIMIT 1
                    `);
                    if (result.length > 0) {
                        const conn = connectorBySlug.get(result[0].connector_slug) || null;
                        const meta = DIMENSION_META[dim];
                        importedDimensions.push({
                            id: `auto-${dim}`,
                            slug: dim,
                            name: meta?.name || formatSlug(dim),
                            dataType: meta?.dataType || 'STRING',
                            description: meta?.description || null,
                            canonicalName: dim,
                            isDefault: false,
                            connectorId: conn?.id || null,
                            connector: conn ? { slug: conn.slug, name: conn.name } : null,
                            source: 'imported' as const,
                        });
                    }
                }
            } catch {
                // ClickHouse not available
            }
        }

        // 3) Built-in dimensions (always available)
        const builtinDimensions = [
            // Date is always available
            {
                id: 'builtin-date',
                slug: 'date',
                name: 'Datum',
                dataType: 'DATE',
                description: 'De datum waarop de prestaties zijn gemeten',
                canonicalName: 'date',
                isDefault: false,
                connectorId: null,
                connector: null,
                source: 'builtin' as const,
            },
            ...getBuiltinDimensions().map(d => ({
                id: `builtin-${d.slug}`,
                slug: d.slug,
                name: d.nameNl,
                dataType: d.dataType,
                description: d.description || '',
                canonicalName: d.slug,
                isDefault: false,
                connectorId: null,
                connector: null,
                source: 'builtin' as const,
            })),
        ];

        // Combine all dimensions (remove date from imported since it's always in builtins)
        const filteredImported = importedDimensions.filter(d => d.slug !== 'date');
        const allDimensions = [...filteredImported, ...builtinDimensions];

        // Group imported by category
        const importedCategories = new Map<string, typeof importedDimensions>();
        for (const dim of importedDimensions) {
            const cat = DIMENSION_META[dim.slug]?.category || 'Custom Dimensies';
            if (!importedCategories.has(cat)) importedCategories.set(cat, []);
            importedCategories.get(cat)!.push(dim);
        }

        return NextResponse.json({
            success: true,
            dimensions: allDimensions,
            imported: importedDimensions,
            builtin: builtinDimensions,
            custom: [], // placeholder for future custom dimensions
            categories: Object.fromEntries(importedCategories),
            total: allDimensions.length,
            counts: {
                imported: importedDimensions.length,
                builtin: builtinDimensions.length,
                custom: 0,
            },
        });
    } catch (error) {
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}

/**
 * POST /api/data-integration/dimensions
 * Create a custom dimension.
 */
export async function POST(request: Request) {
    try {
        const [, authError] = await requireAuth();
        if (authError) return authError;

        const body = await request.json();
        const { connectorId, slug, name, dataType, description, canonicalName } = body;

        if (!connectorId || !slug || !name) {
            return NextResponse.json({ error: 'connectorId, slug, and name are required' }, { status: 400 });
        }

        const dim = await prisma.dimensionDefinition.create({
            data: {
                connectorId,
                slug,
                name,
                canonicalName: canonicalName || slug,
                dataType: dataType || 'STRING',
                description: description || null,
                isDefault: false,
            },
        });

        return NextResponse.json({ success: true, dimension: dim });
    } catch (error) {
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}

/**
 * PATCH /api/data-integration/dimensions
 * Update a dimension definition.
 */
export async function PATCH(request: Request) {
    try {
        const [, authError] = await requireAuth();
        if (authError) return authError;

        const body = await request.json();
        const { id, name, dataType, description } = body;

        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

        const dim = await prisma.dimensionDefinition.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(dataType && { dataType }),
                ...(description !== undefined && { description }),
            },
        });

        return NextResponse.json({ success: true, dimension: dim });
    } catch (error) {
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}

/**
 * DELETE /api/data-integration/dimensions
 * Delete a dimension definition.
 */
export async function DELETE(request: Request) {
    try {
        const [, authError] = await requireAuth();
        if (authError) return authError;

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

        await prisma.dimensionDefinition.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}

// Helper: format slug to human-readable
function formatSlug(slug: string): string {
    return slug.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
