// ═══════════════════════════════════════════════════════════════════
// Normalized Metric Helpers — ClickHouse Edition
// Bridge between ClickHouse analytics and legacy component formats
// Gracefully returns empty data when ClickHouse is unavailable
// ═══════════════════════════════════════════════════════════════════

import * as chQueries from '@/lib/clickhouse-queries';

// ─── Types (backward compatible) ───

export interface LegacyCampaignMetric {
    campaignId: string;
    campaignName: string;
    campaignType: string;
    date: Date;
    spend: number;
    conversions: number;
    conversionValue: number;
    clicks: number;
    impressions: number;
    status: string;
    servingStatus: string;
}

export interface AggregatedMetrics {
    _sum: {
        spend: number | null;
        conversions: number | null;
        conversionValue: number | null;
        clicks: number | null;
        impressions: number | null;
    };
}

export interface DailyMetric {
    date: Date;
    _sum: {
        spend: number | null;
        conversions: number | null;
        conversionValue: number | null;
        clicks: number | null;
        impressions: number | null;
    };
}

// ─── Query Functions ───

/**
 * Fetch metric records for a client within a date range.
 * Returns data in the legacy CampaignMetric format for backward compatibility.
 */
export async function queryNormalizedMetrics(
    clientId: string,
    dateFrom: Date,
    dateTo?: Date,
    options?: { orderBy?: 'asc' | 'desc'; take?: number }
): Promise<LegacyCampaignMetric[]> {
    try {
        const campaigns = await chQueries.campaignMetrics(clientId, dateFrom, dateTo, {
            orderBy: options?.orderBy,
            limit: options?.take,
        });

        return campaigns.map(c => ({
            campaignId: c.campaign_id || '',
            campaignName: c.campaign_name || 'Unknown',
            campaignType: c.campaign_type || 'UNKNOWN',
            date: new Date(c.date),
            spend: c.cost,
            conversions: c.conversions,
            conversionValue: c.conversion_value,
            clicks: c.clicks,
            impressions: c.impressions,
            status: c.status || 'ENABLED',
            servingStatus: 'ELIGIBLE',
        }));
    } catch (error) {
        console.warn('[normalized-helpers] ClickHouse unavailable, returning empty metrics:', (error as Error).message);
        return [];
    }
}

/**
 * Check if a client has any data in ClickHouse.
 */
export async function hasNormalizedData(clientId: string): Promise<boolean> {
    try {
        return await chQueries.hasData(clientId);
    } catch {
        return false;
    }
}

/**
 * Count total records for a client.
 */
export async function countNormalizedRecords(clientId: string): Promise<number> {
    try {
        return await chQueries.countRecords(clientId);
    } catch {
        return 0;
    }
}

/**
 * Aggregate metrics for a client (totals for a period).
 * Returns in the format used by legacy dashboard components.
 */
export async function aggregateNormalizedMetrics(
    clientId: string,
    dateFrom: Date,
    dateTo?: Date
): Promise<AggregatedMetrics> {
    try {
        const agg = await chQueries.aggregateMetrics(clientId, dateFrom, dateTo);

        return {
            _sum: {
                spend: agg.cost,
                conversions: agg.conversions,
                conversionValue: agg.conversion_value,
                clicks: agg.clicks,
                impressions: agg.impressions,
            },
        };
    } catch (error) {
        console.warn('[normalized-helpers] ClickHouse unavailable for aggregation:', (error as Error).message);
        return {
            _sum: {
                spend: null,
                conversions: null,
                conversionValue: null,
                clicks: null,
                impressions: null,
            },
        };
    }
}

/**
 * Group metrics by date (daily metrics).
 * Returns daily time-series data for charts.
 */
export async function groupNormalizedByDate(
    clientId: string,
    dateFrom: Date,
    dateTo: Date
): Promise<DailyMetric[]> {
    try {
        const daily = await chQueries.dailyMetrics(clientId, dateFrom, dateTo);

        return daily.map(d => ({
            date: new Date(d.date),
            _sum: {
                spend: d.cost,
                conversions: d.conversions,
                conversionValue: d.conversion_value,
                clicks: d.clicks,
                impressions: d.impressions,
            },
        }));
    } catch (error) {
        console.warn('[normalized-helpers] ClickHouse unavailable for daily metrics:', (error as Error).message);
        return [];
    }
}
