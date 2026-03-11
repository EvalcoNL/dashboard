// ═══════════════════════════════════════════════════════════════════
// Dataset Query Engine — Enhanced for Fase 2
// Cross-platform data querying, blending, and derived metrics
// ═══════════════════════════════════════════════════════════════════

import { prisma } from '@/lib/db';
import { query as chQuery } from '@/lib/clickhouse';
import {
    getField, getBuiltinDimensions as getBuiltinDefs, isBuiltinDimension,
    isDerivedMetric, getAllDimensionSlugs, getAllMetricSlugs, getDerivedMetricSlugs,
    getAggregationType, getWeightField, getColumnName, resolveColumnSlug,
    determineQueryLevels, COLUMN_ALIASES,
    type FieldDefinition,
} from './field-registry';
import type {
    DatasetQuery,
    DatasetResult,
    DatasetFilter,
    DatasetOrderBy,
} from '@/types/data-integration';

// ─── Types ───

interface BlendConfig {
    connectionIds: string[];
    joinKeys: string[];       // e.g. ["date", "campaign_name"]
    dateFrom: Date;
    dateTo: Date;
    dimensions: string[];
    metrics: string[];
    filters?: DatasetFilter[];
}

interface BlendResult extends DatasetResult {
    sources: {
        connectionId: string;
        connectorSlug: string;
        recordCount: number;
    }[];
}

interface CompareResult {
    current: DatasetResult;
    previous: DatasetResult;
    changes: Record<string, string | number>[];
}

/**
 * Enhanced Dataset Query Engine for Fase 2.
 * 
 * New capabilities:
 * - Cross-platform blending via shared join keys
 * - Database-driven derived metrics (pulls from DerivedMetricDefinition)
 * - Period-over-period comparison
 * - System dataset creation
 * - Connector-aware metadata
 */
export class DatasetQueryEngine {

    // ─── Static cache for derived metric definitions (60s TTL) ───
    private static _derivedMetricsCache: { data: any[]; expiry: number } | null = null;
    private static readonly DERIVED_CACHE_TTL = 60_000; // 60 seconds

    static async getCachedDerivedMetrics() {
        const now = Date.now();
        if (DatasetQueryEngine._derivedMetricsCache && DatasetQueryEngine._derivedMetricsCache.expiry > now) {
            return DatasetQueryEngine._derivedMetricsCache.data;
        }
        const data = await prisma.derivedMetricDefinition.findMany();
        DatasetQueryEngine._derivedMetricsCache = { data, expiry: now + DatasetQueryEngine.DERIVED_CACHE_TTL };
        return data;
    }

    // ─── Main Query ───

