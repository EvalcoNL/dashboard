// ═══════════════════════════════════════════════════════════════════
// E-commerce Normalization Service
// Transforms raw e-commerce order data → universal format → ClickHouse order_data
// ═══════════════════════════════════════════════════════════════════

import { insert, command, query } from '@/lib/clickhouse';
import { connectorRegistry } from './connector-registry';
import { getKnownOrderDimensions, getKnownOrderMetrics, getPIIDimensions } from './ecommerce-field-registry';
import crypto from 'crypto';
import type { DimensionMapping, MetricMapping } from '@/types/data-integration';

const KNOWN_DIMENSIONS = getKnownOrderDimensions();
const KNOWN_METRICS = getKnownOrderMetrics();
const PII_FIELDS = getPIIDimensions();

interface EcomNormalizeConfig {
    dataSourceId: string;
    projectId: string;
    connectorSlug: string;
    piiEnabled: boolean;
    orders: EcomRawOrder[];
}

export interface EcomRawOrder {
    /** 'order' or 'line_item' */
    recordType: 'order' | 'line_item';
    dimensions: Record<string, string | number | boolean>;
    metrics: Record<string, number>;
}

interface EcomNormalizationResult {
    storedCount: number;
    totalRows: number;
    newOrders: number;
    updatedOrders: number;
    warnings: string[];
}

export class EcomNormalizationService {

    async normalizeAndStore(config: EcomNormalizeConfig): Promise<EcomNormalizationResult> {
        const connector = connectorRegistry.getOrThrow(config.connectorSlug);
        const dimensionMappings = connector.getDimensionMappings();
        const metricMappings = connector.getMetricMappings();

        const warnings: string[] = [];
        const clickhouseRows: Record<string, unknown>[] = [];

        for (const order of config.orders) {
            // Map dimensions (platform → canonical)
            const normalizedDims = this.mapDimensions(order.dimensions, dimensionMappings);

            // Strip PII if not enabled
            if (!config.piiEnabled) {
                for (const piiField of PII_FIELDS) {
                    delete normalizedDims[piiField];
                }
            }

            // Map metrics
            const normalizedMetrics = this.mapMetrics(order.metrics, metricMappings);

            // Generate dedup hash
            const orderHash = this.generateHash(
                config.dataSourceId,
                String(normalizedDims.order_id || ''),
                order.recordType,
                String(normalizedDims.line_item_id || '')
            );

            // Flatten to ClickHouse row
            const chRow = this.flattenToRow({
                orderHash,
                dataSourceId: config.dataSourceId,
                projectId: config.projectId,
                connectorSlug: config.connectorSlug,
                recordType: order.recordType,
                dimensions: normalizedDims,
                metrics: normalizedMetrics,
            });

            clickhouseRows.push(chRow);
        }

        let storedCount = 0;
        let newOrders = 0;
        let updatedOrders = 0;

        if (clickhouseRows.length > 0) {
            try {
                // Fetch existing hashes for this data source
                const existingRows = await query<{ order_hash: string }>(`
                    SELECT order_hash FROM order_data FINAL
                    WHERE data_source_id = '${config.dataSourceId}'
                `);
                const existingHashes = new Set(existingRows.map(r => r.order_hash));

                const incomingHashes = new Set(clickhouseRows.map(r => String(r.order_hash)));

                // Count new vs updated
                for (const row of clickhouseRows) {
                    const hash = String(row.order_hash);
                    if (existingHashes.has(hash)) {
                        updatedOrders++;
                    } else {
                        newOrders++;
                    }
                }

                // Delete stale rows that no longer exist
                const staleHashes: string[] = [];
                for (const hash of existingHashes) {
                    if (!incomingHashes.has(hash)) staleHashes.push(hash);
                }
                if (staleHashes.length > 0) {
                    const hashList = staleHashes.map(h => `'${h}'`).join(',');
                    await command(`
                        ALTER TABLE order_data DELETE
                        WHERE data_source_id = '${config.dataSourceId}'
                          AND order_hash IN (${hashList})
                    `);
                }

                // Insert all rows (ReplacingMergeTree handles dedup by update_at)
                const chunkSize = 10000;
                for (let i = 0; i < clickhouseRows.length; i += chunkSize) {
                    const chunk = clickhouseRows.slice(i, i + chunkSize);
                    await insert('order_data', chunk);
                    storedCount += chunk.length;
                }

                console.log(
                    `[EcomNormalization] ${config.connectorSlug}: ` +
                    `${newOrders} new, ${updatedOrders} updated, ${staleHashes.length} deleted`
                );
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                console.error('[EcomNormalization] ClickHouse insert failed:', message);
                warnings.push(`ClickHouse insert failed: ${message}`);
            }
        }

        return {
            storedCount,
            totalRows: config.orders.length,
            newOrders,
            updatedOrders,
            warnings,
        };
    }

