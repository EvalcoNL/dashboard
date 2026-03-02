// ═══════════════════════════════════════════════════════════════════
// Meta Ads Connector — Data Integration Framework Implementation
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

interface MetaAdsCredentials {
    accessToken: string;
    adAccountId?: string;
}

interface MetaInsightsRow {
    date_start: string;
    date_stop: string;
    campaign_id?: string;
    campaign_name?: string;
    adset_id?: string;
    adset_name?: string;
    ad_id?: string;
    ad_name?: string;
    objective?: string;
    impressions?: string;
    clicks?: string;
    spend?: string;
    actions?: Array<{ action_type: string; value: string }>;
    action_values?: Array<{ action_type: string; value: string }>;
    reach?: string;
    frequency?: string;
    ctr?: string;
    cpc?: string;
    cpm?: string;
    unique_clicks?: string;
    unique_actions?: Array<{ action_type: string; value: string }>;
    outbound_clicks?: Array<{ action_type: string; value: string }>;
    video_30_sec_watched_actions?: Array<{ action_type: string; value: string }>;
    // Breakdown fields
    age?: string;
    gender?: string;
    device_platform?: string;
    publisher_platform?: string;
    country?: string;
    placement?: string;
}

const META_GRAPH_API_VERSION = 'v21.0';
const META_GRAPH_API_BASE = `https://graph.facebook.com/${META_GRAPH_API_VERSION}`;

/**
 * Meta Ads connector implementation (Facebook + Instagram Ads).
 * Uses the Marketing API Insights endpoint.
 * 
 * Supported levels:
 * - campaign: Campaign-level metrics (default)
 * - adset: Ad Set-level metrics
 * - ad: Individual ad metrics
 */
export class MetaAdsConnector extends BaseConnector {
    readonly slug = 'meta-ads';
    readonly name = 'Meta Ads';
    readonly category: ConnectorCategory = 'PAID_SOCIAL';
    readonly authType: AuthType = 'oauth2';

    constructor() {
        super();
        this.rateLimitPerMinute = 60;
    }

    // ─── Authentication ───

    async getAuthUrl(redirectUri: string, state?: string): Promise<string> {
        const appId = process.env.META_APP_ID || '';
        const scopes = 'ads_read,ads_management,read_insights';
        const params = new URLSearchParams({
            client_id: appId,
            redirect_uri: redirectUri,
            scope: scopes,
            response_type: 'code',
            ...(state && { state }),
        });
        return `https://www.facebook.com/${META_GRAPH_API_VERSION}/dialog/oauth?${params.toString()}`;
    }

    async authenticate(params: Record<string, string>): Promise<AuthResult> {
        try {
            const { code, redirectUri } = params;
            const appId = process.env.META_APP_ID || '';
            const appSecret = process.env.META_APP_SECRET || '';

            // Exchange code for short-lived token
            const tokenResponse = await fetch(
                `${META_GRAPH_API_BASE}/oauth/access_token?` +
                new URLSearchParams({
                    client_id: appId,
                    client_secret: appSecret,
                    redirect_uri: redirectUri,
                    code,
                })
            );
            const tokenData = await tokenResponse.json();

            if (tokenData.error) {
                return { success: false, error: tokenData.error.message };
            }

            // Exchange for long-lived token
            const longLivedResponse = await fetch(
                `${META_GRAPH_API_BASE}/oauth/access_token?` +
                new URLSearchParams({
                    grant_type: 'fb_exchange_token',
                    client_id: appId,
                    client_secret: appSecret,
                    fb_exchange_token: tokenData.access_token,
                })
            );
            const longLivedData = await longLivedResponse.json();

            if (longLivedData.error) {
                return { success: false, error: longLivedData.error.message };
            }

            return {
                success: true,
                accessToken: longLivedData.access_token,
                expiresAt: new Date(Date.now() + (longLivedData.expires_in || 5184000) * 1000),
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Authentication failed',
            };
        }
    }

