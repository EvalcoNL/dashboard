// ═══════════════════════════════════════════════════════════════════
// Normalization Service — ClickHouse Pipeline
// Transforms raw platform data → universal format and stores in ClickHouse.
// Pipeline: validate → map → transform → clean → hash → batch insert
// ═══════════════════════════════════════════════════════════════════

import { prisma } from '@/lib/db';
import { insert, command, query } from '@/lib/clickhouse';
import { connectorRegistry } from './connector-registry';
import crypto from 'crypto';
import type {
    FetchResponse,
    DimensionMapping,
    MetricMapping,
} from '@/types/data-integration';

interface NormalizeConfig {
    dataSourceId: string;
    accountId?: string;
    projectId?: string;
    connectorSlug: string;
    level: string;
    date: Date;
    response: FetchResponse;
    sourceCurrency?: string;
    targetCurrency?: string;
    sourceTimezone?: string;
    /** DELTA mode: compare row checksums, skip unchanged rows */
    enableChecksumComparison?: boolean;
    /** FULL mode: skip hash comparison, insert all rows */
    skipHashComparison?: boolean;
}

interface ValidationResult {
    valid: boolean;
    warnings: string[];
    droppedRows: number;
}

interface NormalizationResult {
    storedCount: number;
    totalRows: number;
    droppedRows: number;
    warnings: string[];
    newRows?: number;
    updatedRows?: number;
    deletedRows?: number;
    skippedRows?: number;
}

// TODO: Replace with live exchange rate API (e.g. ECB or Open Exchange Rates)
// Static rates are approximate and will drift over time
const CURRENCY_RATES: Record<string, number> = {
    EUR: 1.0,
    USD: 0.92,
    GBP: 1.17,
    CAD: 0.68,
    AUD: 0.60,
    SEK: 0.088,
    NOK: 0.087,
    DKK: 0.13,
    CHF: 1.04,
    PLN: 0.23,
    CZK: 0.041,
    HUF: 0.0026,
    BRL: 0.18,
    JPY: 0.0061,
    INR: 0.011,
    MXN: 0.054,
};

// Known dimension and metric columns — derived from field-registry (single source of truth)
import { getKnownDimensionColumns, getKnownMetricColumns } from './field-registry';
const KNOWN_DIMENSIONS = getKnownDimensionColumns();
const KNOWN_METRICS = getKnownMetricColumns();

/**
 * Enhanced Normalization Service — the heart of the data pipeline.
 * Now writes to ClickHouse instead of Prisma.
 * 
 * Pipeline steps:
 * 1. Validate raw data (check for required fields, data types)
 * 2. Map platform fields → canonical fields
 * 3. Apply transformations (currency conversion, date normalization)
 * 4. Clean data (remove nulls, trim strings, fix types)
 * 5. Generate deduplication hash
 * 6. Flatten into ClickHouse columns
 * 7. Batch insert into ClickHouse metrics_data
 */
export class NormalizationService {

