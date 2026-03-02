// ═══════════════════════════════════════════════════════════════════
// Data Integration Platform — Core Types
// ═══════════════════════════════════════════════════════════════════

// ─── Connector Categories ───────────────────────────────────────

export type ConnectorCategory =
    | 'PAID_SEARCH'
    | 'PAID_SOCIAL'
    | 'ANALYTICS'
    | 'ORGANIC_SOCIAL'
    | 'ECOMMERCE'
    | 'CRM'
    | 'EMAIL'
    | 'PROGRAMMATIC'
    | 'SEO'
    | 'AFFILIATE'
    | 'COMPARISON_SHOPPING'
    | 'CUSTOM';

export type AuthType = 'oauth2' | 'api_key' | 'basic' | 'custom';

export type ConnectionStatus = 'ACTIVE' | 'PAUSED' | 'ERROR' | 'REVOKED';

export type SyncJobStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export type DataType = 'STRING' | 'NUMBER' | 'DATE' | 'BOOLEAN';

export type MetricDataType = 'NUMBER' | 'CURRENCY' | 'PERCENTAGE' | 'DURATION';

export type AggregationType = 'SUM' | 'AVG' | 'MIN' | 'MAX' | 'NONE';

// ─── Data Level (replaces report types) ──────────────────────────

/** A data level defines the granularity at which data is fetched.
 *  Each level has a set of default + optional dimensions/metrics. */
export interface DataLevel {
    slug: string;           // e.g. "campaign", "ad_group", "ad", "keyword"
    name: string;           // e.g. "Campaign Level"
    description?: string;
    defaultDimensions: string[];   // Always included
    optionalDimensions: string[];  // User can toggle
    defaultMetrics: string[];      // Always included
    optionalMetrics: string[];     // User can toggle
}

// ─── Universal Canonical Dimensions ──────────────────────────────

