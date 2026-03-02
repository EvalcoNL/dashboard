// ═══════════════════════════════════════════════════════════════════
// Google Analytics 4 Connector — Data Integration Framework Implementation
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

interface GA4Credentials {
    refreshToken: string;
}

interface GA4ReportRow {
    dimensionValues?: Array<{ value: string }>;
    metricValues?: Array<{ value: string }>;
}

interface GA4RunReportResponse {
    rows?: GA4ReportRow[];
    rowCount?: number;
    metadata?: {
        currencyCode?: string;
        timeZone?: string;
    };
}

/**
 * Google Analytics 4 connector implementation.
 * Uses the GA4 Data API (v1beta) REST endpoint to fetch website analytics data.
 *
 * Supported levels:
 * - overview: Site-wide daily metrics
 * - traffic_source: Traffic source / medium breakdown
 * - page: Page-level performance metrics
 */
export class GoogleAnalyticsConnector extends BaseConnector {
    readonly slug = 'ga4';
    readonly name = 'Google Analytics';
    readonly category: ConnectorCategory = 'ANALYTICS';
    readonly authType: AuthType = 'oauth2';

    private readonly GA4_API_BASE = 'https://analyticsdata.googleapis.com/v1beta';

    constructor() {
        super();
        this.rateLimitPerMinute = 60;
    }

    // ─── Authentication ───