    async query(query: DatasetQuery): Promise<DatasetResult> {
        let connectionIds = query.connectionIds || [];

        // Resolve dataset → connections
        if (query.datasetId) {
            const dataset = await prisma.dataset.findUnique({
                where: { id: query.datasetId },
                include: { sources: true },
            });
            if (dataset) {
                connectionIds = dataset.sources.map(s => s.dataSourceId);
            }
        }

        if (connectionIds.length === 0) {
            return this.emptyResult(query);
        }

        // Fetch raw data from ClickHouse
        const placeholders = connectionIds.map((_, i) => `{id${i}:String}`).join(', ');
        const params: Record<string, unknown> = {
            dateFrom: query.dateFrom.toISOString().split('T')[0],
            dateTo: query.dateTo.toISOString().split('T')[0],
        };
        connectionIds.forEach((id, i) => { params[`id${i}`] = id; });

        // Determine the appropriate data level(s) from field registry hierarchy
        const queryLevels = determineQueryLevels(query.dimensions);

        // Build explicit SELECT columns instead of SELECT *
        const storageDims = query.dimensions.filter(d => !isBuiltinDimension(d));
        const builtinDims = query.dimensions.filter(d => isBuiltinDimension(d));
        const baseMetrics = query.metrics.filter(m => !isDerivedMetric(m));

        // Collect columns needed: system cols + dimension cols + metric cols
        const selectCols = new Set<string>(['date', 'connector_slug', 'data_source_id']);
        for (const d of storageDims) selectCols.add(getColumnName(d));
        // Add source columns for built-in dimensions
        for (const d of builtinDims) {
            const def = getField(d);
            if (def?.sourceColumn) selectCols.add(def.sourceColumn);
        }
        for (const m of baseMetrics) selectCols.add(getColumnName(m));
        // Add weight fields needed for WEIGHTED_AVG aggregation
        for (const m of baseMetrics) {
            const wf = getWeightField(m);
            if (wf) selectCols.add(getColumnName(wf));
        }

        // Build level filter: IN clause for multiple levels (ads + analytics)
        const levelPlaceholders = queryLevels.map((_, i) => `{lvl${i}:String}`).join(', ');
        queryLevels.forEach((lvl, i) => { params[`lvl${i}`] = lvl; });

        // ── Server-side vs client-side aggregation decision ──
        // Use ClickHouse GROUP BY when possible (SUM-only metrics, no built-in dims)
        const hasAvgMetrics = baseMetrics.some(m => {
            const agg = getAggregationType(m);
            return agg === 'AVG' || agg === 'WEIGHTED_AVG';
        });
        const canServerAggregate = builtinDims.length === 0 && !hasAvgMetrics;

        let rawData: Record<string, string | number>[];

        if (canServerAggregate && storageDims.length > 0) {
            // ── Server-side aggregation: GROUP BY in ClickHouse ──
            const groupCols = [...storageDims.map(d => getColumnName(d)), 'date', 'connector_slug'];
            const metricAggs = baseMetrics.map(m => `sum(${getColumnName(m)}) AS ${getColumnName(m)}`);
            const selectParts = [...groupCols, ...metricAggs, `'__agg__' AS data_source_id`];

            rawData = await chQuery<Record<string, string | number>>(`
                SELECT ${selectParts.join(', ')}
                FROM metrics_data FINAL
                WHERE data_source_id IN (${placeholders})
                  AND date >= {dateFrom:Date}
                  AND date <= {dateTo:Date}
                  AND level IN (${levelPlaceholders})
                GROUP BY ${groupCols.join(', ')}
                ORDER BY date ASC
            `, params);
        } else {
            // ── Client-side aggregation: fetch raw rows ──
            const selectClause = Array.from(selectCols).join(', ');
            rawData = await chQuery<Record<string, string | number>>(`
                SELECT ${selectClause}
                FROM metrics_data FINAL
                WHERE data_source_id IN (${placeholders})
                  AND date >= {dateFrom:Date}
                  AND date <= {dateTo:Date}
                  AND level IN (${levelPlaceholders})
                ORDER BY date ASC
            `, params);
        }

        // Pipeline: compute built-ins → aggregate → filter → derive → sort → paginate
        // 1. Compute built-in dimension values on raw rows before aggregation
        // builtinDims and storageDims already computed above

        if (builtinDims.length > 0) {
            const builtinDefs = getBuiltinDefs();
            for (const row of rawData) {
                // Resolve ClickHouse column aliases → canonical slugs
                for (const [colName, canonSlug] of Object.entries(COLUMN_ALIASES)) {
                    if (colName in row && !(canonSlug in row)) {
                        row[canonSlug] = row[colName];
                    }
                }
                for (const slug of builtinDims) {
                    const def = builtinDefs.find(b => b.slug === slug);
                    if (def?.compute) {
                        row[slug] = def.compute(row);
                    }
                }
            }
        }

        // 2. Aggregate using ALL dimensions (storage + built-in)
        // Skip client-side aggregation if server already did it (and no built-in dims)
        let rows = canServerAggregate && storageDims.length > 0
            ? rawData
            : this.aggregate(rawData, query.dimensions, query.metrics);
        if (query.filters?.length) rows = this.applyFilters(rows, query.filters);
        rows = await this.applyDerivedMetrics(rows, query.metrics);
        if (query.orderBy?.length) rows = this.applySort(rows, query.orderBy);

        const totalRows = rows.length;
        const paged = rows.slice(query.offset || 0, (query.offset || 0) + (query.limit || 1000));

        return {
            rows: paged,
            totalRows,
            dimensions: query.dimensions,
            metrics: query.metrics,
            dateRange: { from: query.dateFrom, to: query.dateTo },
        };
    }