export const CANONICAL_DIMENSIONS = {
    // Time
    date: { name: 'Date', dataType: 'DATE' },
    hour: { name: 'Hour', dataType: 'NUMBER' },

    // Account hierarchy
    account_id: { name: 'Account ID', dataType: 'STRING' },
    account_name: { name: 'Account Name', dataType: 'STRING' },

    // Campaign hierarchy
    campaign_id: { name: 'Campaign ID', dataType: 'STRING' },
    campaign_name: { name: 'Campaign Name', dataType: 'STRING' },
    campaign_type: { name: 'Campaign Type', dataType: 'STRING' },
    campaign_status: { name: 'Campaign Status', dataType: 'STRING' },
    campaign_objective: { name: 'Campaign Objective', dataType: 'STRING' },

    // Ad group / Ad set
    ad_group_id: { name: 'Ad Group ID', dataType: 'STRING' },
    ad_group_name: { name: 'Ad Group Name', dataType: 'STRING' },
    ad_group_status: { name: 'Ad Group Status', dataType: 'STRING' },

    // Ad / Creative
    ad_id: { name: 'Ad ID', dataType: 'STRING' },
    ad_name: { name: 'Ad Name', dataType: 'STRING' },
    ad_type: { name: 'Ad Type', dataType: 'STRING' },
    ad_status: { name: 'Ad Status', dataType: 'STRING' },

    // Keyword
    keyword_text: { name: 'Keyword', dataType: 'STRING' },
    keyword_match_type: { name: 'Match Type', dataType: 'STRING' },
    search_term: { name: 'Search Term', dataType: 'STRING' },

    // Campaign details (Google Ads extended)
    bidding_strategy_type: { name: 'Bidding Strategy Type', dataType: 'STRING' },
    campaign_budget: { name: 'Campaign Budget', dataType: 'NUMBER' },
    campaign_labels: { name: 'Campaign Labels', dataType: 'STRING' },
    campaign_start_date: { name: 'Start Date (Campaign)', dataType: 'DATE' },
    campaign_end_date: { name: 'End Date (Campaign)', dataType: 'DATE' },

    // Ad Group details
    ad_group_type: { name: 'Ad Group Type', dataType: 'STRING' },
    ad_group_cpc_bid: { name: 'Ad Group CPC Bid', dataType: 'NUMBER' },

    // Segments
    hour_of_day: { name: 'Hour of Day', dataType: 'NUMBER' },
    slot: { name: 'Slot', dataType: 'STRING' },
    conversion_action_name: { name: 'Conversion Name', dataType: 'STRING' },
    conversion_action_category: { name: 'Conversion Category', dataType: 'STRING' },

    // Targeting / demographics
    device: { name: 'Device', dataType: 'STRING' },
    device_category: { name: 'Device Category', dataType: 'STRING' },
    browser: { name: 'Browser', dataType: 'STRING' },
    country: { name: 'Country', dataType: 'STRING' },
    region: { name: 'Region', dataType: 'STRING' },
    city: { name: 'City', dataType: 'STRING' },
    age: { name: 'Age Range', dataType: 'STRING' },
    gender: { name: 'Gender', dataType: 'STRING' },
    language: { name: 'Language', dataType: 'STRING' },

    // Network / placement
    network: { name: 'Network', dataType: 'STRING' },
    placement: { name: 'Placement', dataType: 'STRING' },
    publisher_platform: { name: 'Publisher Platform', dataType: 'STRING' },

    // Attribution / source
    source: { name: 'Source', dataType: 'STRING' },
    medium: { name: 'Medium', dataType: 'STRING' },
    source_medium: { name: 'Source / Medium', dataType: 'STRING' },
    session_source: { name: 'Session Source', dataType: 'STRING' },
    session_medium: { name: 'Session Medium', dataType: 'STRING' },
    session_campaign_name: { name: 'Session Campaign', dataType: 'STRING' },
    channel: { name: 'Channel', dataType: 'STRING' },

    // Content
    landing_page: { name: 'Landing Page', dataType: 'STRING' },
    page_path: { name: 'Page Path', dataType: 'STRING' },
    page_title: { name: 'Page Title', dataType: 'STRING' },
    content_type: { name: 'Content Type', dataType: 'STRING' },

    // E-commerce
    product_id: { name: 'Product ID', dataType: 'STRING' },
    product_name: { name: 'Product Name', dataType: 'STRING' },
    product_category: { name: 'Product Category', dataType: 'STRING' },
    brand: { name: 'Brand', dataType: 'STRING' },

    // Social
    post_id: { name: 'Post ID', dataType: 'STRING' },
    post_type: { name: 'Post Type', dataType: 'STRING' },

    // Email
    email_campaign: { name: 'Email Campaign', dataType: 'STRING' },
    email_list: { name: 'Email List', dataType: 'STRING' },
    email_subject: { name: 'Email Subject', dataType: 'STRING' },
} as const;

export type CanonicalDimension = keyof typeof CANONICAL_DIMENSIONS;

// ─── Universal Canonical Metrics ──────────────────────────────────

