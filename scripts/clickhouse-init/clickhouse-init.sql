-- ═══════════════════════════════════════════════════════════════════
-- Evalco ClickHouse Schema — Analytical Data Store
-- Automatically runs on first container start via docker-entrypoint-initdb.d
-- ═══════════════════════════════════════════════════════════════════

-- ─── Main table: all metric data with real columns ───

CREATE TABLE IF NOT EXISTS evalco.metrics_data (
    -- Identifiers
    canonical_hash      String,
    data_source_id      String,
    account_id          Nullable(String),
    client_id           String,
    connector_slug      LowCardinality(String),

    -- Time
    date                Date,

    -- Level
    level               LowCardinality(String),

    -- ─── Dimension columns ───
    -- Campaign
    campaign_id         Nullable(String),
    campaign_name       Nullable(String),
    campaign_type       LowCardinality(Nullable(String)),
    campaign_status     LowCardinality(Nullable(String)),
    campaign_objective  LowCardinality(Nullable(String)),

    -- Ad Group
    ad_group_id         Nullable(String),
    ad_group_name       Nullable(String),
    ad_group_status     LowCardinality(Nullable(String)),

    -- Ad
    ad_id               Nullable(String),
    ad_name             Nullable(String),
    ad_type             LowCardinality(Nullable(String)),

    -- Keyword
    keyword_text        Nullable(String),
    keyword_match_type  LowCardinality(Nullable(String)),

    -- Segments / Breakdowns
    device              LowCardinality(Nullable(String)),
    country             LowCardinality(Nullable(String)),
    network             LowCardinality(Nullable(String)),
    age                 LowCardinality(Nullable(String)),
    gender              LowCardinality(Nullable(String)),
    placement           LowCardinality(Nullable(String)),
    publisher_platform  LowCardinality(Nullable(String)),

    -- GA4 / Analytics dimensions
    source              Nullable(String),
    medium              LowCardinality(Nullable(String)),
    page_path           Nullable(String),
    page_title          Nullable(String),
    landing_page        Nullable(String),
    session_campaign_name Nullable(String),
    browser             LowCardinality(Nullable(String)),

    -- Extra dimensions (JSON string for connector-specific fields)
    extra_dimensions    String DEFAULT '{}',

    -- ─── Metric columns ───
    -- Core ad metrics
    impressions         UInt64          DEFAULT 0,
    clicks              UInt64          DEFAULT 0,
    cost                Decimal(18,2)   DEFAULT 0,
    conversions         Decimal(18,4)   DEFAULT 0,
    conversion_value    Decimal(18,2)   DEFAULT 0,
    video_views         UInt64          DEFAULT 0,
    engagements         UInt64          DEFAULT 0,

    -- Reach & Frequency
    reach               UInt64          DEFAULT 0,
    frequency           Decimal(8,4)    DEFAULT 0,

    -- Click detail metrics
    unique_clicks       UInt64          DEFAULT 0,
    link_clicks         UInt64          DEFAULT 0,

    -- Social engagement metrics
    post_engagement     UInt64          DEFAULT 0,
    likes               UInt64          DEFAULT 0,
    comments            UInt64          DEFAULT 0,
    shares              UInt64          DEFAULT 0,
    follows             UInt64          DEFAULT 0,

    -- Extended conversion metrics
    all_conversions         Decimal(18,4)   DEFAULT 0,
    view_through_conversions Decimal(18,4)  DEFAULT 0,

    -- Search quality & competition
    impression_share    Decimal(8,4)    DEFAULT 0,
    quality_score       UInt8           DEFAULT 0,

    -- E-commerce / GA4 metrics
    sessions            UInt64          DEFAULT 0,
    page_views          UInt64          DEFAULT 0,
    new_users           UInt64          DEFAULT 0,
    active_users        UInt64          DEFAULT 0,
    bounce_rate         Decimal(8,4)    DEFAULT 0,
    avg_session_duration Decimal(12,2)  DEFAULT 0,
    engagement_rate     Decimal(8,4)    DEFAULT 0,
    transactions        UInt64          DEFAULT 0,
    purchase_revenue    Decimal(18,2)   DEFAULT 0,
    adds_to_cart        UInt64          DEFAULT 0,
    event_count         UInt64          DEFAULT 0,

    -- Extra metrics (JSON string for connector-specific fields)
    extra_metrics       String DEFAULT '{}',

    -- Metadata
    created_at          DateTime        DEFAULT now(),
    updated_at          DateTime        DEFAULT now()
)
ENGINE = ReplacingMergeTree(updated_at)
PARTITION BY toYYYYMM(date)
ORDER BY (client_id, connector_slug, date, level, canonical_hash)
SETTINGS index_granularity = 8192;