    // ─── Internal Methods ────────────────────────────────────────

    private mapDimensions(
        raw: Record<string, string | number | boolean>,
        mappings: DimensionMapping[]
    ): Record<string, string | number | boolean> {
        const result: Record<string, string | number | boolean> = {};

        for (const mapping of mappings) {
            const rawValue = raw[mapping.platformField];
            if (rawValue !== undefined && rawValue !== null) {
                result[mapping.canonicalField] = mapping.transform
                    ? mapping.transform(rawValue as string | number)
                    : rawValue;
            }
        }

        // Unmapped → prefix with _raw_
        for (const [key, value] of Object.entries(raw)) {
            const isMapped = mappings.some(m => m.platformField === key);
            if (!isMapped && value !== undefined && value !== null) {
                result[`_raw_${key}`] = value;
            }
        }

        return result;
    }

    private mapMetrics(
        raw: Record<string, number>,
        mappings: MetricMapping[]
    ): Record<string, number> {
        const result: Record<string, number> = {};

        for (const mapping of mappings) {
            const rawValue = raw[mapping.platformField];
            if (rawValue !== undefined && rawValue !== null) {
                result[mapping.canonicalField] = mapping.transform
                    ? mapping.transform(rawValue)
                    : rawValue;
            }
        }

        for (const [key, value] of Object.entries(raw)) {
            const isMapped = mappings.some(m => m.platformField === key);
            if (!isMapped && value !== undefined && value !== null) {
                result[`_raw_${key}`] = value;
            }
        }

        return result;
    }

    private generateHash(
        dataSourceId: string,
        orderId: string,
        recordType: string,
        lineItemId: string
    ): string {
        const input = `${dataSourceId}:${orderId}:${recordType}:${lineItemId}`;
        return crypto.createHash('sha256').update(input).digest('hex');
    }

    private flattenToRow(record: {
        orderHash: string;
        dataSourceId: string;
        projectId: string;
        connectorSlug: string;
        recordType: string;
        dimensions: Record<string, string | number | boolean>;
        metrics: Record<string, number>;
    }): Record<string, unknown> {
        const row: Record<string, unknown> = {
            order_hash: record.orderHash,
            data_source_id: record.dataSourceId,
            client_id: record.projectId,
            connector_slug: record.connectorSlug,
            record_type: record.recordType,
            updated_at: new Date().toISOString().replace('T', ' ').split('.')[0],
        };

        // Flatten dimensions
        const extraDims: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(record.dimensions)) {
            if (KNOWN_DIMENSIONS.has(key)) {
                // Handle datetime fields specially
                if (key === 'order_date' || key === 'order_updated_at') {
                    const dateStr = String(value);
                    row[key] = dateStr.includes('T')
                        ? dateStr.replace('T', ' ').replace('Z', '').split('.')[0]
                        : dateStr;
                } else {
                    row[key] = value === undefined || value === null ? null : value;
                }
            } else if (!key.startsWith('_raw_')) {
                extraDims[key] = value;
            } else {
                extraDims[key.replace('_raw_', '')] = value;
            }
        }
        if (Object.keys(extraDims).length > 0) {
            row.extra_dimensions = JSON.stringify(extraDims);
        }

        // Flatten metrics
        const extraMets: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(record.metrics)) {
            if (KNOWN_METRICS.has(key)) {
                row[key] = Math.round(value * 100) / 100;
            } else if (!key.startsWith('_raw_')) {
                extraMets[key] = value;
            } else {
                extraMets[key.replace('_raw_', '')] = value;
            }
        }
        if (Object.keys(extraMets).length > 0) {
            row.extra_metrics = JSON.stringify(extraMets);
        }

        return row;
    }
}

export const ecomNormalizationService = new EcomNormalizationService();
