// ═══════════════════════════════════════════════════════════════════
// Google Ads Connector — Data Integration Framework Implementation
// ═══════════════════════════════════════════════════════════════════

import { BaseConnector } from '@/lib/data-integration/base-connector';
import { googleAdsService } from '@/lib/integrations/google-ads';
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

interface GoogleAdsCredentials {
    refreshToken: string;
    loginCustomerId?: string;
}

/**
 * Google Ads connector implementation.
 * Wraps the existing GoogleAdsService and maps its data to the universal model.
 * 
 * Supported levels:
 * - campaign: Campaign-level metrics (default)
 * - ad_group: Ad group-level metrics
 * - ad: Individual ad metrics
 * - keyword: Search keyword metrics
 */
export class GoogleAdsConnector extends BaseConnector {
    readonly slug = 'google-ads';
    readonly name = 'Google Ads';
    readonly category: ConnectorCategory = 'PAID_SEARCH';
    readonly authType: AuthType = 'oauth2';

    getAttributionWindowDays(): number { return 7; }
    getMaxLookbackDays(): number { return 90; }

    constructor() {
        super();
        this.rateLimitPerMinute = 30; // Google Ads API is stricter
    }

    // ─── Authentication ───

    async getAuthUrl(redirectUri: string): Promise<string> {
        return googleAdsService.getAuthUrl(redirectUri);
    }