    async testConnection(credentials: string): Promise<boolean> {
        try {
            const creds = this.parseCredentials<MetaAdsCredentials>(credentials);
            const response = await fetch(`${META_GRAPH_API_BASE}/me?access_token=${creds.accessToken}`);
            return response.ok;
        } catch {
            return false;
        }
    }

    // ─── Discovery ───

    async getAvailableAccounts(credentials: string): Promise<DiscoveredAccount[]> {
        const creds = this.parseCredentials<MetaAdsCredentials>(credentials);

        const response = await this.retryWithBackoff(async () => {
            const res = await fetch(
                `${META_GRAPH_API_BASE}/me/adaccounts?fields=account_id,name,currency,timezone_name&access_token=${creds.accessToken}`
            );
            return res.json();
        });

        if (!response.data) return [];

        return response.data.map((account: { account_id: string; name: string; currency?: string; timezone_name?: string }) => ({
            externalId: account.account_id,
            name: account.name || account.account_id,
            currency: account.currency || 'EUR',
            timezone: account.timezone_name || 'Europe/Amsterdam',
        }));
    }

    // ─── Levels & Defaults ───

    getSupportedLevels(): DataLevel[] {
        return [
            {
                slug: 'campaign',
                name: 'Campaign Level',
                description: 'Performance data per campaign per day',
                defaultDimensions: ['date', 'campaign_id', 'campaign_name', 'campaign_objective'],
                optionalDimensions: ['age', 'gender', 'device', 'country', 'publisher_platform', 'placement'],
                defaultMetrics: ['impressions', 'clicks', 'cost', 'conversions', 'conversion_value', 'reach', 'frequency', 'unique_clicks', 'link_clicks', 'post_engagement'],
                optionalMetrics: ['video_views', 'ctr', 'cpc', 'cpm', 'roas', 'conversion_rate', 'cost_per_conversion'],
            },
            {
                slug: 'adset',
                name: 'Ad Set Level',
                description: 'Performance data per ad set per day',
                defaultDimensions: ['date', 'campaign_id', 'campaign_name', 'ad_group_id', 'ad_group_name'],
                optionalDimensions: ['age', 'gender', 'device', 'country', 'publisher_platform', 'placement'],
                defaultMetrics: ['impressions', 'clicks', 'cost', 'conversions', 'conversion_value', 'reach', 'frequency', 'unique_clicks', 'link_clicks', 'post_engagement'],
                optionalMetrics: ['video_views', 'ctr', 'cpc', 'cpm'],
            },
            {
                slug: 'ad',
                name: 'Ad Level',
                description: 'Performance data per individual ad per day',
                defaultDimensions: ['date', 'campaign_id', 'campaign_name', 'ad_group_id', 'ad_group_name', 'ad_id', 'ad_name'],
                optionalDimensions: ['age', 'gender', 'device', 'country', 'publisher_platform'],
                defaultMetrics: ['impressions', 'clicks', 'cost', 'conversions', 'conversion_value', 'reach', 'frequency', 'unique_clicks', 'link_clicks', 'post_engagement'],
                optionalMetrics: ['video_views', 'ctr', 'cpc', 'cpm'],
            },
        ];
    }

    // ─── Data Fetching ───

    async fetchData(credentials: string, config: FetchConfig): Promise<FetchResponse> {
        const creds = this.parseCredentials<MetaAdsCredentials>(credentials);
        const startDate = this.formatDate(config.dateFrom);
        const endDate = this.formatDate(config.dateTo);

        // Build the insights API request
        const fields = this.buildInsightsFields(config);
        const breakdowns = this.getBreakdowns(config.dimensions);
        const insightsLevel = this.getInsightsLevel(config.level);

        const accountId = config.accountId.startsWith('act_')
            ? config.accountId
            : `act_${config.accountId}`;

        const allRows: MetaInsightsRow[] = [];
        let nextUrl: string | null = this.buildInsightsUrl(
            accountId, creds.accessToken, fields, breakdowns, insightsLevel, startDate, endDate
        );

        // Paginate through all results
        while (nextUrl) {
            const response = await this.retryWithBackoff(async () => {
                const res = await fetch(nextUrl!);
                return res.json();
            });

            if (response.error) {
                throw new Error(`Meta API Error: ${response.error.message}`);
            }

            if (response.data) {
                allRows.push(...response.data);
            }

            nextUrl = response.paging?.next || null;
        }

        // Transform to universal format
        const rows = allRows.map(row => ({
            dimensions: this.extractDimensions(row, config.level),
            metrics: this.extractMetrics(row),
        }));

        return {
            rows,
            totalRows: rows.length,
            metadata: {
                level: config.level,
                breakdowns,
                dateRange: { from: startDate, to: endDate },
            },
        };
    }