export const CANONICAL_METRICS = {
    // Core advertising metrics
    impressions: { name: 'Impressions', dataType: 'NUMBER', aggregation: 'SUM' },
    clicks: { name: 'Clicks', dataType: 'NUMBER', aggregation: 'SUM' },
    cost: { name: 'Cost', dataType: 'CURRENCY', aggregation: 'SUM' },
    conversions: { name: 'Conversions', dataType: 'NUMBER', aggregation: 'SUM' },
    conversion_value: { name: 'Conversion Value', dataType: 'CURRENCY', aggregation: 'SUM' },

    // Derived advertising metrics
    ctr: { name: 'CTR', dataType: 'PERCENTAGE', aggregation: 'NONE', formula: 'clicks / impressions * 100' },
    cpc: { name: 'CPC', dataType: 'CURRENCY', aggregation: 'NONE', formula: 'cost / clicks' },
    cpm: { name: 'CPM', dataType: 'CURRENCY', aggregation: 'NONE', formula: 'cost / impressions * 1000' },
    roas: { name: 'ROAS', dataType: 'NUMBER', aggregation: 'NONE', formula: 'conversion_value / cost' },
    conversion_rate: { name: 'Conversion Rate', dataType: 'PERCENTAGE', aggregation: 'NONE', formula: 'conversions / clicks * 100' },
    cost_per_conversion: { name: 'Cost per Conversion', dataType: 'CURRENCY', aggregation: 'NONE', formula: 'cost / conversions' },

    // Video metrics
    video_views: { name: 'Video Views', dataType: 'NUMBER', aggregation: 'SUM' },
    video_view_rate: { name: 'Video View Rate', dataType: 'PERCENTAGE', aggregation: 'NONE', formula: 'video_views / impressions * 100' },

    // Analytics/website metrics
    sessions: { name: 'Sessions', dataType: 'NUMBER', aggregation: 'SUM' },
    users: { name: 'Users', dataType: 'NUMBER', aggregation: 'SUM' },
    total_users: { name: 'Total Users', dataType: 'NUMBER', aggregation: 'SUM' },
    new_users: { name: 'New Users', dataType: 'NUMBER', aggregation: 'SUM' },
    pageviews: { name: 'Pageviews', dataType: 'NUMBER', aggregation: 'SUM' },
    screen_page_views: { name: 'Page Views', dataType: 'NUMBER', aggregation: 'SUM' },
    bounce_rate: { name: 'Bounce Rate', dataType: 'PERCENTAGE', aggregation: 'NONE' },
    average_session_duration: { name: 'Avg. Session Duration', dataType: 'DURATION', aggregation: 'NONE' },
    avg_session_duration: { name: 'Avg. Session Duration', dataType: 'DURATION', aggregation: 'NONE' },
    engagement_rate: { name: 'Engagement Rate', dataType: 'PERCENTAGE', aggregation: 'NONE' },
    event_count: { name: 'Event Count', dataType: 'NUMBER', aggregation: 'SUM' },

    // Social metrics
    reach: { name: 'Reach', dataType: 'NUMBER', aggregation: 'SUM' },
    engagement: { name: 'Engagement', dataType: 'NUMBER', aggregation: 'SUM' },
    likes: { name: 'Likes', dataType: 'NUMBER', aggregation: 'SUM' },
    comments: { name: 'Comments', dataType: 'NUMBER', aggregation: 'SUM' },
    shares: { name: 'Shares', dataType: 'NUMBER', aggregation: 'SUM' },
    followers: { name: 'Followers', dataType: 'NUMBER', aggregation: 'SUM' },
    followers_gained: { name: 'Followers Gained', dataType: 'NUMBER', aggregation: 'SUM' },

    // E-commerce metrics
    revenue: { name: 'Revenue', dataType: 'CURRENCY', aggregation: 'SUM' },
    transactions: { name: 'Transactions', dataType: 'NUMBER', aggregation: 'SUM' },
    units_sold: { name: 'Units Sold', dataType: 'NUMBER', aggregation: 'SUM' },
    aov: { name: 'Average Order Value', dataType: 'CURRENCY', aggregation: 'NONE', formula: 'revenue / transactions' },

    // Email metrics
    emails_sent: { name: 'Emails Sent', dataType: 'NUMBER', aggregation: 'SUM' },
    emails_delivered: { name: 'Emails Delivered', dataType: 'NUMBER', aggregation: 'SUM' },
    email_opens: { name: 'Opens', dataType: 'NUMBER', aggregation: 'SUM' },
    email_clicks: { name: 'Email Clicks', dataType: 'NUMBER', aggregation: 'SUM' },
    email_unsubscribes: { name: 'Unsubscribes', dataType: 'NUMBER', aggregation: 'SUM' },
    open_rate: { name: 'Open Rate', dataType: 'PERCENTAGE', aggregation: 'NONE', formula: 'email_opens / emails_delivered * 100' },
    click_rate: { name: 'Click Rate', dataType: 'PERCENTAGE', aggregation: 'NONE', formula: 'email_clicks / emails_delivered * 100' },

    // SEO metrics
    organic_impressions: { name: 'Organic Impressions', dataType: 'NUMBER', aggregation: 'SUM' },
    organic_clicks: { name: 'Organic Clicks', dataType: 'NUMBER', aggregation: 'SUM' },
    avg_position: { name: 'Avg. Position', dataType: 'NUMBER', aggregation: 'NONE' },
    organic_ctr: { name: 'Organic CTR', dataType: 'PERCENTAGE', aggregation: 'NONE', formula: 'organic_clicks / organic_impressions * 100' },
} as const;

export type CanonicalMetric = keyof typeof CANONICAL_METRICS;

// ─── Connector Framework Interfaces ──────────────────────────────