    /**
     * Main entry point: normalize and store a batch of data.
     */
    async normalizeAndStore(config: NormalizeConfig): Promise<NormalizationResult> {
        const connector = connectorRegistry.getOrThrow(config.connectorSlug);
        const dimensionMappings = connector.getDimensionMappings();
        const metricMappings = connector.getMetricMappings();

        // Resolve projectId if not provided
        let projectId = config.projectId;
        if (!projectId) {
            const ds = await prisma.dataSource.findUnique({
                where: { id: config.dataSourceId },
                select: { projectId: true },
            });
            projectId = ds?.projectId || '';
        }

        const warnings: string[] = [];
        let droppedRows = 0;

        // Step 1-6: Process each row
        const clickhouseRows: Record<string, unknown>[] = [];
        for (const row of config.response.rows) {
            // Validate row
            const validation = this.validateRow(row.dimensions, row.metrics);
            if (!validation.valid) {
                droppedRows++;
                warnings.push(...validation.warnings);
                continue;
            }

            // Map dimensions
            const normalizedDimensions = this.mapDimensions(row.dimensions, dimensionMappings);

            // Map metrics
            let normalizedMetrics = this.mapMetrics(row.metrics, metricMappings);

            // Currency conversion
            if (config.sourceCurrency && config.sourceCurrency !== (config.targetCurrency || 'EUR')) {
                normalizedMetrics = this.convertCurrency(
                    normalizedMetrics,
                    config.sourceCurrency,
                    config.targetCurrency || 'EUR'
                );
            }

            // Clean data
            const cleanedDimensions = this.cleanDimensions(normalizedDimensions);
            const cleanedMetrics = this.cleanMetrics(normalizedMetrics);

            // Generate hash for dedup
            const canonicalHash = this.generateHash(
                config.dataSourceId, config.date, cleanedDimensions, config.level
            );

            // Flatten into ClickHouse row (real columns, not JSON!)
            const chRow = this.flattenToClickHouseRow({
                canonicalHash,
                dataSourceId: config.dataSourceId,
                accountId: config.accountId || null,
                projectId,
                connectorSlug: config.connectorSlug,
                date: config.date,
                level: config.level,
                dimensions: cleanedDimensions,
                metrics: cleanedMetrics,
            });

            clickhouseRows.push(chRow);
        }

        // Step 7: Smart sync — mode-aware insert strategy
        let storedCount = 0;
        let newRows = 0;
        let updatedRows = 0;
        let deletedRows = 0;
        let skippedRows = 0;

        if (clickhouseRows.length > 0) {
            try {
                const dateStr = config.date.toISOString().split('T')[0];

                if (config.skipHashComparison) {
                    // ═══ FULL MODE: Insert everything, no comparison needed ═══
                    const chunkSize = 10000;
                    for (let i = 0; i < clickhouseRows.length; i += chunkSize) {
                        const chunk = clickhouseRows.slice(i, i + chunkSize);
                        await insert('metrics_data', chunk);
                        storedCount += chunk.length;
                    }
                    newRows = clickhouseRows.length;

                    console.log(
                        `[NormalizationService] FULL sync for ${dateStr}: ${newRows} rows inserted`
                    );
                } else {
                    // ═══ INCREMENTAL / DELTA MODE: Compare with existing data ═══

                    // 1. Fetch existing rows for this source + date (parameterized)
                    const syncParams = { dsId: config.dataSourceId, syncDate: dateStr, lvl: config.level };
                    const existingQuery = config.enableChecksumComparison
                        ? `SELECT canonical_hash, sipHash64(*) as data_checksum FROM metrics_data FINAL
                           WHERE data_source_id = {dsId:String} AND date = {syncDate:String} AND level = {lvl:String}`
                        : `SELECT canonical_hash FROM metrics_data FINAL
                           WHERE data_source_id = {dsId:String} AND date = {syncDate:String} AND level = {lvl:String}`;

                    const existingRows = await query<{ canonical_hash: string; data_checksum?: string }>(existingQuery, syncParams);
                    const existingHashes = new Set(existingRows.map(r => r.canonical_hash));

                    // For DELTA: build a map of hash → checksum
                    const existingChecksums = config.enableChecksumComparison
                        ? new Map(existingRows.map(r => [r.canonical_hash, r.data_checksum || '']))
                        : null;

                    // 2. Build incoming hash set
                    const incomingHashes = new Set(clickhouseRows.map(r => String(r.canonical_hash)));

                    // 3. Determine which rows to insert
                    let rowsToInsert: typeof clickhouseRows;

                    if (config.enableChecksumComparison && existingChecksums) {
                        // ═══ DELTA: Compare checksums, skip unchanged rows ═══
                        rowsToInsert = [];
                        for (const row of clickhouseRows) {
                            const hash = String(row.canonical_hash);
                            if (!existingHashes.has(hash)) {
                                // New row
                                rowsToInsert.push(row);
                                newRows++;
                            } else {
                                // Existing row — generate checksum of incoming data to compare
                                // We use sorted JSON of the full row as a simple checksum
                                const incomingChecksum = this.generateRowChecksum(row);
                                const existingChecksum = existingChecksums.get(hash) || '';
                                if (incomingChecksum !== existingChecksum) {
                                    rowsToInsert.push(row);
                                    updatedRows++;
                                } else {
                                    skippedRows++;
                                }
                            }
                        }
                    } else {
                        // ═══ INCREMENTAL: Re-insert all (RMT handles dedup) ═══
                        rowsToInsert = clickhouseRows;
                        newRows = [...incomingHashes].filter(h => !existingHashes.has(h)).length;
                        updatedRows = [...incomingHashes].filter(h => existingHashes.has(h)).length;
                    }

                    // 4. Find and delete stale rows
                    const staleHashes: string[] = [];
                    for (const hash of existingHashes) {
                        if (!incomingHashes.has(hash)) staleHashes.push(hash);
                    }

                    if (staleHashes.length > 0) {
                        // Sanitize SHA-256 hashes — only allow hex characters
                        const safeHashes = staleHashes.filter(h => /^[a-f0-9]+$/i.test(h));
                        if (safeHashes.length > 0) {
                            const hashList = safeHashes.map(h => `'${h}'`).join(',');
                            await command(`
                                ALTER TABLE metrics_data DELETE
                                WHERE data_source_id = {dsId:String}
                                  AND date = {syncDate:String}
                                  AND level = {lvl:String}
                                  AND canonical_hash IN (${hashList})
                            `, { dsId: config.dataSourceId, syncDate: dateStr, lvl: config.level });
                            await this.waitForMutations();
                        }
                        deletedRows = safeHashes.length;
                    }

                    // 5. Insert rows in chunks
                    if (rowsToInsert.length > 0) {
                        const chunkSize = 10000;
                        for (let i = 0; i < rowsToInsert.length; i += chunkSize) {
                            const chunk = rowsToInsert.slice(i, i + chunkSize);
                            await insert('metrics_data', chunk);
                            storedCount += chunk.length;
                        }
                    }

                    const modeLabel = config.enableChecksumComparison ? 'DELTA' : 'INCREMENTAL';
                    console.log(
                        `[NormalizationService] ${modeLabel} sync for ${dateStr}: ` +
                        `${newRows} new, ${updatedRows} updated, ${skippedRows} skipped, ${deletedRows} deleted`
                    );
                }
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                console.error('[NormalizationService] ClickHouse insert failed:', message);
                warnings.push(`ClickHouse insert failed: ${message}`);
            }
        }

        return {
            storedCount,
            totalRows: config.response.rows.length,
            droppedRows,
            warnings: [...new Set(warnings)],
            newRows,
            updatedRows,
            deletedRows,
            skippedRows,
        };
    }