    // ─── Cross-Platform Blending ───

    /**
     * Blend data from multiple connections using shared join keys.
     * E.g., join Google Ads cost data with GA4 conversion data on campaign_name + date.
     */
    async blend(config: BlendConfig): Promise<BlendResult> {
        // Fetch data per connection
        const connectionData = new Map<string, Record<string, string | number>[]>();
        const sources: BlendResult['sources'] = [];

        for (const connId of config.connectionIds) {
            // Determine level from dimensions + joinKeys using field registry
            const allDims = [...config.joinKeys, ...config.dimensions];
            const blendLevels = determineQueryLevels(allDims);
            const lvlPlaceholders = blendLevels.map((_, i) => `{lvl${i}:String}`).join(', ');
            const lvlParams: Record<string, unknown> = {};
            blendLevels.forEach((lvl, i) => { lvlParams[`lvl${i}`] = lvl; });

            // Build explicit SELECT for blend query
            const blendDims = [...config.joinKeys, ...config.dimensions];
            const blendSelectCols = new Set<string>(['date', 'connector_slug', 'data_source_id']);
            for (const d of blendDims) blendSelectCols.add(getColumnName(d));
            for (const m of config.metrics.filter(m => !isDerivedMetric(m))) blendSelectCols.add(getColumnName(m));
            const blendSelectClause = Array.from(blendSelectCols).join(', ');

            const rawRows = await chQuery<Record<string, string | number>>(`
                SELECT ${blendSelectClause}
                FROM metrics_data FINAL
                WHERE data_source_id = {connId:String}
                  AND date >= {dateFrom:Date}
                  AND date <= {dateTo:Date}
                  AND level IN (${lvlPlaceholders})
                ORDER BY date ASC
            `, {
                connId,
                dateFrom: config.dateFrom.toISOString().split('T')[0],
                dateTo: config.dateTo.toISOString().split('T')[0],
                ...lvlParams,
            });

            const aggregated = this.aggregate(rawRows, [...config.joinKeys, ...config.dimensions], config.metrics);
            connectionData.set(connId, aggregated);

            if (rawRows.length > 0) {
                sources.push({
                    connectionId: connId,
                    connectorSlug: String(rawRows[0].connector_slug || 'unknown'),
                    recordCount: rawRows.length,
                });
            }
        }

        // Merge using join keys (left join style — all rows from first source, matched from others)
        const blended = this.mergeByJoinKeys(connectionData, config.joinKeys);

        // Apply derived metrics and filters
        let result = await this.applyDerivedMetrics(blended, config.metrics);
        if (config.filters?.length) result = this.applyFilters(result, config.filters);

        return {
            rows: result,
            totalRows: result.length,
            dimensions: config.dimensions,
            metrics: config.metrics,
            dateRange: { from: config.dateFrom, to: config.dateTo },
            sources,
        };
    }

    // ─── Period Comparison ───

    /**
     * Compare metrics between two periods.
     * Returns current + previous results plus percentage changes.
     */
    async compare(query: DatasetQuery, compareMode: 'previous_period' | 'previous_year'): Promise<CompareResult> {
        // Current period
        const current = await this.query(query);

        // Calculate previous period dates
        const daysDiff = Math.ceil((query.dateTo.getTime() - query.dateFrom.getTime()) / (1000 * 60 * 60 * 24));
        const previousFrom = new Date(query.dateFrom);
        const previousTo = new Date(query.dateTo);

        if (compareMode === 'previous_period') {
            previousFrom.setDate(previousFrom.getDate() - daysDiff);
            previousTo.setDate(previousTo.getDate() - daysDiff);
        } else {
            previousFrom.setFullYear(previousFrom.getFullYear() - 1);
            previousTo.setFullYear(previousTo.getFullYear() - 1);
        }

        const previous = await this.query({ ...query, dateFrom: previousFrom, dateTo: previousTo });

        // Calculate changes (only for totals, so remove date dimension)
        const metricsOnly = query.metrics.filter(m => !query.dimensions.includes(m));
        const changes: Record<string, string | number>[] = [];

        // Aggregate current and previous to totals
        const currentTotals = this.sumMetrics(current.rows, metricsOnly);
        const previousTotals = this.sumMetrics(previous.rows, metricsOnly);

        const changeRow: Record<string, string | number> = {};
        for (const metric of metricsOnly) {
            const cur = currentTotals[metric] || 0;
            const prev = previousTotals[metric] || 0;
            changeRow[`${metric}_current`] = cur;
            changeRow[`${metric}_previous`] = prev;
            changeRow[`${metric}_change`] = prev !== 0
                ? Math.round(((cur - prev) / prev) * 10000) / 100  // % change, 2 decimals
                : cur > 0 ? 100 : 0;
        }
        changes.push(changeRow);

        return { current, previous, changes };
    }

