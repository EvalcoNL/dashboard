// ═══════════════════════════════════════════════════════════════════
// TikTok Ads Connector
// ═══════════════════════════════════════════════════════════════════

import { BaseConnector } from '@/lib/data-integration/base-connector';
import type {
    AuthResult,
    DiscoveredAccount,
    DataLevel,
    FetchConfig,
    FetchResponse,
    DimensionMapping,
    MetricMapping,
    ConnectorCategory,
    AuthType,
    CanonicalDimension,
    CanonicalMetric,
} from '@/types/data-integration';

interface TikTokAdsCredentials {
    accessToken: string;
    advertiserId?: string;
}

const TIKTOK_API = 'https://business-api.tiktok.com/open_api/v1.3';
const TIKTOK_AUTH = 'https://business-api.tiktok.com/portal/auth';

/**
 * TikTok Ads connector using the Marketing API.
 *
 * Supported levels:
 * - campaign: Campaign-level metrics
 * - ad_group: Ad group-level metrics
 * - ad: Individual ad metrics
 */
export class TikTokAdsConnector extends BaseConnector {
    readonly slug = 'tiktok-ads';
    readonly name = 'TikTok Ads';
    readonly category: ConnectorCategory = 'PAID_SOCIAL';
    readonly authType: AuthType = 'oauth2';

    constructor() {
        super();
        this.rateLimitPerMinute = 60;
    }

    // ─── Authentication ───

    async getAuthUrl(redirectUri: string, state?: string): Promise<string> {
        const appId = process.env.TIKTOK_APP_ID || '';
        const params = new URLSearchParams({
            app_id: appId,
            redirect_uri: redirectUri,
            ...(state && { state }),
        });
        return `${TIKTOK_AUTH}?${params.toString()}`;
    }