    /**
     * Bulk normalize data from multiple dates (used for backfills)
     */
    async normalizeMultipleDays(
        configs: NormalizeConfig[]
    ): Promise<{ total: NormalizationResult; perDay: Map<string, NormalizationResult> }> {
        const perDay = new Map<string, NormalizationResult>();
        const total: NormalizationResult = { storedCount: 0, totalRows: 0, droppedRows: 0, warnings: [] };

        for (const config of configs) {
            const result = await this.normalizeAndStore(config);
            const dateKey = config.date.toISOString().split('T')[0];
            perDay.set(dateKey, result);

            total.storedCount += result.storedCount;
            total.totalRows += result.totalRows;
            total.droppedRows += result.droppedRows;
            total.warnings.push(...result.warnings);
        }

        return { total, perDay };
    }

    /**
     * Get data quality statistics for a data source from ClickHouse.
     */
    async getDataQualityStats(dataSourceId: string): Promise<{
        totalRecords: number;
        dateRange: { earliest: Date | null; latest: Date | null };
        levelsWithData: string[];
        dimensionCoverage: Record<string, number>;
        metricCoverage: Record<string, number>;
    }> {
        // Import query here to avoid circular dependencies
        const { query: chQuery, queryOne: chQueryOne } = await import('@/lib/clickhouse');

        const countResult = await chQueryOne<{ cnt: string }>(
            `SELECT count() AS cnt FROM metrics_data WHERE data_source_id = {dsId:String}`,
            { dsId: dataSourceId }
        );
        const totalRecords = Number(countResult?.cnt || 0);

        if (totalRecords === 0) {
            return {
                totalRecords: 0,
                dateRange: { earliest: null, latest: null },
                levelsWithData: [],
                dimensionCoverage: {},
                metricCoverage: {},
            };
        }

        // Batch: run range + levels + coverage in parallel instead of sequentially
        const [rangeResult, levelRows, dimCoverageResult, metCoverageResult] = await Promise.all([
            chQueryOne<{ earliest: string; latest: string }>(
                `SELECT toString(min(date)) AS earliest, toString(max(date)) AS latest FROM metrics_data WHERE data_source_id = {dsId:String}`,
                { dsId: dataSourceId }
            ),
            chQuery<{ level: string }>(
                `SELECT DISTINCT level FROM metrics_data WHERE data_source_id = {dsId:String}`,
                { dsId: dataSourceId }
            ),
            // Batch dimension coverage — single query instead of N individual queries
            (async () => {
                const dimParts = [...KNOWN_DIMENSIONS].map((dim: string) =>
                    `countIf(${dim} IS NOT NULL AND ${dim} != '') AS dim_${dim}`
                );
                if (dimParts.length === 0) return {};
                const result = await chQueryOne<Record<string, string>>(
                    `SELECT ${dimParts.join(', ')} FROM metrics_data WHERE data_source_id = {dsId:String}`,
                    { dsId: dataSourceId }
                );
                const coverage: Record<string, number> = {};
                if (result) {
                    for (const dim of KNOWN_DIMENSIONS) {
                        const cnt = Number(result[`dim_${dim}`] || 0);
                        if (cnt > 0) coverage[dim] = Math.round((cnt / totalRecords) * 100);
                    }
                }
                return coverage;
            })(),
            // Batch metric coverage — single query instead of N individual queries
            (async () => {
                const metParts = [...KNOWN_METRICS].map((met: string) =>
                    `countIf(${met} > 0) AS met_${met}`
                );
                if (metParts.length === 0) return {};
                const result = await chQueryOne<Record<string, string>>(
                    `SELECT ${metParts.join(', ')} FROM metrics_data WHERE data_source_id = {dsId:String}`,
                    { dsId: dataSourceId }
                );
                const coverage: Record<string, number> = {};
                if (result) {
                    for (const met of KNOWN_METRICS) {
                        const cnt = Number(result[`met_${met}`] || 0);
                        if (cnt > 0) coverage[met] = Math.round((cnt / totalRecords) * 100);
                    }
                }
                return coverage;
            })(),
        ]);

        return {
            totalRecords,
            dateRange: {
                earliest: rangeResult ? new Date(rangeResult.earliest) : null,
                latest: rangeResult ? new Date(rangeResult.latest) : null,
            },
            levelsWithData: levelRows.map(r => r.level),
            dimensionCoverage: dimCoverageResult,
            metricCoverage: metCoverageResult,
        };
    }