    // ─── System Datasets ───

    /**
     * Create pre-built system datasets for a client
     */
    async createSystemDatasets(projectId: string): Promise<string[]> {
        const datasetDefs = [
            {
                slug: 'paid-performance',
                name: 'Paid Advertising Performance',
                description: 'Cross-platform view of all paid advertising data',
                connectorCategories: ['PAID_SEARCH', 'PAID_SOCIAL', 'PROGRAMMATIC'],
            },
            {
                slug: 'organic-social',
                name: 'Organic Social Performance',
                description: 'Engagement metrics across all social platforms',
                connectorCategories: ['ORGANIC_SOCIAL'],
            },
            {
                slug: 'web-analytics',
                name: 'Website Analytics',
                description: 'Website traffic and conversion data',
                connectorCategories: ['ANALYTICS'],
            },
            {
                slug: 'ecommerce',
                name: 'E-commerce Performance',
                description: 'Sales, orders, and product performance',
                connectorCategories: ['ECOMMERCE'],
            },
            {
                slug: 'cross-channel',
                name: 'Cross-Channel Overview',
                description: 'All channels combined for a unified view',
                connectorCategories: ['PAID_SEARCH', 'PAID_SOCIAL', 'ANALYTICS', 'ORGANIC_SOCIAL', 'PROGRAMMATIC'],
            },
        ];

        const createdIds: string[] = [];

        for (const def of datasetDefs) {
            // Upsert the dataset
            const dataset = await prisma.dataset.upsert({
                where: { projectId_slug: { projectId, slug: def.slug } },
                create: {
                    projectId,
                    slug: def.slug,
                    name: def.name,
                    description: def.description,
                    isSystem: true,
                    config: { connectorCategories: def.connectorCategories },
                },
                update: {
                    name: def.name,
                    description: def.description,
                },
            });

            // Find matching connections and link them
            const dataSources = await prisma.dataSource.findMany({
                where: {
                    projectId,
                    syncStatus: 'ACTIVE',
                    connector: { category: { in: def.connectorCategories } },
                },
            });

            const defaultLevel = def.connectorCategories.includes('ECOMMERCE') ? 'order' : 'campaign';

            for (const source of dataSources) {
                await prisma.datasetSource.upsert({
                    where: {
                        datasetId_dataSourceId_level: {
                            datasetId: dataset.id,
                            dataSourceId: source.id,
                            level: defaultLevel,
                        },
                    },
                    create: {
                        datasetId: dataset.id,
                        dataSourceId: source.id,
                        level: defaultLevel,
                    },
                    update: {},
                });
            }

            createdIds.push(dataset.id);
        }

        return createdIds;
    }

    // ─── Discovery ───

    async getAvailableDimensions(connectionIds: string[]): Promise<string[]> {
        const knownSlugs = getAllDimensionSlugs().filter(slug => slug !== 'date');
        const dims = new Set<string>();
        dims.add('date');

        try {
            const tableColumns = await chQuery<{ name: string }>(`DESCRIBE TABLE metrics_data`);
            const existingColumns = new Set(tableColumns.map(c => c.name));

            for (const dim of knownSlugs) {
                // Check both the slug and any ClickHouse column alias
                const colName = getColumnName(dim);
                if (existingColumns.has(colName) || existingColumns.has(dim)) {
                    dims.add(dim);
                }
            }

            // Also check for custom dimensions from DB
            try {
                const customDims = await prisma.dimensionDefinition.findMany({
                    where: { isDefault: false },
                    select: { slug: true },
                });
                for (const cd of customDims) {
                    if (existingColumns.has(cd.slug)) {
                        dims.add(cd.slug);
                    }
                }
            } catch {
                // Custom dimension check failed — ignore
            }
        } catch (err) {
            console.error('getAvailableDimensions error:', err);
        }

        return Array.from(dims).sort();
    }

