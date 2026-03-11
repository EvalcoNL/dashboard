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

-- Data skipping indexes for fast filtered queries
-- Most queries filter on data_source_id which is not in the ORDER BY prefix
ALTER TABLE evalco.metrics_data ADD INDEX IF NOT EXISTS idx_ds_id data_source_id TYPE set(0) GRANULARITY 4;
ALTER TABLE evalco.metrics_data ADD INDEX IF NOT EXISTS idx_level level TYPE set(0) GRANULARITY 4;
ALTER TABLE evalco.metrics_data ADD INDEX IF NOT EXISTS idx_date date TYPE minmax GRANULARITY 4;


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


-- ═══════════════════════════════════════════════════════════════════
-- E-commerce: order_data table
-- Stores normalized e-commerce order and line-item records.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS evalco.order_data (
    -- Identifiers
    order_hash          String,
    data_source_id      String,
    client_id           String,
    connector_slug      LowCardinality(String),
    record_type         LowCardinality(String),

    -- ─── Order dimensions ───
    order_id            Nullable(String),
    order_number        Nullable(String),
    order_date          Nullable(DateTime),
    order_updated_at    Nullable(DateTime),
    order_status        LowCardinality(Nullable(String)),
    order_state         LowCardinality(Nullable(String)),
    payment_method      LowCardinality(Nullable(String)),
    currency            LowCardinality(Nullable(String)),

    -- Store
    store_id            Nullable(String),
    store_name          Nullable(String),
    sales_channel       LowCardinality(Nullable(String)),

    -- Geographic
    billing_country     LowCardinality(Nullable(String)),
    billing_city        Nullable(String),
    shipping_country    LowCardinality(Nullable(String)),
    shipping_city       Nullable(String),

    -- Customer
    customer_id         Nullable(String),
    customer_group      LowCardinality(Nullable(String)),

    -- PII (optional, may be stripped by normalization)
    customer_email      Nullable(String),
    customer_first_name Nullable(String),
    customer_last_name  Nullable(String),

    -- Other
    discount_code       Nullable(String),
    tags                Nullable(String),

    -- Line item dimensions
    line_item_id        Nullable(String),
    line_item_name      Nullable(String),
    product_id          Nullable(String),
    product_sku         Nullable(String),
    product_type        LowCardinality(Nullable(String)),
    variant_id          Nullable(String),
    variant_title       Nullable(String),

    -- Extra dimensions (JSON for connector-specific fields)
    extra_dimensions    String DEFAULT '{}',

    -- ─── Order metrics ───
    order_grand_total       Decimal(18,2)   DEFAULT 0,
    order_subtotal          Decimal(18,2)   DEFAULT 0,
    order_tax_amount        Decimal(18,2)   DEFAULT 0,
    order_shipping_amount   Decimal(18,2)   DEFAULT 0,
    order_shipping_tax      Decimal(18,2)   DEFAULT 0,
    order_discount_amount   Decimal(18,2)   DEFAULT 0,
    order_refund_amount     Decimal(18,2)   DEFAULT 0,
    order_count             UInt32          DEFAULT 0,

    -- Line item metrics
    line_item_quantity          UInt32          DEFAULT 0,
    line_item_price             Decimal(18,2)   DEFAULT 0,
    line_item_total             Decimal(18,2)   DEFAULT 0,
    line_item_total_incl_tax    Decimal(18,2)   DEFAULT 0,
    line_item_tax_amount        Decimal(18,2)   DEFAULT 0,
    line_item_discount_amount   Decimal(18,2)   DEFAULT 0,
    line_item_refund_amount     Decimal(18,2)   DEFAULT 0,
    line_item_original_price    Decimal(18,2)   DEFAULT 0,
    items_sold                  UInt32          DEFAULT 0,

    -- Extra metrics (JSON for connector-specific fields)
    extra_metrics       String DEFAULT '{}',

    -- Metadata
    created_at          DateTime        DEFAULT now(),
    updated_at          DateTime        DEFAULT now()
)
ENGINE = ReplacingMergeTree(updated_at)
PARTITION BY toYYYYMM(coalesce(order_date, now()))
ORDER BY (client_id, connector_slug, record_type, order_hash)
SETTINGS index_granularity = 8192;

-- Data skipping indexes for order_data
ALTER TABLE evalco.order_data ADD INDEX IF NOT EXISTS idx_order_client client_id TYPE set(0) GRANULARITY 4;
ALTER TABLE evalco.order_data ADD INDEX IF NOT EXISTS idx_order_ds data_source_id TYPE set(0) GRANULARITY 4;
ALTER TABLE evalco.order_data ADD INDEX IF NOT EXISTS idx_order_status order_status TYPE set(0) GRANULARITY 4;