    // ─── Field Mapping ───

    getDimensionMappings(): DimensionMapping[] {
        return [
            { platformField: 'date_start', canonicalField: 'date' as CanonicalDimension },
            { platformField: 'campaign_id', canonicalField: 'campaign_id' as CanonicalDimension },
            { platformField: 'campaign_name', canonicalField: 'campaign_name' as CanonicalDimension },
            { platformField: 'objective', canonicalField: 'campaign_objective' as CanonicalDimension },
            { platformField: 'adset_id', canonicalField: 'ad_group_id' as CanonicalDimension },
            { platformField: 'adset_name', canonicalField: 'ad_group_name' as CanonicalDimension },
            { platformField: 'ad_id', canonicalField: 'ad_id' as CanonicalDimension },
            { platformField: 'ad_name', canonicalField: 'ad_name' as CanonicalDimension },
            { platformField: 'age', canonicalField: 'age' as CanonicalDimension },
            { platformField: 'gender', canonicalField: 'gender' as CanonicalDimension },
            { platformField: 'device_platform', canonicalField: 'device' as CanonicalDimension },
            { platformField: 'publisher_platform', canonicalField: 'publisher_platform' as CanonicalDimension },
            { platformField: 'country', canonicalField: 'country' as CanonicalDimension },
            { platformField: 'placement', canonicalField: 'placement' as CanonicalDimension },
        ];
    }

    getMetricMappings(): MetricMapping[] {
        return [
            { platformField: 'impressions', canonicalField: 'impressions' as CanonicalMetric },
            { platformField: 'clicks', canonicalField: 'clicks' as CanonicalMetric },
            { platformField: 'spend', canonicalField: 'cost' as CanonicalMetric },
            { platformField: 'reach', canonicalField: 'reach' as CanonicalMetric },
        ];
    }

    // ─── Private Helpers ───

    private buildInsightsUrl(
        accountId: string,
        accessToken: string,
        fields: string,
        breakdowns: string,
        level: string,
        startDate: string,
        endDate: string
    ): string {
        const params = new URLSearchParams({
            fields,
            time_range: JSON.stringify({ since: startDate, until: endDate }),
            time_increment: '1', // Daily breakdown
            level,
            limit: '500',
            access_token: accessToken,
        });

        if (breakdowns) {
            params.set('breakdowns', breakdowns);
        }

        return `${META_GRAPH_API_BASE}/${accountId}/insights?${params.toString()}`;
    }

    private buildInsightsFields(config: FetchConfig): string {
        const fields = new Set<string>();

        // Always include these base fields
        fields.add('campaign_id');
        fields.add('campaign_name');
        fields.add('impressions');
        fields.add('clicks');
        fields.add('spend');
        fields.add('reach');
        fields.add('frequency');
        fields.add('unique_clicks');
        fields.add('actions');
        fields.add('action_values');
        fields.add('unique_actions');
        fields.add('outbound_clicks');
        fields.add('video_30_sec_watched_actions');

        // Add optional fields based on requested metrics
        for (const metric of config.metrics) {
            if (metric === 'ctr') fields.add('ctr');
            if (metric === 'cpc') fields.add('cpc');
            if (metric === 'cpm') fields.add('cpm');
        }

        // Level-specific fields
        if (config.level === 'adset' || config.level === 'ad') {
            fields.add('adset_id');
            fields.add('adset_name');
        }
        if (config.level === 'ad') {
            fields.add('ad_id');
            fields.add('ad_name');
        }

        // Include objective for campaign level
        if (config.level === 'campaign') {
            fields.add('objective');
        }

        return Array.from(fields).join(',');
    }

