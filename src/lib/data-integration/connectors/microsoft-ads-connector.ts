// ═══════════════════════════════════════════════════════════════════
// Microsoft Advertising Connector (Bing Ads)
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

interface MicrosoftAdsCredentials {
    refreshToken: string;
    developerToken: string;
    customerId?: string;
}

const MICROSOFT_AUTH_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0';
const MICROSOFT_ADS_API = 'https://bingads.microsoft.com/Reporting/v13';

/**
 * Microsoft Advertising (Bing Ads) connector.
 * Uses the Reporting API with similar structure to Google Ads.
 *
 * Supported levels:
 * - campaign: Campaign-level metrics
 * - ad_group: Ad group-level metrics
 * - ad: Individual ad metrics
 * - keyword: Search keyword metrics
 */
export class MicrosoftAdsConnector extends BaseConnector {
    readonly slug = 'microsoft-ads';
    readonly name = 'Microsoft Advertising';
    readonly category: ConnectorCategory = 'PAID_SEARCH';
    readonly authType: AuthType = 'oauth2';

    constructor() {
        super();
        this.rateLimitPerMinute = 30;
    }

    // ─── Authentication ───

    async getAuthUrl(redirectUri: string, state?: string): Promise<string> {
        const clientId = process.env.MICROSOFT_ADS_CLIENT_ID || '';
        const params = new URLSearchParams({
            client_id: clientId,
            response_type: 'code',
            redirect_uri: redirectUri,
            scope: 'https://ads.microsoft.com/msads.manage offline_access',
            ...(state && { state }),
        });
        return `${MICROSOFT_AUTH_URL}/authorize?${params.toString()}`;
    }

