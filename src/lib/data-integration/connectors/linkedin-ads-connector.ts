// ═══════════════════════════════════════════════════════════════════
// LinkedIn Ads Connector
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

interface LinkedInAdsCredentials {
    accessToken: string;
    refreshToken?: string;
}

const LINKEDIN_API = 'https://api.linkedin.com/rest';
const LINKEDIN_AUTH = 'https://www.linkedin.com/oauth/v2';

/**
 * LinkedIn Ads connector using the Marketing API.
 *
 * Supported levels:
 * - campaign_group: Campaign group-level metrics
 * - campaign: Campaign-level metrics
 * - creative: Individual creative metrics
 */
export class LinkedInAdsConnector extends BaseConnector {
    readonly slug = 'linkedin-ads';
    readonly name = 'LinkedIn Ads';
    readonly category: ConnectorCategory = 'PAID_SOCIAL';
    readonly authType: AuthType = 'oauth2';

    constructor() {
        super();
        this.rateLimitPerMinute = 60;
    }

    // ─── Authentication ───

    async getAuthUrl(redirectUri: string, state?: string): Promise<string> {
        const clientId = process.env.LINKEDIN_CLIENT_ID || '';
        const params = new URLSearchParams({
            response_type: 'code',
            client_id: clientId,
            redirect_uri: redirectUri,
            scope: 'r_ads r_ads_reporting r_organization_social',
            ...(state && { state }),
        });
        return `${LINKEDIN_AUTH}/authorization?${params.toString()}`;
    }