/** Credentials returned after authentication */
export interface AuthResult {
    success: boolean;
    refreshToken?: string;
    accessToken?: string;
    expiresAt?: Date;
    error?: string;
}

/** Configuration for a data fetch operation — uses level, not report type */
export interface FetchConfig {
    accountId: string;
    level: string;          // e.g. "campaign", "ad_group", "ad"
    dateFrom: Date;
    dateTo: Date;
    dimensions: string[];   // Default + user-selected optional dimensions
    metrics: string[];      // Default + user-selected optional metrics
    filters?: Record<string, string | string[]>;
}

/** A single raw data row from a platform API */
export interface RawDataRow {
    dimensions: Record<string, string | number | boolean>;
    metrics: Record<string, number>;
}

/** Response from a data fetch */
export interface FetchResponse {
    rows: RawDataRow[];
    totalRows: number;
    metadata?: Record<string, unknown>;
}

/** Account discovered from a platform */
export interface DiscoveredAccount {
    externalId: string;
    name: string;
    currency?: string;
    timezone?: string;
    isManager?: boolean;
    children?: DiscoveredAccount[];
}

/** Dimension field mapping from platform → canonical */
export interface DimensionMapping {
    platformField: string;
    canonicalField: CanonicalDimension;
    transform?: (value: string | number) => string | number;
}

/** Metric field mapping from platform → canonical */
export interface MetricMapping {
    platformField: string;
    canonicalField: CanonicalMetric;
    transform?: (value: number) => number;
}

/** The main connector interface that all platform connectors implement */
export interface IDataConnector {
    // ─── Identity ───
    readonly slug: string;
    readonly name: string;
    readonly category: ConnectorCategory;
    readonly authType: AuthType;

    // ─── Authentication ───
    getAuthUrl?(redirectUri: string, state?: string): Promise<string>;
    authenticate(params: Record<string, string>): Promise<AuthResult>;
    testConnection(credentials: string): Promise<boolean>;
    refreshAccessToken?(credentials: string): Promise<AuthResult>;

    // ─── Discovery ───
    getAvailableAccounts(credentials: string): Promise<DiscoveredAccount[]>;

    // ─── Levels & Defaults (replaces report types) ───
    getSupportedLevels(): DataLevel[];
    getDefaultDimensions(level: string): string[];
    getOptionalDimensions(level: string): string[];
    getDefaultMetrics(level: string): string[];
    getOptionalMetrics(level: string): string[];

    // ─── Data Fetching ───
    fetchData(credentials: string, config: FetchConfig): Promise<FetchResponse>;

    // ─── Field Mapping ───
    getDimensionMappings(): DimensionMapping[];
    getMetricMappings(): MetricMapping[];

    // ─── Sync Configuration ───
    getAttributionWindowDays(): number;
    getMaxLookbackDays(): number;
}

// ─── Dataset Query Types ─────────────────────────────────────────

export interface DatasetQuery {
    datasetId?: string;
    connectionIds?: string[];
    dateFrom: Date;
    dateTo: Date;
    dimensions: string[];
    metrics: string[];
    filters?: DatasetFilter[];
    orderBy?: DatasetOrderBy[];
    limit?: number;
    offset?: number;
}

export interface DatasetFilter {
    field: string;
    operator: 'eq' | 'neq' | 'contains' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in';
    value: string | number | string[] | number[];
}

export interface DatasetOrderBy {
    field: string;
    direction: 'asc' | 'desc';
}

export interface DatasetResult {
    rows: Record<string, string | number>[];
    totalRows: number;
    dimensions: string[];
    metrics: string[];
    dateRange: { from: Date; to: Date };
}

// ─── Dashboard Widget Types ──────────────────────────────────────

export type WidgetType =
    | 'kpi_card'
    | 'time_series'
    | 'bar_chart'
    | 'pie_chart'
    | 'funnel_chart'
    | 'pivot_table'
    | 'geo_map'
    | 'treemap'
    | 'scatter_plot';

export interface WidgetConfig {
    type: WidgetType;
    title: string;
    datasetId?: string;
    connectionIds?: string[];
    dimensions: string[];
    metrics: string[];
    filters?: DatasetFilter[];
    compareMode?: 'previous_period' | 'previous_year' | 'custom';
    chartOptions?: Record<string, unknown>;
}
