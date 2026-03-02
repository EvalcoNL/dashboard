// ═══════════════════════════════════════════════════════════════════
// Data Integration — Barrel Export
// ═══════════════════════════════════════════════════════════════════

// Framework
export { BaseConnector } from './base-connector';
export { connectorRegistry } from './connector-registry';
export { normalizationService } from './normalization-service';
export { syncEngine } from './sync-engine';
export { datasetQueryEngine } from './dataset-query-engine';
export { syncScheduler } from './sync-scheduler';
export { connectionHealthMonitor } from './connection-health';

// Re-export types
export type {
    IDataConnector,
    ConnectorCategory,
    AuthType,
    AuthResult,
    FetchConfig,
    FetchResponse,
    RawDataRow,
    DiscoveredAccount,
    DataLevel,
    DimensionMapping,
    MetricMapping,
    DatasetQuery,
    DatasetResult,
    DatasetFilter,
    DatasetOrderBy,
    CanonicalDimension,
    CanonicalMetric,
    WidgetConfig,
    WidgetType,
} from '@/types/data-integration';

export { CANONICAL_DIMENSIONS, CANONICAL_METRICS } from '@/types/data-integration';

// Field Registry — single source of truth for all field metadata
export {
    getField, getFieldMeta, getBuiltinDimensions, isBuiltinDimension,
    isDerivedMetric, getAllDimensionSlugs, getAllMetricSlugs, getDerivedMetricSlugs,
    getAggregationType, determineQueryLevel, getColumnName, resolveColumnSlug,
    DIMENSION_METADATA, METRIC_METADATA,
} from './field-registry';

export type { HealthStatus, ConnectionHealth, HealthSummary } from './connection-health';