    // ─── Internal Pipeline Steps ───

    private validateRow(
        dimensions: Record<string, string | number | boolean>,
        metrics: Record<string, number>
    ): ValidationResult {
        const warnings: string[] = [];

        if (Object.keys(dimensions).length === 0) {
            warnings.push('Row has no dimensions');
            return { valid: false, warnings, droppedRows: 1 };
        }

        if (Object.keys(metrics).length === 0) {
            warnings.push('Row has no metrics');
            return { valid: false, warnings, droppedRows: 1 };
        }

        for (const [key, value] of Object.entries(metrics)) {
            if (isNaN(value)) {
                warnings.push(`Metric "${key}" is NaN`);
            }
        }

        return { valid: true, warnings, droppedRows: 0 };
    }

    private mapDimensions(
        rawDimensions: Record<string, string | number | boolean>,
        mappings: DimensionMapping[]
    ): Record<string, string | number | boolean> {
        const result: Record<string, string | number | boolean> = {};

        for (const mapping of mappings) {
            const rawValue = rawDimensions[mapping.platformField];
            if (rawValue !== undefined && rawValue !== null) {
                result[mapping.canonicalField] = mapping.transform
                    ? mapping.transform(rawValue as string | number)
                    : rawValue;
            }
        }

        // Unmapped dimensions get prefixed
        for (const [key, value] of Object.entries(rawDimensions)) {
            const isMapped = mappings.some(m => m.platformField === key);
            if (!isMapped && value !== undefined && value !== null) {
                result[`_raw_${key}`] = value;
            }
        }

        return result;
    }