-- ─── Materialized View: daily rollup per client/connector ───

CREATE TABLE IF NOT EXISTS evalco.daily_rollup (
    client_id           String,
    connector_slug      LowCardinality(String),
    date                Date,
    impressions         UInt64,
    clicks              UInt64,
    cost                Decimal(38,2),
    conversions         Decimal(38,4),
    conversion_value    Decimal(38,2),
    video_views         UInt64,
    reach               UInt64,
    post_engagement     UInt64,
    all_conversions     Decimal(38,4),
    sessions            UInt64,
    page_views          UInt64,
    transactions        UInt64,
    purchase_revenue    Decimal(38,2),
    event_count         UInt64,
    record_count        UInt64
)
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (client_id, connector_slug, date);

CREATE MATERIALIZED VIEW IF NOT EXISTS evalco.daily_rollup_mv
TO evalco.daily_rollup
AS SELECT
    client_id,
    connector_slug,
    date,
    sum(impressions)            AS impressions,
    sum(clicks)                 AS clicks,
    sum(cost)                   AS cost,
    sum(conversions)            AS conversions,
    sum(conversion_value)       AS conversion_value,
    sum(video_views)            AS video_views,
    sum(reach)                  AS reach,
    sum(post_engagement)        AS post_engagement,
    sum(all_conversions)        AS all_conversions,
    sum(sessions)               AS sessions,
    sum(page_views)             AS page_views,
    sum(transactions)           AS transactions,
    sum(purchase_revenue)       AS purchase_revenue,
    sum(event_count)            AS event_count,
    count()                     AS record_count
FROM evalco.metrics_data
GROUP BY client_id, connector_slug, date;


-- ─── Materialized View: monthly rollup per client/connector ───

CREATE TABLE IF NOT EXISTS evalco.monthly_rollup (
    client_id           String,
    connector_slug      LowCardinality(String),
    month               Date,
    impressions         UInt64,
    clicks              UInt64,
    cost                Decimal(38,2),
    conversions         Decimal(38,4),
    conversion_value    Decimal(38,2),
    video_views         UInt64,
    reach               UInt64,
    post_engagement     UInt64,
    all_conversions     Decimal(38,4),
    sessions            UInt64,
    page_views          UInt64,
    transactions        UInt64,
    purchase_revenue    Decimal(38,2),
    event_count         UInt64,
    record_count        UInt64
)
ENGINE = SummingMergeTree()
PARTITION BY toYear(month)
ORDER BY (client_id, connector_slug, month);

CREATE MATERIALIZED VIEW IF NOT EXISTS evalco.monthly_rollup_mv
TO evalco.monthly_rollup
AS SELECT
    client_id,
    connector_slug,
    toStartOfMonth(date)        AS month,
    sum(impressions)            AS impressions,
    sum(clicks)                 AS clicks,
    sum(cost)                   AS cost,
    sum(conversions)            AS conversions,
    sum(conversion_value)       AS conversion_value,
    sum(video_views)            AS video_views,
    sum(reach)                  AS reach,
    sum(post_engagement)        AS post_engagement,
    sum(all_conversions)        AS all_conversions,
    sum(sessions)               AS sessions,
    sum(page_views)             AS page_views,
    sum(transactions)           AS transactions,
    sum(purchase_revenue)       AS purchase_revenue,
    sum(event_count)            AS event_count,
    count()                     AS record_count
FROM evalco.metrics_data
GROUP BY client_id, connector_slug, toStartOfMonth(date);