    private getBreakdowns(dimensions: string[]): string {
        const breakdownMap: Record<string, string> = {
            age: 'age',
            gender: 'gender',
            device: 'device_platform',
            country: 'country',
            publisher_platform: 'publisher_platform',
            placement: 'placement',
        };

        const breakdowns: string[] = [];
        for (const dim of dimensions) {
            if (breakdownMap[dim]) {
                breakdowns.push(breakdownMap[dim]);
            }
        }

        return breakdowns.join(',');
    }

    private getInsightsLevel(level: string): string {
        switch (level) {
            case 'campaign': return 'campaign';
            case 'adset': return 'adset';
            case 'ad': return 'ad';
            default: return 'campaign';
        }
    }

    private extractDimensions(row: MetaInsightsRow, level: string): Record<string, string | number | boolean> {
        const dims: Record<string, string | number | boolean> = {};

        dims.date = row.date_start;
        if (row.campaign_id) dims.campaign_id = row.campaign_id;
        if (row.campaign_name) dims.campaign_name = row.campaign_name;
        if (row.objective) dims.campaign_objective = row.objective;

        if ((level === 'adset' || level === 'ad') && row.adset_id) {
            dims.ad_group_id = row.adset_id;
            if (row.adset_name) dims.ad_group_name = row.adset_name;
        }

        if (level === 'ad' && row.ad_id) {
            dims.ad_id = row.ad_id;
            if (row.ad_name) dims.ad_name = row.ad_name;
        }

        // Breakdown dimensions
        if (row.age) dims.age = row.age;
        if (row.gender) dims.gender = row.gender;
        if (row.device_platform) dims.device = row.device_platform;
        if (row.publisher_platform) dims.publisher_platform = row.publisher_platform;
        if (row.country) dims.country = row.country;
        if (row.placement) dims.placement = row.placement;

        return dims;
    }

    private extractMetrics(row: MetaInsightsRow): Record<string, number> {
        const mets: Record<string, number> = {};

        if (row.impressions) mets.impressions = Number(row.impressions);
        if (row.clicks) mets.clicks = Number(row.clicks);
        if (row.spend) mets.cost = Number(row.spend);
        if (row.reach) mets.reach = Number(row.reach);
        if (row.frequency) mets.frequency = Number(row.frequency);
        if (row.unique_clicks) mets.unique_clicks = Number(row.unique_clicks);

        // Extract link clicks from actions
        if (row.actions) {
            const linkClick = row.actions.find(a => a.action_type === 'link_click');
            if (linkClick) mets.link_clicks = Number(linkClick.value);

            const postEngagement = row.actions.find(a => a.action_type === 'post_engagement');
            if (postEngagement) mets.post_engagement = Number(postEngagement.value);

            const purchaseAction = row.actions.find(a =>
                a.action_type === 'purchase' || a.action_type === 'offsite_conversion.fb_pixel_purchase'
            );
            if (purchaseAction) {
                mets.conversions = Number(purchaseAction.value);
            }

            // Fallback: total conversions
            if (!mets.conversions) {
                const totalConversions = row.actions
                    .filter(a => a.action_type.includes('conversion') || a.action_type === 'purchase')
                    .reduce((sum, a) => sum + Number(a.value), 0);
                if (totalConversions > 0) mets.conversions = totalConversions;
            }
        }

        // Extract conversion value
        if (row.action_values) {
            const purchaseValue = row.action_values.find(a =>
                a.action_type === 'purchase' || a.action_type === 'offsite_conversion.fb_pixel_purchase'
            );
            if (purchaseValue) {
                mets.conversion_value = Number(purchaseValue.value);
            }
        }

        // Video views
        if (row.video_30_sec_watched_actions) {
            const videoViews = row.video_30_sec_watched_actions.reduce(
                (sum, a) => sum + Number(a.value), 0
            );
            if (videoViews > 0) mets.video_views = videoViews;
        }

        return mets;
    }
}
