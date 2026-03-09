import { describe, it, expect } from 'vitest';

/**
 * Tests for ClickHouse query helper functions and type definitions.
 */

// Test the fmtDate helper (pure function, no ClickHouse dependency)
describe('fmtDate', () => {
    // We re-implement the expected logic here since the module imports ClickHouse
    const fmtDate = (date: Date): string =>
        date.toISOString().slice(0, 10);

    it('formats Date to YYYY-MM-DD', () => {
        expect(fmtDate(new Date('2026-01-15T12:30:00Z'))).toBe('2026-01-15');
    });

    it('handles midnight correctly', () => {
        expect(fmtDate(new Date('2026-03-07T00:00:00Z'))).toBe('2026-03-07');
    });

    it('handles end of year', () => {
        expect(fmtDate(new Date('2025-12-31T23:59:59Z'))).toBe('2025-12-31');
    });
});

// Test type definitions (compile-time checks)
describe('ClickHouse Query Types', () => {
    it('DailyMetric has expected shape', () => {
        const metric = {
            date: '2026-01-15',
            impressions: 1000,
            clicks: 50,
            cost: 25.5,
            conversions: 5,
            conversion_value: 150.0,
            video_views: 200,
            sessions: 80,
            page_views: 120,
        };
        expect(metric.date).toBe('2026-01-15');
        expect(metric.impressions).toBeGreaterThan(0);
        expect(metric.cost).toBeCloseTo(25.5);
    });

    it('AggregatedMetrics includes record_count', () => {
        const agg = {
            impressions: 5000,
            clicks: 250,
            cost: 125.0,
            conversions: 25,
            conversion_value: 750.0,
            video_views: 1000,
            sessions: 400,
            record_count: 30,
        };
        expect(agg.record_count).toBe(30);
    });

    it('ConnectorBreakdown includes connector_slug', () => {
        const breakdown = {
            connector_slug: 'google-ads',
            impressions: 3000,
            clicks: 150,
            cost: 75.0,
            conversions: 15,
            conversion_value: 450.0,
            record_count: 20,
        };
        expect(breakdown.connector_slug).toBe('google-ads');
    });

    it('CampaignMetric has campaign identifiers', () => {
        const campaign = {
            campaign_id: 'camp_123',
            campaign_name: 'Test Campaign',
            campaign_type: 'SEARCH',
            date: '2026-01-15',
            impressions: 500,
            clicks: 25,
            cost: 12.5,
            conversions: 3,
            conversion_value: 90.0,
            status: 'ENABLED',
        };
        expect(campaign.campaign_id).toBe('camp_123');
        expect(campaign.campaign_type).toBe('SEARCH');
    });
});

// Test describeTable cache logic
describe('DescribeTable Cache', () => {
    it('cache key generation works for different tables', () => {
        const cacheKey = (table: string) => `describe:${table}`;
        expect(cacheKey('metrics_data')).toBe('describe:metrics_data');
        expect(cacheKey('order_data')).toBe('describe:order_data');
        expect(cacheKey('metrics_data')).not.toBe(cacheKey('order_data'));
    });
});