    private mapMetrics(
        rawMetrics: Record<string, number>,
        mappings: MetricMapping[]
    ): Record<string, number> {
        const result: Record<string, number> = {};

        for (const mapping of mappings) {
            const rawValue = rawMetrics[mapping.platformField];
            if (rawValue !== undefined && rawValue !== null) {
                result[mapping.canonicalField] = mapping.transform
                    ? mapping.transform(rawValue)
                    : rawValue;
            }
        }

        for (const [key, value] of Object.entries(rawMetrics)) {
            const isMapped = mappings.some(m => m.platformField === key);
            if (!isMapped && value !== undefined && value !== null) {
                result[`_raw_${key}`] = value;
            }
        }

        return result;
    }

    private convertCurrency(
        metrics: Record<string, number>,
        fromCurrency: string,
        toCurrency: string
    ): Record<string, number> {
        const fromRate = CURRENCY_RATES[fromCurrency.toUpperCase()];
        const toRate = CURRENCY_RATES[toCurrency.toUpperCase()];

        if (!fromRate || !toRate) return metrics;

        const conversionRate = toRate / fromRate;
        const currencyMetrics = ['cost', 'conversion_value', 'revenue', 'cpc', 'cpm', 'cost_per_conversion', 'aov'];
        const result = { ...metrics };

        for (const metric of currencyMetrics) {
            if (result[metric] !== undefined) {
                result[metric] = Math.round(result[metric] * conversionRate * 100) / 100;
            }
        }

        return result;
    }

    private cleanDimensions(dims: Record<string, string | number | boolean>): Record<string, string | number | boolean> {
        const result: Record<string, string | number | boolean> = {};

        for (const [key, value] of Object.entries(dims)) {
            if (value === undefined || value === null) continue;

            if (typeof value === 'string') {
                const trimmed = value.trim();
                if (trimmed.length > 0) {
                    result[key] = trimmed;
                }
            } else {
                result[key] = value;
            }
        }

        return result;
    }

    private cleanMetrics(mets: Record<string, number>): Record<string, number> {
        const result: Record<string, number> = {};

        for (const [key, value] of Object.entries(mets)) {
            if (value === undefined || value === null) continue;
            if (isNaN(value)) continue;
            result[key] = Math.round(value * 10000) / 10000;
        }

        return result;
    }

    /**
     * Wait for all pending ClickHouse mutations on metrics_data to complete.
     * Polls system.mutations every 200ms, max 15 seconds.
     */
    private async waitForMutations(): Promise<void> {
        const maxAttempts = 75; // 75 × 200ms = 15 seconds
        for (let i = 0; i < maxAttempts; i++) {
            try {
                const pending = await query<{ cnt: string }>(
                    `SELECT count() AS cnt FROM system.mutations WHERE database = 'evalco' AND table = 'metrics_data' AND is_done = 0`
                );
                const count = parseInt(pending[0]?.cnt || '0', 10);
                if (count === 0) return;
            } catch {
                // If we can't check mutations, fall through after a brief wait
                await new Promise(r => setTimeout(r, 500));
                return;
            }
            await new Promise(r => setTimeout(r, 200));
        }
        // If we exceed max wait, continue anyway — FINAL keyword on queries acts as safety net
        console.warn('[NormalizationService] Mutation wait timeout (15s), proceeding with insert');
    }