    /**
     * Get built-in dimensions (always available, computed at query time)
     */
    getBuiltinDimensions(): { slug: string; name: string; description: string; dataType: string }[] {
        return getBuiltinDefs().map(d => ({
            slug: d.slug,
            name: d.nameNl,
            description: d.description || '',
            dataType: d.dataType,
        }));
    }

    async getAvailableMetrics(connectionIds: string[]): Promise<string[]> {
        const metricSlugs = getAllMetricSlugs();
        const mets = new Set<string>();

        try {
            const tableColumns = await chQuery<{ name: string }>(`DESCRIBE TABLE metrics_data`);
            const existingColumns = new Set(tableColumns.map(c => c.name));

            for (const met of metricSlugs) {
                // Check both the slug and any ClickHouse column alias
                const colName = getColumnName(met);
                if (existingColumns.has(colName) || existingColumns.has(met)) {
                    mets.add(met);
                }
            }
        } catch {
            // ClickHouse not available
        }

        // Add derived metrics whose input fields are available
        const derivedSlugs = getDerivedMetricSlugs();
        for (const slug of derivedSlugs) {
            const def = getField(slug);
            if (!def?.formula) continue;
            // Extract input fields from the formula
            const inputFields = def.formula.match(/[a-z_]+/g) || [];
            const uniqueInputs = [...new Set(inputFields.filter(f => f !== 'undefined'))];
            if (uniqueInputs.length > 0 && uniqueInputs.every(input => mets.has(input))) {
                mets.add(slug);
            }
        }

        return Array.from(mets).sort();
    }

    // ─── Private: Aggregation ───

    private aggregate(
        rawData: Array<Record<string, string | number>>,
        groupByDimensions: string[],
        requestedMetrics: string[]
    ): Record<string, string | number>[] {
        // Track counts and weight sums per group for AVG/WEIGHTED_AVG metrics
        const groups = new Map<string, Record<string, string | number>>();
        const groupCounts = new Map<string, number>();
        const groupWeightSums = new Map<string, Record<string, number>>();

        // Identify metrics that need special aggregation
        const avgMetrics = new Set<string>();
        const weightedAvgMetrics = new Map<string, string>(); // metric → weightField
        for (const metric of requestedMetrics) {
            if (isDerivedMetric(metric)) continue;
            const aggType = getAggregationType(metric);
            if (aggType === 'AVG') {
                avgMetrics.add(metric);
            } else if (aggType === 'WEIGHTED_AVG') {
                const wf = getWeightField(metric);
                if (wf) weightedAvgMetrics.set(metric, wf);
            }
        }

        for (const record of rawData) {
            const keyParts: string[] = [];
            const dimValues: Record<string, string | number> = {};

            for (const dim of groupByDimensions) {
                const value = dim === 'date' ? String(record.date) : record[dim];
                keyParts.push(`${dim}=${value ?? ''}`);
                if (value !== undefined) dimValues[dim] = value;
            }

            const key = keyParts.join('|');

            if (!groups.has(key)) {
                const row: Record<string, string | number> = { ...dimValues };
                for (const metric of requestedMetrics) {
                    if (!isDerivedMetric(metric)) row[metric] = 0;
                }
                groups.set(key, row);
                groupCounts.set(key, 0);
                groupWeightSums.set(key, {});
            }

            const group = groups.get(key)!;
            groupCounts.set(key, (groupCounts.get(key) || 0) + 1);

            for (const metric of requestedMetrics) {
                if (isDerivedMetric(metric)) continue;
                const value = Number(record[metric] || 0);

                if (weightedAvgMetrics.has(metric)) {
                    // WEIGHTED_AVG: accumulate (value * weight)
                    const weightField = weightedAvgMetrics.get(metric)!;
                    const weight = Number(record[weightField] || 0);
                    group[metric] = ((group[metric] as number) || 0) + (value * weight);
                    // Track weight sum for this metric in this group
                    const ws = groupWeightSums.get(key)!;
                    ws[metric] = (ws[metric] || 0) + weight;
                } else if (avgMetrics.has(metric)) {
                    // AVG: accumulate sum, divide later
                    group[metric] = ((group[metric] as number) || 0) + value;
                } else {
                    // SUM: normal accumulation
                    group[metric] = ((group[metric] as number) || 0) + value;
                }
            }
        }

        // Finalize AVG and WEIGHTED_AVG metrics
        for (const [key, group] of groups.entries()) {
            const count = groupCounts.get(key) || 1;
            const ws = groupWeightSums.get(key) || {};

            for (const metric of avgMetrics) {
                group[metric] = count > 0 ? Math.round(((group[metric] as number) / count) * 100) / 100 : 0;
            }

            for (const [metric] of weightedAvgMetrics) {
                const totalWeight = ws[metric] || 0;
                group[metric] = totalWeight > 0 ? Math.round(((group[metric] as number) / totalWeight) * 100) / 100 : 0;
            }
        }

        return Array.from(groups.values());
    }