    async authenticate(params: Record<string, string>): Promise<AuthResult> {
        try {
            const { code, redirectUri } = params;
            const clientId = process.env.MICROSOFT_ADS_CLIENT_ID || '';
            const clientSecret = process.env.MICROSOFT_ADS_CLIENT_SECRET || '';

            const response = await fetch(`${MICROSOFT_AUTH_URL}/token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    client_id: clientId,
                    client_secret: clientSecret,
                    code,
                    redirect_uri: redirectUri,
                    grant_type: 'authorization_code',
                }),
            });

            const data = await response.json();
            if (data.error) {
                return { success: false, error: data.error_description || data.error };
            }

            return {
                success: true,
                refreshToken: data.refresh_token,
                accessToken: data.access_token,
                expiresAt: new Date(Date.now() + data.expires_in * 1000),
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
        const creds = this.parseCredentials<MicrosoftAdsCredentials>(credentials);
        const accessToken = await this.getAccessToken(creds);

        const response = await this.retryWithBackoff(async () => {
            const res = await fetch('https://bingads.microsoft.com/Customer/v13/Customer/GetAccountsInfo', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'DeveloperToken': creds.developerToken,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({}),
            });
            return res.json();
        });

        if (!response.AccountsInfo) return [];

        return response.AccountsInfo.map((account: { Id: string; Name: string; Number: string }) => ({
            externalId: String(account.Id),
            name: account.Name || account.Number,
        }));
    }

    // ─── Levels & Defaults ───

    getSupportedLevels(): DataLevel[] {
        return [
            {
                slug: 'campaign',
                name: 'Campaign Level',
                description: 'Performance data per campaign per day',
                defaultDimensions: ['date', 'campaign_id', 'campaign_name', 'campaign_status'],
                optionalDimensions: ['device', 'country', 'network'],
                defaultMetrics: ['impressions', 'clicks', 'cost', 'conversions', 'conversion_value', 'all_conversions', 'view_through_conversions', 'impression_share'],
                optionalMetrics: ['ctr', 'cpc', 'cpm', 'roas', 'conversion_rate'],
            },
            {
                slug: 'ad_group',
                name: 'Ad Group Level',
                description: 'Performance data per ad group per day',
                defaultDimensions: ['date', 'campaign_id', 'campaign_name', 'ad_group_id', 'ad_group_name', 'ad_group_status'],
                optionalDimensions: ['device', 'country', 'network'],
                defaultMetrics: ['impressions', 'clicks', 'cost', 'conversions', 'conversion_value', 'all_conversions', 'view_through_conversions', 'impression_share'],
                optionalMetrics: ['ctr', 'cpc', 'cpm'],
            },
            {
                slug: 'ad',
                name: 'Ad Level',
                description: 'Performance data per ad per day',
                defaultDimensions: ['date', 'campaign_id', 'campaign_name', 'ad_group_id', 'ad_group_name', 'ad_id', 'ad_name'],
                optionalDimensions: ['device', 'country'],
                defaultMetrics: ['impressions', 'clicks', 'cost', 'conversions', 'conversion_value', 'all_conversions'],
                optionalMetrics: ['ctr', 'cpc'],
            },
            {
                slug: 'keyword',
                name: 'Keyword Level',
                description: 'Performance data per keyword per day',
                defaultDimensions: ['date', 'campaign_id', 'campaign_name', 'ad_group_id', 'ad_group_name', 'keyword_text', 'keyword_match_type'],
                optionalDimensions: ['device', 'country'],
                defaultMetrics: ['impressions', 'clicks', 'cost', 'conversions', 'conversion_value', 'all_conversions', 'impression_share'],
                optionalMetrics: ['ctr', 'cpc'],
            },
        ];
    }

    // ─── Data Fetching ───

    async fetchData(credentials: string, config: FetchConfig): Promise<FetchResponse> {
        const creds = this.parseCredentials<MicrosoftAdsCredentials>(credentials);
        const accessToken = await this.getAccessToken(creds);
        const startDate = this.formatDate(config.dateFrom);
        const endDate = this.formatDate(config.dateTo);

        const reportColumns = this.getReportColumns(config.level, config.dimensions, config.metrics);
        const reportType = this.getReportType(config.level);

        const reportRequest = {
            ReportName: `${config.level}_report`,
            Format: 'Csv',
            ReturnOnlyCompleteData: false,
            Aggregation: 'Daily',
            Columns: reportColumns,
            Scope: { AccountIds: [config.accountId] },
            Time: {
                CustomDateRangeStart: { Day: parseInt(startDate.split('-')[2]), Month: parseInt(startDate.split('-')[1]), Year: parseInt(startDate.split('-')[0]) },
                CustomDateRangeEnd: { Day: parseInt(endDate.split('-')[2]), Month: parseInt(endDate.split('-')[1]), Year: parseInt(endDate.split('-')[0]) },
            },
        };

        // Submit report request
        const submitResponse = await this.retryWithBackoff(async () => {
            const res = await fetch(`${MICROSOFT_ADS_API}/Reporting/SubmitGenerateReport`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'DeveloperToken': creds.developerToken,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ [reportType]: reportRequest }),
            });
            return res.json();
        });

        // Poll for report completion and download
        const rows = await this.pollAndDownloadReport(submitResponse.ReportRequestId, accessToken, creds.developerToken);

        return {
            rows: rows.map(row => ({
                dimensions: this.extractDimensions(row, config.level),
                metrics: this.extractMetrics(row),
            })),
            totalRows: rows.length,
            metadata: { reportType, level: config.level },
        };
    }

    // ─── Field Mapping ───

    getDimensionMappings(): DimensionMapping[] {
        return [
            { platformField: 'TimePeriod', canonicalField: 'date' as CanonicalDimension },
            { platformField: 'CampaignId', canonicalField: 'campaign_id' as CanonicalDimension },
            { platformField: 'CampaignName', canonicalField: 'campaign_name' as CanonicalDimension },
            { platformField: 'CampaignStatus', canonicalField: 'campaign_status' as CanonicalDimension },
            { platformField: 'AdGroupId', canonicalField: 'ad_group_id' as CanonicalDimension },
            { platformField: 'AdGroupName', canonicalField: 'ad_group_name' as CanonicalDimension },
            { platformField: 'AdGroupStatus', canonicalField: 'ad_group_status' as CanonicalDimension },
            { platformField: 'AdId', canonicalField: 'ad_id' as CanonicalDimension },
            { platformField: 'AdTitle', canonicalField: 'ad_name' as CanonicalDimension },
            { platformField: 'Keyword', canonicalField: 'keyword_text' as CanonicalDimension },
            { platformField: 'BidMatchType', canonicalField: 'keyword_match_type' as CanonicalDimension },
            { platformField: 'DeviceType', canonicalField: 'device' as CanonicalDimension },
            { platformField: 'Country', canonicalField: 'country' as CanonicalDimension },
            { platformField: 'Network', canonicalField: 'network' as CanonicalDimension },
        ];
    }

    getMetricMappings(): MetricMapping[] {
        return [
            { platformField: 'Impressions', canonicalField: 'impressions' as CanonicalMetric },
            { platformField: 'Clicks', canonicalField: 'clicks' as CanonicalMetric },
            { platformField: 'Spend', canonicalField: 'cost' as CanonicalMetric },
            { platformField: 'Conversions', canonicalField: 'conversions' as CanonicalMetric },
            { platformField: 'Revenue', canonicalField: 'conversion_value' as CanonicalMetric },
        ];
    }

    // ─── Private Helpers ───

    private async getAccessToken(creds: MicrosoftAdsCredentials): Promise<string> {
        const clientId = process.env.MICROSOFT_ADS_CLIENT_ID || '';
        const clientSecret = process.env.MICROSOFT_ADS_CLIENT_SECRET || '';

        const response = await fetch(`${MICROSOFT_AUTH_URL}/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                refresh_token: creds.refreshToken,
                grant_type: 'refresh_token',
            }),
        });

        const data = await response.json();
        return data.access_token;
    }

    private getReportType(level: string): string {
        switch (level) {
            case 'campaign': return 'CampaignPerformanceReportRequest';
            case 'ad_group': return 'AdGroupPerformanceReportRequest';
            case 'ad': return 'AdPerformanceReportRequest';
            case 'keyword': return 'KeywordPerformanceReportRequest';
            default: return 'CampaignPerformanceReportRequest';
        }
    }

    private getReportColumns(level: string, dimensions: string[], metrics: string[]): string[] {
        const columns = new Set<string>(['TimePeriod']);

        const dimMap: Record<string, string> = {
            campaign_id: 'CampaignId', campaign_name: 'CampaignName', campaign_status: 'CampaignStatus',
            ad_group_id: 'AdGroupId', ad_group_name: 'AdGroupName', ad_group_status: 'AdGroupStatus',
            ad_id: 'AdId', ad_name: 'AdTitle', keyword_text: 'Keyword', keyword_match_type: 'BidMatchType',
            device: 'DeviceType', country: 'Country', network: 'Network',
        };

        const metMap: Record<string, string> = {
            impressions: 'Impressions', clicks: 'Clicks', cost: 'Spend',
            conversions: 'Conversions', conversion_value: 'Revenue',
            all_conversions: 'AllConversions', view_through_conversions: 'ViewThroughConversions',
            impression_share: 'ImpressionSharePercent', quality_score: 'QualityScore',
        };

        for (const dim of dimensions) { if (dimMap[dim]) columns.add(dimMap[dim]); }
        for (const met of metrics) { if (metMap[met]) columns.add(metMap[met]); }

        return Array.from(columns);
    }

    private extractDimensions(row: Record<string, string>, level: string): Record<string, string | number | boolean> {
        const dims: Record<string, string | number | boolean> = {};
        if (row.TimePeriod) dims.date = row.TimePeriod;
        if (row.CampaignId) dims.campaign_id = row.CampaignId;
        if (row.CampaignName) dims.campaign_name = row.CampaignName;
        if (row.CampaignStatus) dims.campaign_status = row.CampaignStatus;
        if ((level === 'ad_group' || level === 'ad' || level === 'keyword') && row.AdGroupId) {
            dims.ad_group_id = row.AdGroupId;
            if (row.AdGroupName) dims.ad_group_name = row.AdGroupName;
        }
        if (level === 'ad') {
            if (row.AdId) dims.ad_id = row.AdId;
            if (row.AdTitle) dims.ad_name = row.AdTitle;
        }
        if (level === 'keyword') {
            if (row.Keyword) dims.keyword_text = row.Keyword;
            if (row.BidMatchType) dims.keyword_match_type = row.BidMatchType;
        }
        if (row.DeviceType) dims.device = row.DeviceType;
        if (row.Country) dims.country = row.Country;
        if (row.Network) dims.network = row.Network;
        return dims;
    }

    private extractMetrics(row: Record<string, string>): Record<string, number> {
        const mets: Record<string, number> = {};
        if (row.Impressions) mets.impressions = Number(row.Impressions);
        if (row.Clicks) mets.clicks = Number(row.Clicks);
        if (row.Spend) mets.cost = Number(row.Spend);
        if (row.Conversions) mets.conversions = Number(row.Conversions);
        if (row.Revenue) mets.conversion_value = Number(row.Revenue);
        if (row.AllConversions) mets.all_conversions = Number(row.AllConversions);
        if (row.ViewThroughConversions) mets.view_through_conversions = Number(row.ViewThroughConversions);
        if (row.ImpressionSharePercent) mets.impression_share = Number(row.ImpressionSharePercent) / 100;
        if (row.QualityScore) mets.quality_score = Number(row.QualityScore);
        return mets;
    }

    private async pollAndDownloadReport(
        reportId: string, accessToken: string, developerToken: string
    ): Promise<Record<string, string>[]> {
        // Poll for report status
        let attempts = 0;
        while (attempts < 30) {
            const statusRes = await fetch(`${MICROSOFT_ADS_API}/Reporting/PollGenerateReport`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'DeveloperToken': developerToken,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ ReportRequestId: reportId }),
            });
            const status = await statusRes.json();

            if (status.Status === 'Success' && status.ReportDownloadUrl) {
                // Download and parse CSV
                const csvRes = await fetch(status.ReportDownloadUrl);
                const csvText = await csvRes.text();
                return this.parseCsv(csvText);
            }

            if (status.Status === 'Error') {
                throw new Error('Microsoft Ads report generation failed');
            }

            await new Promise(r => setTimeout(r, 2000));
            attempts++;
        }

        throw new Error('Microsoft Ads report polling timed out');
    }

    private parseCsv(csv: string): Record<string, string>[] {
        const lines = csv.trim().split('\n');
        // Skip header rows (Microsoft reports have metadata lines before the actual data)
        const dataStart = lines.findIndex(l => l.startsWith('"TimePeriod"') || l.startsWith('TimePeriod'));
        if (dataStart === -1) return [];

        const headers = lines[dataStart].replace(/"/g, '').split(',');
        return lines.slice(dataStart + 1)
            .filter(line => line.trim() && !line.startsWith('©'))
            .map(line => {
                const values = line.replace(/"/g, '').split(',');
                const row: Record<string, string> = {};
                headers.forEach((h, i) => { row[h.trim()] = values[i]?.trim() || ''; });
                return row;
            });
    }
}