    async authenticate(params: Record<string, string>): Promise<AuthResult> {
        try {
            const { code, redirectUri } = params;
            const refreshToken = await googleAdsService.getRefreshToken(code, redirectUri);
            return {
                success: true,
                refreshToken,
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
            const creds = this.parseCredentials<GoogleAdsCredentials>(credentials);
            const accounts = await googleAdsService.listAccessibleCustomers(creds.refreshToken);
            return accounts.length > 0;
        } catch {
            return false;
        }
    }

    // ─── Discovery ───

    async getAvailableAccounts(credentials: string): Promise<DiscoveredAccount[]> {
        const creds = this.parseCredentials<GoogleAdsCredentials>(credentials);
        const accounts = await this.retryWithBackoff(() =>
            googleAdsService.listAccessibleCustomers(creds.refreshToken)
        );

        return accounts.map(account => ({
            externalId: account.id,
            name: account.name,
            isManager: account.name.includes('(MCC)'),
            ...(account.loginCustomerId && {
                children: [], // Sub-accounts are already flattened by listAccessibleCustomers
            }),
        }));
    }

    // ─── Levels & Defaults ───

    getSupportedLevels(): DataLevel[] {
        return [
            {
                slug: 'campaign',
                name: 'Campaign Level',
                description: 'Performance data per campaign per day',
                defaultDimensions: [
                    'date', 'campaign_id', 'campaign_name', 'campaign_type', 'campaign_status',
                    'bidding_strategy_type', 'campaign_budget', 'campaign_labels',
                ],
                optionalDimensions: [
                    'device', 'network', 'ad_group_id', 'ad_group_name',
                    'hour_of_day',
                ],
                defaultMetrics: [
                    'impressions', 'clicks', 'cost', 'conversions', 'conversion_value',
                    'all_conversions', 'all_conv_value', 'view_through_conversions',
                    'interactions', 'engagements',
                ],
                optionalMetrics: [
                    'impression_share', 'abs_top_impressions',
                    'invalid_clicks', 'phone_calls', 'phone_impressions',
                    'views_25', 'views_50', 'views_75', 'views_100',
                    'gmail_clicks', 'gmail_forwards', 'gmail_saves',
                    'ctr', 'cpc', 'cpm', 'roas', 'conversion_rate', 'cost_per_conversion',
                ],
            },
            {
                slug: 'ad_group',
                name: 'Ad Group Level',
                description: 'Performance data per ad group per day',
                defaultDimensions: [
                    'date', 'campaign_id', 'campaign_name',
                    'ad_group_id', 'ad_group_name', 'ad_group_status',
                    'ad_group_type', 'ad_group_cpc_bid',
                    'bidding_strategy_type', 'campaign_labels',
                ],
                optionalDimensions: [
                    'device', 'network',
                    'hour_of_day',
                ],
                defaultMetrics: [
                    'impressions', 'clicks', 'cost', 'conversions', 'conversion_value',
                    'all_conversions', 'all_conv_value', 'view_through_conversions',
                    'interactions', 'engagements',
                ],
                optionalMetrics: [
                    'impression_share', 'invalid_clicks',
                    'views_25', 'views_50', 'views_75', 'views_100',
                    'ctr', 'cpc', 'cpm',
                ],
            },
            {
                slug: 'ad',
                name: 'Ad Level',
                description: 'Performance data per individual ad per day',
                defaultDimensions: ['date', 'campaign_id', 'campaign_name', 'ad_group_id', 'ad_group_name', 'ad_id', 'ad_name', 'ad_type'],
                optionalDimensions: ['device', 'network'],
                defaultMetrics: [
                    'impressions', 'clicks', 'cost', 'conversions', 'conversion_value',
                    'all_conversions', 'interactions', 'engagements',
                ],
                optionalMetrics: [
                    'views_25', 'views_50', 'views_75', 'views_100',
                    'gmail_clicks', 'gmail_forwards', 'gmail_saves',
                ],
            },
            {
                slug: 'keyword',
                name: 'Keyword Level',
                description: 'Performance data per keyword per day (Search campaigns only)',
                defaultDimensions: ['date', 'campaign_id', 'campaign_name', 'ad_group_id', 'ad_group_name', 'keyword_text', 'keyword_match_type'],
                optionalDimensions: ['device', 'network'],
                defaultMetrics: [
                    'impressions', 'clicks', 'cost', 'conversions', 'conversion_value',
                    'all_conversions', 'interactions',
                ],
                optionalMetrics: ['impression_share', 'ctr', 'cpc'],
            },
        ];
    }

    // ─── Data Fetching ───

    async fetchData(credentials: string, config: FetchConfig): Promise<FetchResponse> {
        const creds = this.parseCredentials<GoogleAdsCredentials>(credentials);
        const startDate = this.formatDate(config.dateFrom);
        const endDate = this.formatDate(config.dateTo);

        // Build the GAQL query based on the requested level and fields
        const query = this.buildGaqlQuery(config);

        const rawRows = await this.retryWithBackoff(() =>
            this.executeQuery(creds, config.accountId, query, startDate, endDate)
        );

        // Transform raw Google Ads rows into the universal format
        const rows = rawRows.map(row => ({
            dimensions: this.extractDimensions(row, config.level),
            metrics: this.extractMetrics(row),
        }));

        return {
            rows,
            totalRows: rows.length,
            metadata: {
                query,
                dateRange: { from: startDate, to: endDate },
                level: config.level,
            },
        };
    }

    // ─── Field Mapping ───

    getDimensionMappings(): DimensionMapping[] {
        return [
            // Campaign fields
            { platformField: 'campaign_id', canonicalField: 'campaign_id' as CanonicalDimension },
            { platformField: 'campaign_name', canonicalField: 'campaign_name' as CanonicalDimension },
            { platformField: 'campaign_type', canonicalField: 'campaign_type' as CanonicalDimension },
            { platformField: 'campaign_status', canonicalField: 'campaign_status' as CanonicalDimension },
            { platformField: 'bidding_strategy_type', canonicalField: 'bidding_strategy_type' as CanonicalDimension },
            { platformField: 'campaign_budget', canonicalField: 'campaign_budget' as CanonicalDimension },
            { platformField: 'campaign_labels', canonicalField: 'campaign_labels' as CanonicalDimension },
            { platformField: 'campaign_start_date', canonicalField: 'campaign_start_date' as CanonicalDimension },
            { platformField: 'campaign_end_date', canonicalField: 'campaign_end_date' as CanonicalDimension },
            // Ad Group fields
            { platformField: 'ad_group_id', canonicalField: 'ad_group_id' as CanonicalDimension },
            { platformField: 'ad_group_name', canonicalField: 'ad_group_name' as CanonicalDimension },
            { platformField: 'ad_group_status', canonicalField: 'ad_group_status' as CanonicalDimension },
            { platformField: 'ad_group_type', canonicalField: 'ad_group_type' as CanonicalDimension },
            { platformField: 'ad_group_cpc_bid', canonicalField: 'ad_group_cpc_bid' as CanonicalDimension },
            // Ad fields
            { platformField: 'ad_id', canonicalField: 'ad_id' as CanonicalDimension },
            { platformField: 'ad_name', canonicalField: 'ad_name' as CanonicalDimension },
            { platformField: 'ad_type', canonicalField: 'ad_type' as CanonicalDimension },
            // Keyword fields
            { platformField: 'keyword_text', canonicalField: 'keyword_text' as CanonicalDimension },
            { platformField: 'keyword_match_type', canonicalField: 'keyword_match_type' as CanonicalDimension },
            // Segment fields
            { platformField: 'date', canonicalField: 'date' as CanonicalDimension },
            { platformField: 'device', canonicalField: 'device' as CanonicalDimension },
            { platformField: 'country', canonicalField: 'country' as CanonicalDimension },
            { platformField: 'network', canonicalField: 'network' as CanonicalDimension },
            { platformField: 'hour_of_day', canonicalField: 'hour_of_day' as CanonicalDimension },
            { platformField: 'slot', canonicalField: 'slot' as CanonicalDimension },
            { platformField: 'conversion_action_name', canonicalField: 'conversion_action_name' as CanonicalDimension },
            { platformField: 'conversion_action_category', canonicalField: 'conversion_action_category' as CanonicalDimension },
        ];
    }

    getMetricMappings(): MetricMapping[] {
        return [
            // Core performance
            { platformField: 'impressions', canonicalField: 'impressions' as CanonicalMetric },
            { platformField: 'clicks', canonicalField: 'clicks' as CanonicalMetric },
            { platformField: 'cost', canonicalField: 'cost' as CanonicalMetric },
            { platformField: 'conversions', canonicalField: 'conversions' as CanonicalMetric },
            { platformField: 'conversion_value', canonicalField: 'conversion_value' as CanonicalMetric },
            // Engagement
            { platformField: 'video_views', canonicalField: 'video_views' as CanonicalMetric },
            { platformField: 'engagements', canonicalField: 'engagements' as CanonicalMetric },
            // Extended conversions
            { platformField: 'all_conversions', canonicalField: 'all_conversions' as CanonicalMetric },
            { platformField: 'view_through_conversions', canonicalField: 'view_through_conversions' as CanonicalMetric },
            // Competitive
            { platformField: 'impression_share', canonicalField: 'impression_share' as CanonicalMetric },
        ];
    }

    // ─── Private Helpers ───

    /**
     * Build a Google Ads Query Language (GAQL) query based on the config
     */
    private buildGaqlQuery(config: FetchConfig): string {
        const { level, dimensions, metrics } = config;

        // Map canonical dimension/metric names to GAQL fields
        const gaqlFields = new Set<string>();

        // Always include segments.date for time-series data
        gaqlFields.add('segments.date');

        // Map dimensions to GAQL fields
        const dimFieldMap = this.getDimensionGaqlMap(level);
        for (const dim of dimensions) {
            if (dimFieldMap[dim]) {
                gaqlFields.add(dimFieldMap[dim]);
            }
        }

        // Map metrics to GAQL fields
        const metricFieldMap = this.getMetricGaqlMap();
        for (const metric of metrics) {
            if (metricFieldMap[metric]) {
                gaqlFields.add(metricFieldMap[metric]);
            }
        }

        // Determine the resource based on level
        const resource = this.getGaqlResource(level);

        return `SELECT ${Array.from(gaqlFields).join(', ')} FROM ${resource}`;
    }

    /**
     * Map canonical dimension names to GAQL field names based on level
     */
    private getDimensionGaqlMap(level: string): Record<string, string> {
        const base: Record<string, string> = {
            date: 'segments.date',
            campaign_id: 'campaign.id',
            campaign_name: 'campaign.name',
            campaign_type: 'campaign.advertising_channel_type',
            campaign_status: 'campaign.status',
            bidding_strategy_type: 'campaign.bidding_strategy_type',
            campaign_budget: 'campaign.campaign_budget',
            campaign_labels: 'campaign.labels',
            // Note: campaign.start_date and campaign.end_date are not supported in current API version
            device: 'segments.device',
            country: 'segments.geo_target_country',
            network: 'segments.ad_network_type',
            hour_of_day: 'segments.hour',
            slot: 'segments.slot',
            conversion_action_name: 'segments.conversion_action_name',
            conversion_action_category: 'segments.conversion_action_category',
        };

        if (level === 'ad_group' || level === 'ad' || level === 'keyword') {
            base.ad_group_id = 'ad_group.id';
            base.ad_group_name = 'ad_group.name';
            base.ad_group_status = 'ad_group.status';
            base.ad_group_type = 'ad_group.type';
            base.ad_group_cpc_bid = 'ad_group.cpc_bid_micros';
        }

        if (level === 'ad') {
            base.ad_id = 'ad_group_ad.ad.id';
            base.ad_name = 'ad_group_ad.ad.name';
            base.ad_type = 'ad_group_ad.ad.type';
        }

        if (level === 'keyword') {
            base.keyword_text = 'ad_group_criterion.keyword.text';
            base.keyword_match_type = 'ad_group_criterion.keyword.match_type';
        }

        return base;
    }

    /**
     * Map canonical metric names to GAQL field names
     */
    private getMetricGaqlMap(): Record<string, string> {
        return {
            // Core performance
            impressions: 'metrics.impressions',
            clicks: 'metrics.clicks',
            cost: 'metrics.cost_micros',
            conversions: 'metrics.conversions',
            conversion_value: 'metrics.conversions_value',
            // Extended performance
            interactions: 'metrics.interactions',
            invalid_clicks: 'metrics.invalid_clicks',
            // Video (note: metrics.video_views is not available in Google Ads API v19+)
            video_impressions: 'metrics.video_quartile_p100',
            views_25: 'metrics.video_quartile_p25',
            views_50: 'metrics.video_quartile_p50',
            views_75: 'metrics.video_quartile_p75',
            views_100: 'metrics.video_quartile_p100',
            // Engagement
            engagements: 'metrics.engagements',
            gmail_clicks: 'metrics.gmail_secondary_clicks',
            gmail_forwards: 'metrics.gmail_forwards',
            gmail_saves: 'metrics.gmail_saves',
            // Conversions
            all_conversions: 'metrics.all_conversions',
            all_conv_value: 'metrics.all_conversions_value',
            view_through_conversions: 'metrics.view_through_conversions',
            // Competitive
            impression_share: 'metrics.search_impression_share',
            // Phone
            phone_calls: 'metrics.phone_calls',
            phone_impressions: 'metrics.phone_impressions',
            // Top position
            search_impressions: 'metrics.search_impression_share',
            abs_top_impressions: 'metrics.search_absolute_top_impression_share',
        };
    }

    /**
     * Get the GAQL resource name for a given level
     */
    private getGaqlResource(level: string): string {
        switch (level) {
            case 'campaign': return 'campaign';
            case 'ad_group': return 'ad_group';
            case 'ad': return 'ad_group_ad';
            case 'keyword': return 'keyword_view';
            default: return 'campaign';
        }
    }

    /**
     * Execute a GAQL query against the Google Ads API
     */
    private async executeQuery(
        creds: GoogleAdsCredentials,
        customerId: string,
        query: string,
        startDate: string,
        endDate: string
    ): Promise<Record<string, unknown>[]> {
        const { GoogleAdsApi } = await import('google-ads-api');
        const config = await this.getGoogleAdsConfig();

        const client = new GoogleAdsApi({
            client_id: config.client_id,
            client_secret: config.client_secret,
            developer_token: config.developer_token,
        });

        const customer = client.Customer({
            customer_id: customerId,
            refresh_token: creds.refreshToken,
            login_customer_id: creds.loginCustomerId,
        });

        // Add date filter to the query
        const fullQuery = `${query} WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'`;

        return customer.query(fullQuery) as unknown as Record<string, unknown>[];
    }

    /**
     * Extract dimension values from a raw Google Ads row
     */
    private extractDimensions(row: Record<string, unknown>, level: string): Record<string, string | number | boolean> {
        const dims: Record<string, string | number | boolean> = {};
        const campaign = row.campaign as Record<string, unknown> | undefined;
        const adGroup = row.ad_group as Record<string, unknown> | undefined;
        const adGroupAd = row.ad_group_ad as Record<string, unknown> | undefined;
        const adGroupCriterion = row.ad_group_criterion as Record<string, unknown> | undefined;
        const segments = row.segments as Record<string, unknown> | undefined;

        // Date (always present)
        if (segments?.date) dims.date = String(segments.date);

        // Campaign (always present)
        if (campaign?.id) dims.campaign_id = String(campaign.id);
        if (campaign?.name) dims.campaign_name = String(campaign.name);
        if (campaign?.advertising_channel_type) dims.campaign_type = String(campaign.advertising_channel_type);
        if (campaign?.status) dims.campaign_status = String(campaign.status);
        // Extended campaign fields
        if (campaign?.bidding_strategy_type) dims.bidding_strategy_type = String(campaign.bidding_strategy_type);
        if (campaign?.campaign_budget) {
            // campaign_budget is a resource name like 'customers/xxx/campaignBudgets/yyy'
            const budgetStr = String(campaign.campaign_budget);
            const parts = budgetStr.split('/');
            dims.campaign_budget = parts.length > 1 ? parts[parts.length - 1] : budgetStr;
        }
        if (campaign?.labels) dims.campaign_labels = Array.isArray(campaign.labels) ? (campaign.labels as string[]).join(', ') : String(campaign.labels);
        if (campaign?.start_date) dims.campaign_start_date = String(campaign.start_date);
        if (campaign?.end_date && campaign.end_date !== '2037-12-30') dims.campaign_end_date = String(campaign.end_date);

        // Segments
        if (segments?.device) dims.device = String(segments.device);
        if (segments?.geo_target_country) dims.country = String(segments.geo_target_country);
        if (segments?.ad_network_type) dims.network = String(segments.ad_network_type);
        if (segments?.hour !== undefined) dims.hour_of_day = Number(segments.hour);
        if (segments?.slot) dims.slot = String(segments.slot);
        if (segments?.conversion_action_name) dims.conversion_action_name = String(segments.conversion_action_name);
        if (segments?.conversion_action_category) dims.conversion_action_category = String(segments.conversion_action_category);

        // Ad Group
        if ((level === 'ad_group' || level === 'ad' || level === 'keyword') && adGroup) {
            if (adGroup.id) dims.ad_group_id = String(adGroup.id);
            if (adGroup.name) dims.ad_group_name = String(adGroup.name);
            if (adGroup.status) dims.ad_group_status = String(adGroup.status);
            if (adGroup.type) dims.ad_group_type = String(adGroup.type);
            if (adGroup.cpc_bid_micros) dims.ad_group_cpc_bid = Number(adGroup.cpc_bid_micros) / 1_000_000;
        }

        // Ad
        if (level === 'ad' && adGroupAd) {
            const ad = adGroupAd.ad as Record<string, unknown> | undefined;
            if (ad?.id) dims.ad_id = String(ad.id);
            if (ad?.name) dims.ad_name = String(ad.name);
            if (ad?.type) dims.ad_type = String(ad.type);
        }

        // Keyword
        if (level === 'keyword' && adGroupCriterion) {
            const keyword = adGroupCriterion.keyword as Record<string, unknown> | undefined;
            if (keyword?.text) dims.keyword_text = String(keyword.text);
            if (keyword?.match_type) dims.keyword_match_type = String(keyword.match_type);
        }

        return dims;
    }

    /**
     * Extract metric values from a raw Google Ads row
     */
    private extractMetrics(row: Record<string, unknown>): Record<string, number> {
        const mets: Record<string, number> = {};
        const metrics = row.metrics as Record<string, unknown> | undefined;

        if (!metrics) return mets;

        // Helper to safely extract a metric
        const extract = (apiField: string, canonicalField: string, divisor = 1) => {
            if (metrics[apiField] !== undefined && metrics[apiField] !== null) {
                mets[canonicalField] = Number(metrics[apiField]) / divisor;
            }
        };

        // Core performance
        extract('impressions', 'impressions');
        extract('clicks', 'clicks');
        extract('cost_micros', 'cost', 1_000_000);
        extract('conversions', 'conversions');
        extract('conversions_value', 'conversion_value');

        // Extended performance
        extract('interactions', 'interactions');
        extract('invalid_clicks', 'invalid_clicks');

        // Video
        extract('video_views', 'video_views');
        extract('video_quartile_p25', 'views_25');
        extract('video_quartile_p50', 'views_50');
        extract('video_quartile_p75', 'views_75');
        extract('video_quartile_p100', 'views_100');

        // Engagement
        extract('engagements', 'engagements');
        extract('gmail_secondary_clicks', 'gmail_clicks');
        extract('gmail_forwards', 'gmail_forwards');
        extract('gmail_saves', 'gmail_saves');

        // Conversions
        extract('all_conversions', 'all_conversions');
        extract('all_conversions_value', 'all_conv_value');
        extract('view_through_conversions', 'view_through_conversions');

        // Competitive / position
        extract('search_impression_share', 'impression_share');
        extract('search_absolute_top_impression_share', 'abs_top_impressions');

        // Phone
        extract('phone_calls', 'phone_calls');
        extract('phone_impressions', 'phone_impressions');

        return mets;
    }

    /**
     * Get Google Ads API config (delegating to existing service)
     */
    private async getGoogleAdsConfig() {
        // Use reflection to access private method — alternatively refactor to make it public
        const settings = await import('@/lib/db').then(m => m.prisma.globalSetting.findMany());
        const settingsMap = settings.reduce((acc: Record<string, string>, s) => {
            acc[s.key] = s.value;
            return acc;
        }, {} as Record<string, string>);

        return {
            client_id: settingsMap.GOOGLE_ADS_CLIENT_ID || process.env.GOOGLE_ADS_CLIENT_ID || '',
            client_secret: settingsMap.GOOGLE_ADS_CLIENT_SECRET || process.env.GOOGLE_ADS_CLIENT_SECRET || '',
            developer_token: settingsMap.GOOGLE_ADS_DEVELOPER_TOKEN || process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '',
        };
    }
}