    async getAuthUrl(redirectUri: string): Promise<string> {
        const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID || '';
        const scopes = [
            'https://www.googleapis.com/auth/analytics.readonly',
        ].join(' ');
        const params = new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            response_type: 'code',
            scope: scopes,
            access_type: 'offline',
            prompt: 'consent',
        });
        return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
    }

    async authenticate(params: Record<string, string>): Promise<AuthResult> {
        try {
            const { code, redirectUri } = params;
            const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    code,
                    client_id: process.env.GOOGLE_OAUTH_CLIENT_ID || '',
                    client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || '',
                    redirect_uri: redirectUri,
                    grant_type: 'authorization_code',
                }),
            });
            const tokenData = await tokenRes.json();
            if (tokenData.error) throw new Error(tokenData.error_description || tokenData.error);
            return { success: true, refreshToken: tokenData.refresh_token };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Authentication failed' };
        }
    }

    async testConnection(credentials: string): Promise<boolean> {
        try {
            const creds = this.parseCredentials<GA4Credentials>(credentials);
            const accessToken = await this.getAccessToken(creds.refreshToken);
            const res = await fetch(
                'https://analyticsadmin.googleapis.com/v1beta/accountSummaries',
                { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            return res.ok;
        } catch {
            return false;
        }
    }

    // ─── Discovery ───

    async getAvailableAccounts(credentials: string): Promise<DiscoveredAccount[]> {
        const creds = this.parseCredentials<GA4Credentials>(credentials);
        const accessToken = await this.getAccessToken(creds.refreshToken);

        const res = await this.retryWithBackoff(async () => {
            const r = await fetch(
                'https://analyticsadmin.googleapis.com/v1beta/accountSummaries',
                { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            if (!r.ok) throw new Error(`GA4 Admin API error: ${r.status}`);
            return r.json();
        });

        const accounts: DiscoveredAccount[] = [];
        for (const summary of res.accountSummaries || []) {
            for (const prop of summary.propertySummaries || []) {
                accounts.push({
                    externalId: prop.property?.replace('properties/', '') || '',
                    name: `${summary.displayName} > ${prop.displayName}`,
                });
            }
        }
        return accounts;
    }

    // ─── Levels & Defaults ───

    getSupportedLevels(): DataLevel[] {
        return [
            {
                slug: 'overview',
                name: 'Site Overview',
                description: 'Daily site-wide performance metrics',
                defaultDimensions: ['date'],
                optionalDimensions: ['country', 'device_category', 'browser'],
                defaultMetrics: [
                    'sessions', 'total_users', 'active_users', 'new_users',
                    'screen_page_views', 'bounce_rate',
                    'average_session_duration', 'engagement_rate',
                    'event_count',
                ],
                optionalMetrics: ['conversions', 'purchase_revenue', 'transactions', 'adds_to_cart'],
            },
            {
                slug: 'traffic_source',
                name: 'Traffic Sources',
                description: 'Performance by traffic source and medium',
                defaultDimensions: ['date', 'session_source', 'session_medium', 'session_campaign_name'],
                optionalDimensions: ['country', 'device_category', 'landing_page'],
                defaultMetrics: [
                    'sessions', 'total_users', 'active_users', 'new_users',
                    'screen_page_views', 'bounce_rate', 'engagement_rate',
                    'event_count',
                ],
                optionalMetrics: ['conversions', 'average_session_duration', 'purchase_revenue', 'transactions'],
            },
            {
                slug: 'page',
                name: 'Page Performance',
                description: 'Metrics per page path',
                defaultDimensions: ['date', 'page_path', 'page_title'],
                optionalDimensions: ['session_source', 'session_medium', 'device_category', 'landing_page'],
                defaultMetrics: [
                    'screen_page_views', 'sessions', 'total_users', 'active_users',
                    'bounce_rate', 'average_session_duration', 'engagement_rate',
                    'event_count',
                ],
                optionalMetrics: ['conversions', 'new_users', 'purchase_revenue', 'transactions', 'adds_to_cart'],
            },
        ];
    }

    // ─── Data Fetching ───

    async fetchData(credentials: string, config: FetchConfig): Promise<FetchResponse> {
        const creds = this.parseCredentials<GA4Credentials>(credentials);
        const accessToken = await this.getAccessToken(creds.refreshToken);
        const startDate = this.formatDate(config.dateFrom);
        const endDate = this.formatDate(config.dateTo);

        // Build dimensions and metrics for GA4 API
        const ga4Dimensions = config.dimensions.map(d => ({
            name: this.toGA4DimensionName(d),
        }));

        const ga4Metrics = config.metrics.map(m => ({
            name: this.toGA4MetricName(m),
        }));

        const requestBody = {
            dateRanges: [{ startDate, endDate }],
            dimensions: ga4Dimensions,
            metrics: ga4Metrics,
            limit: 100000,
            keepEmptyRows: false,
        };

        const propertyId = config.accountId.replace(/^properties\//, '');
        const response = await this.retryWithBackoff(async () => {
            const res = await fetch(
                `${this.GA4_API_BASE}/properties/${propertyId}:runReport`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestBody),
                }
            );

            if (!res.ok) {
                const errBody = await res.text();
                throw new Error(`GA4 Data API error (${res.status}): ${errBody}`);
            }

            return res.json() as Promise<GA4RunReportResponse>;
        });

        // Transform GA4 response rows into universal format
        const dimensionNames = config.dimensions;
        const metricNames = config.metrics;
        const rows = (response.rows || []).map(row => {
            const dimensions: Record<string, string | number | boolean> = {};
            const metrics: Record<string, number> = {};

            (row.dimensionValues || []).forEach((val, i) => {
                if (i < dimensionNames.length) {
                    dimensions[dimensionNames[i]] = val.value;
                }
            });

            (row.metricValues || []).forEach((val, i) => {
                if (i < metricNames.length) {
                    metrics[metricNames[i]] = parseFloat(val.value) || 0;
                }
            });

            return { dimensions, metrics };
        });

        return {
            rows,
            totalRows: rows.length,
            metadata: {
                dateRange: { from: startDate, to: endDate },
                level: config.level,
                propertyId,
            },
        };
    }

    // ─── Field Mapping ───

    getDimensionMappings(): DimensionMapping[] {
        return [
            { platformField: 'date', canonicalField: 'date' as CanonicalDimension },
            { platformField: 'page_path', canonicalField: 'page_path' as CanonicalDimension },
            { platformField: 'page_title', canonicalField: 'page_title' as CanonicalDimension },
            { platformField: 'session_source', canonicalField: 'session_source' as CanonicalDimension },
            { platformField: 'session_medium', canonicalField: 'session_medium' as CanonicalDimension },
            { platformField: 'session_campaign_name', canonicalField: 'session_campaign_name' as CanonicalDimension },
            { platformField: 'country', canonicalField: 'country' as CanonicalDimension },
            { platformField: 'device_category', canonicalField: 'device_category' as CanonicalDimension },
            { platformField: 'browser', canonicalField: 'browser' as CanonicalDimension },
        ];
    }

    getMetricMappings(): MetricMapping[] {
        return [
            { platformField: 'sessions', canonicalField: 'sessions' as CanonicalMetric },
            { platformField: 'total_users', canonicalField: 'total_users' as CanonicalMetric },
            { platformField: 'active_users', canonicalField: 'active_users' as CanonicalMetric },
            { platformField: 'new_users', canonicalField: 'new_users' as CanonicalMetric },
            { platformField: 'screen_page_views', canonicalField: 'screen_page_views' as CanonicalMetric },
            { platformField: 'bounce_rate', canonicalField: 'bounce_rate' as CanonicalMetric },
            { platformField: 'average_session_duration', canonicalField: 'average_session_duration' as CanonicalMetric },
            { platformField: 'engagement_rate', canonicalField: 'engagement_rate' as CanonicalMetric },
            { platformField: 'conversions', canonicalField: 'conversions' as CanonicalMetric },
            { platformField: 'event_count', canonicalField: 'event_count' as CanonicalMetric },
            { platformField: 'purchase_revenue', canonicalField: 'purchase_revenue' as CanonicalMetric },
            { platformField: 'transactions', canonicalField: 'transactions' as CanonicalMetric },
            { platformField: 'adds_to_cart', canonicalField: 'adds_to_cart' as CanonicalMetric },
        ];
    }

    // ─── Private Helpers ───

    /**
     * Exchange a refresh token for a short-lived access token.
     */
    private async getAccessToken(refreshToken: string): Promise<string> {
        const res = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: process.env.GOOGLE_OAUTH_CLIENT_ID || '',
                client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || '',
                refresh_token: refreshToken,
                grant_type: 'refresh_token',
            }),
        });
        const data = await res.json();
        if (data.error) throw new Error(`Token refresh failed: ${data.error_description || data.error}`);
        return data.access_token;
    }

    /**
     * Map canonical dimension slug to GA4 API dimension name.
     */
    private toGA4DimensionName(slug: string): string {
        const map: Record<string, string> = {
            date: 'date',
            page_path: 'pagePath',
            page_title: 'pageTitle',
            session_source: 'sessionSource',
            session_medium: 'sessionMedium',
            session_campaign_name: 'sessionCampaignName',
            country: 'country',
            device_category: 'deviceCategory',
            browser: 'browser',
            landing_page: 'landingPage',
        };
        return map[slug] || slug;
    }

    /**
     * Map canonical metric slug to GA4 API metric name.
     */
    private toGA4MetricName(slug: string): string {
        const map: Record<string, string> = {
            sessions: 'sessions',
            total_users: 'totalUsers',
            active_users: 'activeUsers',
            new_users: 'newUsers',
            screen_page_views: 'screenPageViews',
            bounce_rate: 'bounceRate',
            average_session_duration: 'averageSessionDuration',
            engagement_rate: 'engagementRate',
            conversions: 'conversions',
            event_count: 'eventCount',
            purchase_revenue: 'purchaseRevenue',
            transactions: 'transactions',
            adds_to_cart: 'addToCarts',
        };
        return map[slug] || slug;
    }
}