    /**
     * Dimensions that define row identity (used for dedup hash).
     * Attribute dimensions (bidding_strategy_type, campaign_budget, etc.)
     * are excluded because they're properties of an entity, not identifiers.
     */
    private static IDENTITY_DIMENSIONS = new Set([
        'date', 'campaign_id', 'campaign_name', 'campaign_type', 'campaign_status',
        'ad_group_id', 'ad_group_name', 'ad_group_status',
        'ad_id', 'ad_name', 'ad_type',
        'keyword_text', 'keyword_match_type',
        'device', 'country', 'network',
        'age', 'gender', 'placement', 'publisher_platform',
        'source', 'medium', 'page_path', 'page_title', 'landing_page',
        'session_source', 'session_medium', 'session_campaign_name', 'browser',
        'hour_of_day', 'slot',
        'conversion_action_name', 'conversion_action_category',
    ]);

    private generateHash(
        dataSourceId: string,
        date: Date,
        dimensions: Record<string, string | number | boolean>,
        level: string
    ): string {
        // Only use identity dimensions for hashing, not attribute dimensions
        const sortedDims = Object.keys(dimensions)
            .filter(k => !k.startsWith('_raw_') && NormalizationService.IDENTITY_DIMENSIONS.has(k))
            .sort()
            .map(k => `${k}=${dimensions[k]}`)
            .join('|');

        const input = `${dataSourceId}:${date.toISOString().split('T')[0]}:${level}:${sortedDims}`;
        return crypto.createHash('sha256').update(input).digest('hex');
    }

    /**
     * Generate a checksum of all values in a ClickHouse row for DELTA comparison.
     * This captures dimension + metric changes, not just identity changes.
     */
    private generateRowChecksum(row: Record<string, unknown>): string {
        const sortedValues = Object.keys(row)
            .filter(k => k !== 'canonical_hash' && k !== 'updated_at' && k !== 'created_at')
            .sort()
            .map(k => `${k}=${row[k]}`)
            .join('|');
        return crypto.createHash('md5').update(sortedValues).digest('hex');
    }

    /**
     * Flatten normalized dimensions and metrics objects into a
     * flat ClickHouse row with real columns.
     */
    private flattenToClickHouseRow(record: {
        canonicalHash: string;
        dataSourceId: string;
        accountId: string | null;
        projectId: string;
        connectorSlug: string;
        date: Date;
        level: string;
        dimensions: Record<string, string | number | boolean>;
        metrics: Record<string, number>;
    }): Record<string, unknown> {
        const row: Record<string, unknown> = {
            canonical_hash: record.canonicalHash,
            data_source_id: record.dataSourceId,
            account_id: record.accountId,
            client_id: record.projectId,
            connector_slug: record.connectorSlug,
            date: record.date.toISOString().split('T')[0],
            level: record.level,
            updated_at: new Date().toISOString().replace('T', ' ').split('.')[0],
        };

        // Dimensions that require numeric values in ClickHouse
        const NUMERIC_DIMENSIONS = new Set(['campaign_budget', 'hour_of_day', 'ad_group_cpc_bid']);

        // Flatten known dimensions into columns, extras into JSON
        const extraDims: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(record.dimensions)) {
            if (key === 'date') continue; // date is already a top-level column
            if (KNOWN_DIMENSIONS.has(key)) {
                if (NUMERIC_DIMENSIONS.has(key)) {
                    const numVal = Number(value);
                    row[key] = isNaN(numVal) ? null : numVal;
                } else {
                    row[key] = value === undefined || value === null ? null : String(value);
                }
            } else {
                extraDims[key] = value;
            }
        }
        if (Object.keys(extraDims).length > 0) {
            row.extra_dimensions = JSON.stringify(extraDims);
        }

        // Flatten known metrics into columns, extras into JSON
        const extraMets: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(record.metrics)) {
            if (KNOWN_METRICS.has(key)) {
                row[key] = value;
            } else {
                extraMets[key] = value;
            }
        }
        if (Object.keys(extraMets).length > 0) {
            row.extra_metrics = JSON.stringify(extraMets);
        }

        return row;
    }
}

export const normalizationService = new NormalizationService();