    async authenticate(params: Record<string, string>): Promise<AuthResult> {
        try {
            const { auth_code } = params;
            const appId = process.env.TIKTOK_APP_ID || '';
            const secret = process.env.TIKTOK_APP_SECRET || '';

            const response = await fetch(`${TIKTOK_API}/oauth2/access_token/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    app_id: appId,
                    secret,
                    auth_code,
                }),
            });

            const data = await response.json();
            if (data.code !== 0) {
                return { success: false, error: data.message || 'Auth failed' };
            }

            return {
                success: true,
                accessToken: data.data.access_token,
            };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Auth failed' };
        }
    }

    async testConnection(credentials: string): Promise<boolean> {
        try {
            const accounts = await this.getAvailableAccounts(credentials);
            return accounts.length > 0;
        } catch {
            return false;
        }
    }

    // ─── Discovery ───

    async getAvailableAccounts(credentials: string): Promise<DiscoveredAccount[]> {
        const creds = this.parseCredentials<TikTokAdsCredentials>(credentials);
        const appId = process.env.TIKTOK_APP_ID || '';

        const response = await this.retryWithBackoff(async () => {
            const res = await fetch(`${TIKTOK_API}/oauth2/advertiser/get/?app_id=${appId}&secret=${process.env.TIKTOK_APP_SECRET || ''}&access_token=${creds.accessToken}`, {
                method: 'GET',
                headers: { 'Access-Token': creds.accessToken },
            });
            return res.json();
        });

        if (response.code !== 0 || !response.data?.list) return [];

        return response.data.list.map((adv: { advertiser_id: string; advertiser_name: string }) => ({
            externalId: String(adv.advertiser_id),
            name: adv.advertiser_name || String(adv.advertiser_id),
        }));
    }

    // ─── Levels & Defaults ───

    getSupportedLevels(): DataLevel[] {
        return [
            {
                slug: 'campaign',
                name: 'Campaign Level',
                description: 'Performance data per campaign per day',
                defaultDimensions: ['date', 'campaign_id', 'campaign_name'],
                optionalDimensions: ['age', 'gender', 'country'],
                defaultMetrics: ['impressions', 'clicks', 'cost', 'conversions', 'conversion_value', 'reach', 'frequency', 'video_views', 'engagements', 'likes', 'comments', 'shares', 'follows'],
                optionalMetrics: ['ctr', 'cpc', 'cpm', 'roas', 'conversion_rate'],
            },
            {
                slug: 'ad_group',
                name: 'Ad Group Level',
                description: 'Performance data per ad group per day',
                defaultDimensions: ['date', 'campaign_id', 'campaign_name', 'ad_group_id', 'ad_group_name'],
                optionalDimensions: ['age', 'gender', 'country'],
                defaultMetrics: ['impressions', 'clicks', 'cost', 'conversions', 'conversion_value', 'reach', 'frequency', 'video_views', 'engagements', 'likes', 'comments', 'shares'],
                optionalMetrics: ['ctr', 'cpc', 'cpm'],
            },
            {
                slug: 'ad',
                name: 'Ad Level',
                description: 'Performance data per ad per day',
                defaultDimensions: ['date', 'campaign_id', 'campaign_name', 'ad_group_id', 'ad_group_name', 'ad_id', 'ad_name'],
                optionalDimensions: ['age', 'gender', 'country'],
                defaultMetrics: ['impressions', 'clicks', 'cost', 'conversions', 'conversion_value', 'reach', 'frequency', 'video_views', 'engagements', 'likes', 'comments', 'shares'],
                optionalMetrics: ['ctr', 'cpc', 'cpm'],
            },
        ];
    }

    // ─── Data Fetching ───

    async fetchData(credentials: string, config: FetchConfig): Promise<FetchResponse> {
        const creds = this.parseCredentials<TikTokAdsCredentials>(credentials);
        const startDate = this.formatDate(config.dateFrom);
        const endDate = this.formatDate(config.dateTo);
        const advertiserId = config.accountId;

        const dataLevel = this.getApiLevel(config.level);
        const dimensions = this.getApiDimensions(config.level, config.dimensions);
        const metrics = this.getApiMetrics(config.metrics);

        const allRows: Record<string, unknown>[] = [];
        let page = 1;
        let hasMore = true;

        while (hasMore) {
            const response = await this.retryWithBackoff(async () => {
                const res = await fetch(`${TIKTOK_API}/report/integrated/get/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Token': creds.accessToken,
                    },
                    body: JSON.stringify({
                        advertiser_id: advertiserId,
                        report_type: 'BASIC',
                        data_level: dataLevel,
                        dimensions,
                        metrics,
                        start_date: startDate,
                        end_date: endDate,
                        page,
                        page_size: 1000,
                    }),
                });
                return res.json();
            });

            if (response.code !== 0) {
                throw new Error(`TikTok API Error: ${response.message}`);
            }

            if (response.data?.list) {
                allRows.push(...response.data.list);
            }

            const totalPages = Math.ceil((response.data?.page_info?.total_number || 0) / 1000);
            hasMore = page < totalPages;
            page++;
        }

        const rows = allRows.map(row => ({
            dimensions: this.extractDimensions(row, config.level),
            metrics: this.extractMetrics(row),
        }));

        return {
            rows,
            totalRows: rows.length,
            metadata: { level: config.level, dataLevel },
        };
    }

    // ─── Field Mapping ───

    getDimensionMappings(): DimensionMapping[] {
        return [
            { platformField: 'stat_time_day', canonicalField: 'date' as CanonicalDimension },
            { platformField: 'campaign_id', canonicalField: 'campaign_id' as CanonicalDimension },
            { platformField: 'campaign_name', canonicalField: 'campaign_name' as CanonicalDimension },
            { platformField: 'adgroup_id', canonicalField: 'ad_group_id' as CanonicalDimension },
            { platformField: 'adgroup_name', canonicalField: 'ad_group_name' as CanonicalDimension },
            { platformField: 'ad_id', canonicalField: 'ad_id' as CanonicalDimension },
            { platformField: 'ad_name', canonicalField: 'ad_name' as CanonicalDimension },
            { platformField: 'age', canonicalField: 'age' as CanonicalDimension },
            { platformField: 'gender', canonicalField: 'gender' as CanonicalDimension },
            { platformField: 'country_code', canonicalField: 'country' as CanonicalDimension },
        ];
    }

    getMetricMappings(): MetricMapping[] {
        return [
            { platformField: 'impressions', canonicalField: 'impressions' as CanonicalMetric },
            { platformField: 'clicks', canonicalField: 'clicks' as CanonicalMetric },
            { platformField: 'spend', canonicalField: 'cost' as CanonicalMetric },
            { platformField: 'conversion', canonicalField: 'conversions' as CanonicalMetric },
            { platformField: 'total_complete_payment_rate', canonicalField: 'conversion_value' as CanonicalMetric },
            { platformField: 'video_views_p100', canonicalField: 'video_views' as CanonicalMetric },
            { platformField: 'reach', canonicalField: 'reach' as CanonicalMetric },
        ];
    }

    // ─── Private Helpers ───

    private getApiLevel(level: string): string {
        switch (level) {
            case 'campaign': return 'AUCTION_CAMPAIGN';
            case 'ad_group': return 'AUCTION_ADGROUP';
            case 'ad': return 'AUCTION_AD';
            default: return 'AUCTION_CAMPAIGN';
        }
    }

    private getApiDimensions(level: string, requestedDims: string[]): string[] {
        const dims = ['stat_time_day'];

        if (level === 'campaign' || level === 'ad_group' || level === 'ad') {
            dims.push('campaign_id');
        }
        if (level === 'ad_group' || level === 'ad') {
            dims.push('adgroup_id');
        }
        if (level === 'ad') {
            dims.push('ad_id');
        }

        // Optional breakdown dimensions
        const breakdownMap: Record<string, string> = {
            age: 'age', gender: 'gender', country: 'country_code',
        };
        for (const dim of requestedDims) {
            if (breakdownMap[dim]) dims.push(breakdownMap[dim]);
        }

        return dims;
    }

    private getApiMetrics(requestedMetrics: string[]): string[] {
        const metricMap: Record<string, string> = {
            impressions: 'impressions',
            clicks: 'clicks',
            cost: 'spend',
            conversions: 'conversion',
            conversion_value: 'total_complete_payment_rate',
            video_views: 'video_views_p100',
            reach: 'reach',
            ctr: 'ctr',
            cpc: 'cpc',
            cpm: 'cpm',
        };

        const metrics: string[] = [];
        for (const m of requestedMetrics) {
            if (metricMap[m]) metrics.push(metricMap[m]);
        }

        // Always include base metrics
        const required = ['impressions', 'clicks', 'spend', 'conversion'];
        for (const r of required) {
            if (!metrics.includes(r)) metrics.push(r);
        }

        return metrics;
    }

    private extractDimensions(row: Record<string, unknown>, level: string): Record<string, string | number | boolean> {
        const dims: Record<string, string | number | boolean> = {};
        const dimensions = row.dimensions as Record<string, string> | undefined;
        const metricsObj = row.metrics as Record<string, string> | undefined;

        if (dimensions) {
            if (dimensions.stat_time_day) dims.date = dimensions.stat_time_day.split(' ')[0]; // "2024-01-01 00:00:00" → "2024-01-01"
            if (dimensions.campaign_id) dims.campaign_id = dimensions.campaign_id;
            if (dimensions.adgroup_id) dims.ad_group_id = dimensions.adgroup_id;
            if (dimensions.ad_id) dims.ad_id = dimensions.ad_id;
            if (dimensions.age) dims.age = dimensions.age;
            if (dimensions.gender) dims.gender = dimensions.gender;
            if (dimensions.country_code) dims.country = dimensions.country_code;
        }

        // TikTok returns campaign_name in metrics object
        if (metricsObj) {
            if (metricsObj.campaign_name) dims.campaign_name = metricsObj.campaign_name;
            if (metricsObj.adgroup_name) dims.ad_group_name = metricsObj.adgroup_name;
            if (metricsObj.ad_name) dims.ad_name = metricsObj.ad_name;
        }

        return dims;
    }

    private extractMetrics(row: Record<string, unknown>): Record<string, number> {
        const mets: Record<string, number> = {};
        const metrics = row.metrics as Record<string, string> | undefined;

        if (!metrics) return mets;

        if (metrics.impressions) mets.impressions = Number(metrics.impressions);
        if (metrics.clicks) mets.clicks = Number(metrics.clicks);
        if (metrics.spend) mets.cost = Number(metrics.spend);
        if (metrics.conversion) mets.conversions = Number(metrics.conversion);
        // Fix: use total_on_web_order_value for conversion value (was incorrectly using total_complete_payment_rate)
        if (metrics.total_on_web_order_value) mets.conversion_value = Number(metrics.total_on_web_order_value);
        if (metrics.video_views_p100) mets.video_views = Number(metrics.video_views_p100);
        if (metrics.reach) mets.reach = Number(metrics.reach);
        if (metrics.frequency) mets.frequency = Number(metrics.frequency);
        if (metrics.likes) mets.likes = Number(metrics.likes);
        if (metrics.comments) mets.comments = Number(metrics.comments);
        if (metrics.shares) mets.shares = Number(metrics.shares);
        if (metrics.follows) mets.follows = Number(metrics.follows);
        if (metrics.profile_visits) mets.engagements = Number(metrics.profile_visits);

        return mets;
    }
}
