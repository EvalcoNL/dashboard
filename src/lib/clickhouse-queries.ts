// ═══════════════════════════════════════════════════════════════════
// ClickHouse Queries — Analytical query layer
// Replaces in-memory JavaScript aggregation with direct SQL
// ═══════════════════════════════════════════════════════════════════

import { query, queryOne } from '@/lib/clickhouse';

// ─── Types ───

export interface DailyMetric {
    date: string;
    impressions: number;
    clicks: number;
    cost: number;
    conversions: number;
    conversion_value: number;
    video_views: number;
    sessions: number;
    page_views: number;
}

export interface AggregatedMetrics {
    impressions: number;
    clicks: number;
    cost: number;
    conversions: number;
    conversion_value: number;
    video_views: number;
    sessions: number;
    record_count: number;
}

export interface CampaignMetric {
    campaign_id: string;
    campaign_name: string;
    campaign_type: string;
    date: string;
    impressions: number;
    clicks: number;
    cost: number;
    conversions: number;
    conversion_value: number;
    status: string;
}

export interface ConnectorBreakdown {
    connector_slug: string;
    impressions: number;
    clicks: number;
    cost: number;
    conversions: number;
    conversion_value: number;
    record_count: number;
}

// ─── Query Functions ───

/**
 * Check if a client has any data in ClickHouse.
 */
export async function hasData(clientId: string): Promise<boolean> {
    const result = await queryOne<{ cnt: string }>(
        `SELECT count() AS cnt FROM metrics_data FINAL WHERE client_id = {clientId:String} LIMIT 1`,
        { clientId }
    );
    return Number(result?.cnt || 0) > 0;
}

/**
 * Count total records for a client.
 */
export async function countRecords(clientId: string): Promise<number> {
    const result = await queryOne<{ cnt: string }>(
        `SELECT count() AS cnt FROM metrics_data FINAL WHERE client_id = {clientId:String}`,
        { clientId }
    );
    return Number(result?.cnt || 0);
}

/**
 * Aggregate all metrics for a client within a date range.
 */
export async function aggregateMetrics(
    clientId: string,
    dateFrom: Date,
    dateTo?: Date
): Promise<AggregatedMetrics> {
    const params: Record<string, string> = {
        clientId,
        dateFrom: fmtDate(dateFrom),
    };

    let dateFilter = `date >= toDate({dateFrom:String})`;
    if (dateTo) {
        dateFilter += ` AND date <= toDate({dateTo:String})`;
        params.dateTo = fmtDate(dateTo);
    }

    const result = await queryOne<AggregatedMetrics>(`
        SELECT
            sum(impressions)        AS impressions,
            sum(clicks)             AS clicks,
            sum(cost)               AS cost,
            sum(conversions)        AS conversions,
            sum(conversion_value)   AS conversion_value,
            sum(video_views)        AS video_views,
            sum(sessions)           AS sessions,
            count()                 AS record_count
        FROM metrics_data FINAL
        WHERE client_id = {clientId:String}
          AND ${dateFilter}
    `, params);

    return {
        impressions: Number(result?.impressions || 0),
        clicks: Number(result?.clicks || 0),
        cost: Number(result?.cost || 0),
        conversions: Number(result?.conversions || 0),
        conversion_value: Number(result?.conversion_value || 0),
        video_views: Number(result?.video_views || 0),
        sessions: Number(result?.sessions || 0),
        record_count: Number(result?.record_count || 0),
    };
}

/**
 * Get daily aggregated metrics for a client within a date range.
 */
export async function dailyMetrics(
    clientId: string,
    dateFrom: Date,
    dateTo: Date
): Promise<DailyMetric[]> {
    const rows = await query<DailyMetric>(`
        SELECT
            date,
            sum(impressions)        AS impressions,
            sum(clicks)             AS clicks,
            sum(cost)               AS cost,
            sum(conversions)        AS conversions,
            sum(conversion_value)   AS conversion_value,
            sum(video_views)        AS video_views,
            sum(sessions)           AS sessions,
            sum(page_views)         AS page_views
        FROM metrics_data FINAL
        WHERE client_id = {clientId:String}
          AND date >= toDate({dateFrom:String})
          AND date <= toDate({dateTo:String})
        GROUP BY date
        ORDER BY date ASC
    `, {
        clientId,
        dateFrom: fmtDate(dateFrom),
        dateTo: fmtDate(dateTo),
    });

    return rows.map(r => ({
        ...r,
        impressions: Number(r.impressions),
        clicks: Number(r.clicks),
        cost: Number(r.cost),
        conversions: Number(r.conversions),
        conversion_value: Number(r.conversion_value),
        video_views: Number(r.video_views),
        sessions: Number(r.sessions),
        page_views: Number(r.page_views),
    }));
}

/**
 * Get daily metrics broken down by connector (platform).
 */
export async function dailyMetricsByConnector(
    clientId: string,
    dateFrom: Date,
    dateTo: Date
): Promise<(DailyMetric & { connector_slug: string })[]> {
    const rows = await query<DailyMetric & { connector_slug: string }>(`
        SELECT
            date,
            connector_slug,
            sum(impressions)        AS impressions,
            sum(clicks)             AS clicks,
            sum(cost)               AS cost,
            sum(conversions)        AS conversions,
            sum(conversion_value)   AS conversion_value,
            sum(video_views)        AS video_views,
            sum(sessions)           AS sessions,
            sum(page_views)         AS page_views
        FROM metrics_data FINAL
        WHERE client_id = {clientId:String}
          AND date >= toDate({dateFrom:String})
          AND date <= toDate({dateTo:String})
        GROUP BY date, connector_slug
        ORDER BY date ASC, connector_slug
    `, {
        clientId,
        dateFrom: fmtDate(dateFrom),
        dateTo: fmtDate(dateTo),
    });

    return rows.map(r => ({
        ...r,
        impressions: Number(r.impressions),
        clicks: Number(r.clicks),
        cost: Number(r.cost),
        conversions: Number(r.conversions),
        conversion_value: Number(r.conversion_value),
        video_views: Number(r.video_views),
        sessions: Number(r.sessions),
        page_views: Number(r.page_views),
    }));
}