    // ─── Private: Derived Metrics ───

    /**
     * Apply derived metrics from both hardcoded formulas and database definitions
     */
    private async applyDerivedMetrics(
        rows: Record<string, string | number>[],
        requestedMetrics: string[]
    ): Promise<Record<string, string | number>[]> {
        // Hardcoded formulas (always available)
        const builtinFormulas: Record<string, { formula: string; inputs: string[] }> = {
            ctr: { formula: 'clicks / impressions * 100', inputs: ['clicks', 'impressions'] },
            cpc: { formula: 'cost / clicks', inputs: ['cost', 'clicks'] },
            cpm: { formula: 'cost / impressions * 1000', inputs: ['cost', 'impressions'] },
            roas: { formula: 'conversion_value / cost', inputs: ['conversion_value', 'cost'] },
            conversion_rate: { formula: 'conversions / clicks * 100', inputs: ['conversions', 'clicks'] },
            cost_per_conversion: { formula: 'cost / conversions', inputs: ['cost', 'conversions'] },
            aov: { formula: 'revenue / transactions', inputs: ['revenue', 'transactions'] },
            open_rate: { formula: 'email_opens / emails_delivered * 100', inputs: ['email_opens', 'emails_delivered'] },
            click_rate: { formula: 'email_clicks / emails_delivered * 100', inputs: ['email_clicks', 'emails_delivered'] },
            organic_ctr: { formula: 'organic_clicks / organic_impressions * 100', inputs: ['organic_clicks', 'organic_impressions'] },
            video_view_rate: { formula: 'video_views / impressions * 100', inputs: ['video_views', 'impressions'] },
        };

        // Load custom formulas from database (cached 60s)
        const dbFormulas = await DatasetQueryEngine.getCachedDerivedMetrics();
        for (const dbFormula of dbFormulas) {
            const inputs = dbFormula.inputMetrics as string[];
            builtinFormulas[dbFormula.slug] = {
                formula: dbFormula.formula,
                inputs,
            };
        }

        return rows.map(row => {
            const newRow = { ...row };

            for (const metric of requestedMetrics) {
                const def = builtinFormulas[metric];
                if (!def) continue;

                const hasInputs = def.inputs.every(input => {
                    const val = row[input];
                    return val !== undefined && val !== null && Number(val) !== 0;
                });

                if (hasInputs) {
                    newRow[metric] = this.evalFormula(def.formula, def.inputs.map(i => [i, Number(row[i])]));
                } else {
                    newRow[metric] = 0;
                }
            }

            return newRow;
        });
    }

    private evalFormula(formula: string, values: [string, number][]): number {
        let expr = formula;
        // Sort by key length descending to avoid partial replacements
        const sorted = [...values].sort((a, b) => b[0].length - a[0].length);
        for (const [key, value] of sorted) {
            expr = expr.replace(new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), String(value));
        }

