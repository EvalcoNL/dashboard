-- ClickHouse Performance Optimization Migration
-- Run these ALTER statements against your ClickHouse instance
-- These add secondary data-skipping indexes for frequently filtered columns

-- ═══════════════════════════════════════════════════════════════════
-- 1. Data Skipping Indexes on metrics_data
-- ═══════════════════════════════════════════════════════════════════

-- client_id is filtered in every query but not in the ORDER BY prefix
ALTER TABLE metrics_data ADD INDEX IF NOT EXISTS idx_client_id client_id TYPE set(0) GRANULARITY 4;

-- data_source_id is filtered frequently in normalization/sync queries
ALTER TABLE metrics_data ADD INDEX IF NOT EXISTS idx_ds_id data_source_id TYPE set(0) GRANULARITY 4;

-- level (campaign/ad_group/ad/keyword) is used in many GROUP BY clauses
ALTER TABLE metrics_data ADD INDEX IF NOT EXISTS idx_level level TYPE set(0) GRANULARITY 4;

-- connector_slug is used in platform breakdowns
ALTER TABLE metrics_data ADD INDEX IF NOT EXISTS idx_connector connector_slug TYPE set(0) GRANULARITY 4;

-- Materialize the indexes (builds for existing data, won't block writes)
ALTER TABLE metrics_data MATERIALIZE INDEX idx_client_id;
ALTER TABLE metrics_data MATERIALIZE INDEX idx_ds_id;
ALTER TABLE metrics_data MATERIALIZE INDEX idx_level;
ALTER TABLE metrics_data MATERIALIZE INDEX idx_connector;

-- ═══════════════════════════════════════════════════════════════════
-- 2. Data Skipping Indexes on order_data (e-commerce)
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE order_data ADD INDEX IF NOT EXISTS idx_order_client client_id TYPE set(0) GRANULARITY 4;
ALTER TABLE order_data ADD INDEX IF NOT EXISTS idx_order_ds data_source_id TYPE set(0) GRANULARITY 4;

ALTER TABLE order_data MATERIALIZE INDEX idx_order_client;
ALTER TABLE order_data MATERIALIZE INDEX idx_order_ds;