/**
 * Get aggregated metrics broken down by connector.
 */
export async function metricsByConnector(
    clientId: string,
    dateFrom: Date,
    dateTo: Date
): Promise<ConnectorBreakdown[]> {
    const rows = await query<ConnectorBreakdown>(`
        SELECT
            connector_slug,
            sum(impressions)        AS impressions,
            sum(clicks)             AS clicks,
            sum(cost)               AS cost,
            sum(conversions)        AS conversions,
            sum(conversion_value)   AS conversion_value,
            count()                 AS record_count
        FROM metrics_data FINAL
        WHERE client_id = {clientId:String}
          AND date >= toDate({dateFrom:String})
          AND date <= toDate({dateTo:String})
        GROUP BY connector_slug
        ORDER BY cost DESC
    `, {
        clientId,
        dateFrom: fmtDate(dateFrom),
        dateTo: fmtDate(dateTo),
    });

    return rows.map(r => ({
        ...r,
        impressions: Number(r.impressions),
        clicks: Number(r.clicks),
        cost: Number(r.cost),
        conversions: Number(r.conversions),
        conversion_value: Number(r.conversion_value),
        record_count: Number(r.record_count),
    }));
}

/**
 * Get campaign-level metrics for a client.
 * Returns individual campaign rows (like the old CampaignMetric model).
 */
export async function campaignMetrics(
    clientId: string,
    dateFrom: Date,
    dateTo?: Date,
    options?: { orderBy?: 'asc' | 'desc'; limit?: number }
): Promise<CampaignMetric[]> {
    const params: Record<string, string> = {
        clientId,
        dateFrom: fmtDate(dateFrom),
    };

    let dateFilter = `date >= toDate({dateFrom:String})`;
    if (dateTo) {
        dateFilter += ` AND date <= toDate({dateTo:String})`;
        params.dateTo = fmtDate(dateTo);
    }

    const order = options?.orderBy === 'asc' ? 'ASC' : 'DESC';
    const limitClause = options?.limit ? `LIMIT ${options.limit}` : '';

    const rows = await query<CampaignMetric>(`
        SELECT
            campaign_id,
            campaign_name,
            campaign_type,
            date,
            sum(impressions)        AS impressions,
            sum(clicks)             AS clicks,
            sum(cost)               AS cost,
            sum(conversions)        AS conversions,
            sum(conversion_value)   AS conversion_value,
            any(campaign_status)    AS status
        FROM metrics_data FINAL
        WHERE client_id = {clientId:String}
          AND ${dateFilter}
          AND campaign_id IS NOT NULL
        GROUP BY campaign_id, campaign_name, campaign_type, date
        ORDER BY date ${order}
        ${limitClause}
    `, params);

    return rows.map(r => ({
        ...r,
        impressions: Number(r.impressions),
        clicks: Number(r.clicks),
        cost: Number(r.cost),
        conversions: Number(r.conversions),
        conversion_value: Number(r.conversion_value),
    }));
}

/**
 * Get distinct values for a dimension (for filter dropdowns).
 */
export async function distinctDimensionValues(
    clientId: string,
    dimension: string,
    options?: { limit?: number }
): Promise<string[]> {
    // Whitelist of allowed dimension columns to prevent SQL injection
    const allowedDimensions = [
        'campaign_id', 'campaign_name', 'campaign_type', 'campaign_status',
        'ad_group_id', 'ad_group_name', 'ad_group_status',
        'ad_id', 'ad_name', 'ad_type',
        'keyword_text', 'keyword_match_type',
        'device', 'country', 'network',
        'source', 'medium', 'page_path', 'landing_page',
        'connector_slug', 'level',
    ];

    if (!allowedDimensions.includes(dimension)) {
        throw new Error(`Invalid dimension: ${dimension}`);
    }

    const limit = options?.limit || 1000;

    const rows = await query<{ value: string }>(`
        SELECT DISTINCT ${dimension} AS value
        FROM metrics_data FINAL
        WHERE client_id = {clientId:String}
          AND ${dimension} IS NOT NULL
          AND ${dimension} != ''
        ORDER BY value ASC
        LIMIT ${limit}
    `, { clientId });

    return rows.map(r => r.value);
}

/**
 * Get the date range of available data for a client.
 */
export async function dateRange(
    clientId: string
): Promise<{ earliest: string | null; latest: string | null }> {
    const result = await queryOne<{ earliest: string; latest: string }>(`
        SELECT
            toString(min(date)) AS earliest,
            toString(max(date)) AS latest
        FROM metrics_data FINAL
        WHERE client_id = {clientId:String}
    `, { clientId });

    if (!result || result.earliest === '1970-01-01') {
        return { earliest: null, latest: null };
    }

    return { earliest: result.earliest, latest: result.latest };
}

// ─── Helpers ───

function fmtDate(date: Date): string {
    return date.toISOString().split('T')[0];
}