        // Safe arithmetic evaluation — only allows numbers, +, -, *, /, parentheses, whitespace
        // Rejects any alphabetic characters (prevents code injection)
        const sanitized = expr.trim();
        if (/[a-zA-Z_$]/.test(sanitized)) {
            // Contains variable names that weren't replaced — formula is invalid
            return 0;
        }
        if (!/^[\d\s+\-*/().]+$/.test(sanitized)) {
            // Contains disallowed characters
            return 0;
        }

        try {
            // Safe because we verified only arithmetic chars remain
            const fn = new Function(`"use strict"; return (${sanitized})`);
            const result = fn();
            return typeof result === 'number' && isFinite(result)
                ? Math.round(result * 100) / 100
                : 0;
        } catch {
            return 0;
        }
    }

    private isDerived(metric: string): boolean {
        return isDerivedMetric(metric);
    }

    // ─── Private: Blending ───

    private mergeByJoinKeys(
        connectionData: Map<string, Record<string, string | number>[]>,
        joinKeys: string[]
    ): Record<string, string | number>[] {
        const merged = new Map<string, Record<string, string | number>>();

        for (const [_connId, rows] of connectionData) {
            for (const row of rows) {
                const key = joinKeys.map(k => `${k}=${row[k] ?? ''}`).join('|');

                if (!merged.has(key)) {
                    merged.set(key, { ...row });
                } else {
                    const existing = merged.get(key)!;
                    // Merge: dimensions stay, metrics get summed
                    for (const [field, value] of Object.entries(row)) {
                        if (joinKeys.includes(field)) continue; // Skip join keys (already set)

                        if (typeof value === 'number') {
                            existing[field] = ((existing[field] as number) || 0) + value;
                        } else if (existing[field] === undefined) {
                            existing[field] = value; // Fill missing dimension values
                        }
                    }
                }
            }
        }

        return Array.from(merged.values());
    }

    // ─── Private: Filtering & Sorting ───

    private applyFilters(rows: Record<string, string | number>[], filters: DatasetFilter[]): Record<string, string | number>[] {
        return rows.filter(row =>
            filters.every(f => {
                const value = row[f.field];
                if (value === undefined) return false;
                switch (f.operator) {
                    case 'eq': return value === f.value;
                    case 'neq': return value !== f.value;
                    case 'contains': return String(value).toLowerCase().includes(String(f.value).toLowerCase());
                    case 'gt': return Number(value) > Number(f.value);
                    case 'gte': return Number(value) >= Number(f.value);
                    case 'lt': return Number(value) < Number(f.value);
                    case 'lte': return Number(value) <= Number(f.value);
                    case 'in': return Array.isArray(f.value) && f.value.includes(value as never);
                    case 'not_in': return Array.isArray(f.value) && !f.value.includes(value as never);
                    default: return true;
                }
            })
        );
    }

    private applySort(rows: Record<string, string | number>[], orderBy: DatasetOrderBy[]): Record<string, string | number>[] {
        return [...rows].sort((a, b) => {
            for (const sort of orderBy) {
                const aVal = a[sort.field], bVal = b[sort.field];
                if (aVal === bVal) continue;
                if (aVal === undefined) return sort.direction === 'asc' ? -1 : 1;
                if (bVal === undefined) return sort.direction === 'asc' ? 1 : -1;
                const cmp = typeof aVal === 'number' && typeof bVal === 'number'
                    ? aVal - bVal
                    : String(aVal).localeCompare(String(bVal));
                return sort.direction === 'asc' ? cmp : -cmp;
            }
            return 0;
        });
    }

    // ─── Private: Helpers ───

    private sumMetrics(rows: Record<string, string | number>[], metrics: string[]): Record<string, number> {
        const totals: Record<string, number> = {};
        for (const metric of metrics) totals[metric] = 0;

        for (const row of rows) {
            for (const metric of metrics) {
                if (typeof row[metric] === 'number') {
                    totals[metric] += row[metric] as number;
                }
            }
        }
        return totals;
    }

    private emptyResult(query: DatasetQuery): DatasetResult {
        return {
            rows: [],
            totalRows: 0,
            dimensions: query.dimensions,
            metrics: query.metrics,
            dateRange: { from: query.dateFrom, to: query.dateTo },
        };
    }
}

export const datasetQueryEngine = new DatasetQueryEngine();