    async authenticate(params: Record<string, string>): Promise<AuthResult> {
        try {
            const { code, redirectUri } = params;
            const clientId = process.env.LINKEDIN_CLIENT_ID || '';
            const clientSecret = process.env.LINKEDIN_CLIENT_SECRET || '';

            const response = await fetch(`${LINKEDIN_AUTH}/accessToken`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    grant_type: 'authorization_code',
                    code,
                    redirect_uri: redirectUri,
                    client_id: clientId,
                    client_secret: clientSecret,
                }),
            });

            const data = await response.json();
            if (data.error) {
                return { success: false, error: data.error_description || data.error };
            }

            return {
                success: true,
                accessToken: data.access_token,
                refreshToken: data.refresh_token,
                expiresAt: new Date(Date.now() + data.expires_in * 1000),
            };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Auth failed' };
        }
    }

    async testConnection(credentials: string): Promise<boolean> {
        try {
            const creds = this.parseCredentials<LinkedInAdsCredentials>(credentials);
            const res = await fetch(`${LINKEDIN_API}/me`, {
                headers: {
                    'Authorization': `Bearer ${creds.accessToken}`,
                    'LinkedIn-Version': '202401',
                },
            });
            return res.ok;
        } catch {
            return false;
        }
    }

    // ─── Discovery ───

    async getAvailableAccounts(credentials: string): Promise<DiscoveredAccount[]> {
        const creds = this.parseCredentials<LinkedInAdsCredentials>(credentials);

        const response = await this.retryWithBackoff(async () => {
            const res = await fetch(`${LINKEDIN_API}/adAccounts?q=search&search=(status:(values:List(ACTIVE)))`, {
                headers: {
                    'Authorization': `Bearer ${creds.accessToken}`,
                    'LinkedIn-Version': '202401',
                    'X-Restli-Protocol-Version': '2.0.0',
                },
            });
            return res.json();
        });

        if (!response.elements) return [];

        return response.elements.map((account: { id: string; name: string; currency: string }) => ({
            externalId: String(account.id),
            name: account.name || String(account.id),
            currency: account.currency || 'EUR',
        }));
    }

    // ─── Levels & Defaults ───

    getSupportedLevels(): DataLevel[] {
        return [
            {
                slug: 'campaign_group',
                name: 'Campaign Group Level',
                description: 'Performance data per campaign group per day',
                defaultDimensions: ['date', 'campaign_id', 'campaign_name'],
                optionalDimensions: [],
                defaultMetrics: ['impressions', 'clicks', 'cost', 'conversions', 'conversion_value', 'video_views', 'engagements', 'shares'],
                optionalMetrics: ['ctr', 'cpc', 'cpm'],
            },
            {
                slug: 'campaign',
                name: 'Campaign Level',
                description: 'Performance data per campaign per day',
                defaultDimensions: ['date', 'campaign_id', 'campaign_name', 'campaign_type', 'campaign_status'],
                optionalDimensions: [],
                defaultMetrics: ['impressions', 'clicks', 'cost', 'conversions', 'conversion_value', 'video_views', 'engagements', 'shares'],
                optionalMetrics: ['ctr', 'cpc', 'cpm'],
            },
            {
                slug: 'creative',
                name: 'Creative Level',
                description: 'Performance data per creative per day',
                defaultDimensions: ['date', 'campaign_id', 'campaign_name', 'ad_id', 'ad_name'],
                optionalDimensions: [],
                defaultMetrics: ['impressions', 'clicks', 'cost', 'conversions', 'conversion_value', 'video_views', 'engagements', 'shares'],
                optionalMetrics: ['ctr', 'cpc', 'cpm'],
            },
        ];
    }

    // ─── Data Fetching ───

    async fetchData(credentials: string, config: FetchConfig): Promise<FetchResponse> {
        const creds = this.parseCredentials<LinkedInAdsCredentials>(credentials);
        const startDate = this.formatDate(config.dateFrom);
        const endDate = this.formatDate(config.dateTo);

        const pivot = this.getPivot(config.level);
        const fields = 'externalWebsiteConversions,impressions,clicks,costInLocalCurrency,dateRange';

        // Build analytics URL
        const dateRange = `dateRange=(start:(year:${config.dateFrom.getFullYear()},month:${config.dateFrom.getMonth() + 1},day:${config.dateFrom.getDate()}),end:(year:${config.dateTo.getFullYear()},month:${config.dateTo.getMonth() + 1},day:${config.dateTo.getDate()}))`;
        const url = `${LINKEDIN_API}/adAnalytics?q=analytics&pivot=${pivot}&${dateRange}&timeGranularity=DAILY&accounts=urn:li:sponsoredAccount:${config.accountId}&fields=${fields}`;

        const allRows: Record<string, unknown>[] = [];
        let nextUrl: string | null = url;

        while (nextUrl) {
            const response = await this.retryWithBackoff(async () => {
                const res = await fetch(nextUrl!, {
                    headers: {
                        'Authorization': `Bearer ${creds.accessToken}`,
                        'LinkedIn-Version': '202401',
                        'X-Restli-Protocol-Version': '2.0.0',
                    },
                });
                return res.json();
            });

            if (response.elements) {
                allRows.push(...response.elements);
            }

            // LinkedIn uses paging.start and paging.count
            nextUrl = response.paging?.links?.find((l: { rel: string; href: string }) => l.rel === 'next')?.href || null;
        }

        const rows = allRows.map(row => ({
            dimensions: this.extractDimensionsFromRow(row, config.level, startDate),
            metrics: this.extractMetricsFromRow(row),
        }));

        return {
            rows,
            totalRows: rows.length,
            metadata: { level: config.level, pivot },
        };
    }

    // ─── Field Mapping ───

    getDimensionMappings(): DimensionMapping[] {
        return [
            { platformField: 'dateRange.start', canonicalField: 'date' as CanonicalDimension },
            { platformField: 'pivotValue', canonicalField: 'campaign_id' as CanonicalDimension },
        ];
    }

    getMetricMappings(): MetricMapping[] {
        return [
            { platformField: 'impressions', canonicalField: 'impressions' as CanonicalMetric },
            { platformField: 'clicks', canonicalField: 'clicks' as CanonicalMetric },
            {
                platformField: 'costInLocalCurrency',
                canonicalField: 'cost' as CanonicalMetric,
                transform: (v: number) => Number((v / 100).toFixed(2)), // LinkedIn reports cost in cents
            },
            { platformField: 'externalWebsiteConversions', canonicalField: 'conversions' as CanonicalMetric },
        ];
    }

    // ─── Private Helpers ───

    private getPivot(level: string): string {
        switch (level) {
            case 'campaign_group': return 'CAMPAIGN_GROUP';
            case 'campaign': return 'CAMPAIGN';
            case 'creative': return 'CREATIVE';
            default: return 'CAMPAIGN';
        }
    }

    private extractDimensionsFromRow(row: Record<string, unknown>, level: string, fallbackDate: string): Record<string, string | number | boolean> {
        const dims: Record<string, string | number | boolean> = {};

        // Extract date
        const dateRange = row.dateRange as Record<string, Record<string, number>> | undefined;
        if (dateRange?.start) {
            const { year, month, day } = dateRange.start;
            dims.date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        } else {
            dims.date = fallbackDate;
        }

        // Extract pivot value as campaign/creative id
        if (row.pivotValue) {
            const pivotStr = String(row.pivotValue);
            if (level === 'creative') {
                dims.ad_id = pivotStr.replace('urn:li:sponsoredCreative:', '');
            } else {
                dims.campaign_id = pivotStr.replace('urn:li:sponsoredCampaign:', '').replace('urn:li:sponsoredCampaignGroup:', '');
            }
        }

        return dims;
    }

    private extractMetricsFromRow(row: Record<string, unknown>): Record<string, number> {
        const mets: Record<string, number> = {};

        if (row.impressions !== undefined) mets.impressions = Number(row.impressions);
        if (row.clicks !== undefined) mets.clicks = Number(row.clicks);
        if (row.costInLocalCurrency !== undefined) mets.cost = Number(row.costInLocalCurrency) / 100;
        if (row.externalWebsiteConversions !== undefined) mets.conversions = Number(row.externalWebsiteConversions);
        if (row.conversionValueInLocalCurrency !== undefined) mets.conversion_value = Number(row.conversionValueInLocalCurrency) / 100;
        if (row.videoViews !== undefined) mets.video_views = Number(row.videoViews);
        if (row.totalEngagements !== undefined) mets.engagements = Number(row.totalEngagements);
        if (row.shares !== undefined) mets.shares = Number(row.shares);
        if (row.likes !== undefined) mets.likes = Number(row.likes);
        if (row.comments !== undefined) mets.comments = Number(row.comments);
        if (row.follows !== undefined) mets.follows = Number(row.follows);

        return mets;
    }
}
