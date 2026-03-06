// ═══════════════════════════════════════════════════════════════════
// E-commerce Field Registry — Single Source of Truth for Order Data
// Defines all dimensions, metrics, and derived metrics for e-commerce connectors.
// ═══════════════════════════════════════════════════════════════════

export type EcomFieldType = 'STRING' | 'NUMBER' | 'CURRENCY' | 'DATE' | 'DATETIME' | 'PERCENTAGE' | 'COUNT';
export type EcomAggregation = 'SUM' | 'AVG' | 'WEIGHTED_AVG' | 'NONE' | 'COUNT_DISTINCT';
export type EcomRecordType = 'order' | 'line_item' | 'both';

export interface EcomDimension {
    slug: string;
    nameNl: string;
    nameEn: string;
    dataType: EcomFieldType;
    category: string;
    recordType: EcomRecordType;
    isPII?: boolean;
}

export interface EcomMetric {
    slug: string;
    nameNl: string;
    nameEn: string;
    dataType: EcomFieldType;
    aggregation: EcomAggregation;
    category: string;
    recordType: EcomRecordType;
}

export interface EcomDerivedMetric {
    slug: string;
    nameNl: string;
    nameEn: string;
    dataType: EcomFieldType;
    formula: string;
    numerator: string;
    denominator: string;
    multiply?: number;
    category: string;
}

// ─── Order Dimensions ────────────────────────────────────────────

export const ECOM_DIMENSIONS: EcomDimension[] = [
    // Order identity
    { slug: 'order_id', nameNl: 'Order ID', nameEn: 'Order ID', dataType: 'STRING', category: 'order', recordType: 'both' },
    { slug: 'order_number', nameNl: 'Ordernummer', nameEn: 'Order Number', dataType: 'STRING', category: 'order', recordType: 'both' },
    { slug: 'order_date', nameNl: 'Orderdatum', nameEn: 'Order Date', dataType: 'DATETIME', category: 'order', recordType: 'both' },
    { slug: 'order_updated_at', nameNl: 'Laatste Update', nameEn: 'Last Updated', dataType: 'DATETIME', category: 'order', recordType: 'both' },

    // Order status
    { slug: 'order_status', nameNl: 'Orderstatus', nameEn: 'Order Status', dataType: 'STRING', category: 'order', recordType: 'both' },
    { slug: 'order_state', nameNl: 'Order State', nameEn: 'Order State', dataType: 'STRING', category: 'order', recordType: 'both' },

    // Payment & currency
    { slug: 'payment_method', nameNl: 'Betaalmethode', nameEn: 'Payment Method', dataType: 'STRING', category: 'order', recordType: 'order' },
    { slug: 'currency', nameNl: 'Valuta', nameEn: 'Currency', dataType: 'STRING', category: 'order', recordType: 'both' },

    // Store
    { slug: 'store_id', nameNl: 'Store ID', nameEn: 'Store ID', dataType: 'STRING', category: 'store', recordType: 'both' },
    { slug: 'store_name', nameNl: 'Winkelnaam', nameEn: 'Store Name', dataType: 'STRING', category: 'store', recordType: 'both' },
    { slug: 'sales_channel', nameNl: 'Verkoopkanaal', nameEn: 'Sales Channel', dataType: 'STRING', category: 'store', recordType: 'both' },

    // Geographic
    { slug: 'billing_country', nameNl: 'Factuurland', nameEn: 'Billing Country', dataType: 'STRING', category: 'geo', recordType: 'order' },
    { slug: 'billing_city', nameNl: 'Factuurstad', nameEn: 'Billing City', dataType: 'STRING', category: 'geo', recordType: 'order' },
    { slug: 'shipping_country', nameNl: 'Ship Land', nameEn: 'Shipping Country', dataType: 'STRING', category: 'geo', recordType: 'order' },
    { slug: 'shipping_city', nameNl: 'Ship Stad', nameEn: 'Shipping City', dataType: 'STRING', category: 'geo', recordType: 'order' },

    // Customer
    { slug: 'customer_id', nameNl: 'Klant ID', nameEn: 'Customer ID', dataType: 'STRING', category: 'customer', recordType: 'order' },
    { slug: 'customer_group', nameNl: 'Klantgroep', nameEn: 'Customer Group', dataType: 'STRING', category: 'customer', recordType: 'order' },

    // PII (optioneel)
    { slug: 'customer_email', nameNl: 'Klant E-mail', nameEn: 'Customer Email', dataType: 'STRING', category: 'pii', recordType: 'order', isPII: true },
    { slug: 'customer_first_name', nameNl: 'Voornaam', nameEn: 'First Name', dataType: 'STRING', category: 'pii', recordType: 'order', isPII: true },
    { slug: 'customer_last_name', nameNl: 'Achternaam', nameEn: 'Last Name', dataType: 'STRING', category: 'pii', recordType: 'order', isPII: true },

    // Other
    { slug: 'discount_code', nameNl: 'Kortingscode', nameEn: 'Discount Code', dataType: 'STRING', category: 'order', recordType: 'order' },
    { slug: 'tags', nameNl: 'Tags', nameEn: 'Tags', dataType: 'STRING', category: 'order', recordType: 'order' },

    // Line item dimensions
    { slug: 'line_item_id', nameNl: 'Regelitem ID', nameEn: 'Line Item ID', dataType: 'STRING', category: 'product', recordType: 'line_item' },
    { slug: 'line_item_name', nameNl: 'Productnaam', nameEn: 'Product Name', dataType: 'STRING', category: 'product', recordType: 'line_item' },
    { slug: 'product_id', nameNl: 'Product ID', nameEn: 'Product ID', dataType: 'STRING', category: 'product', recordType: 'line_item' },
    { slug: 'product_sku', nameNl: 'SKU', nameEn: 'SKU', dataType: 'STRING', category: 'product', recordType: 'line_item' },
    { slug: 'product_type', nameNl: 'Producttype', nameEn: 'Product Type', dataType: 'STRING', category: 'product', recordType: 'line_item' },
    { slug: 'variant_id', nameNl: 'Variant ID', nameEn: 'Variant ID', dataType: 'STRING', category: 'product', recordType: 'line_item' },
    { slug: 'variant_title', nameNl: 'Variant', nameEn: 'Variant Title', dataType: 'STRING', category: 'product', recordType: 'line_item' },

    // Record type (built-in)
    { slug: 'record_type', nameNl: 'Record Type', nameEn: 'Record Type', dataType: 'STRING', category: 'system', recordType: 'both' },
];

// ─── Metrics ─────────────────────────────────────────────────────

export const ECOM_METRICS: EcomMetric[] = [
    // Order-level metrics
    { slug: 'order_grand_total', nameNl: 'Omzet (incl. BTW)', nameEn: 'Revenue (incl. Tax)', dataType: 'CURRENCY', aggregation: 'SUM', category: 'revenue', recordType: 'order' },
    { slug: 'order_subtotal', nameNl: 'Subtotaal', nameEn: 'Subtotal', dataType: 'CURRENCY', aggregation: 'SUM', category: 'revenue', recordType: 'order' },
    { slug: 'order_tax_amount', nameNl: 'BTW Bedrag', nameEn: 'Tax Amount', dataType: 'CURRENCY', aggregation: 'SUM', category: 'revenue', recordType: 'order' },
    { slug: 'order_shipping_amount', nameNl: 'Verzendkosten', nameEn: 'Shipping', dataType: 'CURRENCY', aggregation: 'SUM', category: 'shipping', recordType: 'order' },
    { slug: 'order_shipping_tax', nameNl: 'Verzend BTW', nameEn: 'Shipping Tax', dataType: 'CURRENCY', aggregation: 'SUM', category: 'shipping', recordType: 'order' },
    { slug: 'order_discount_amount', nameNl: 'Korting', nameEn: 'Discount', dataType: 'CURRENCY', aggregation: 'SUM', category: 'discount', recordType: 'order' },
    { slug: 'order_refund_amount', nameNl: 'Retourbedrag', nameEn: 'Refund Amount', dataType: 'CURRENCY', aggregation: 'SUM', category: 'refund', recordType: 'order' },
    { slug: 'order_count', nameNl: 'Aantal Bestellingen', nameEn: 'Orders', dataType: 'COUNT', aggregation: 'SUM', category: 'count', recordType: 'order' },

    // Line item metrics
    { slug: 'line_item_quantity', nameNl: 'Aantal', nameEn: 'Quantity', dataType: 'COUNT', aggregation: 'SUM', category: 'product', recordType: 'line_item' },
    { slug: 'line_item_price', nameNl: 'Stukprijs', nameEn: 'Unit Price', dataType: 'CURRENCY', aggregation: 'NONE', category: 'product', recordType: 'line_item' },
    { slug: 'line_item_total', nameNl: 'Regeltotaal', nameEn: 'Line Total', dataType: 'CURRENCY', aggregation: 'SUM', category: 'product', recordType: 'line_item' },
    { slug: 'line_item_total_incl_tax', nameNl: 'Regeltotaal (incl. BTW)', nameEn: 'Line Total Incl. Tax', dataType: 'CURRENCY', aggregation: 'SUM', category: 'product', recordType: 'line_item' },
    { slug: 'line_item_tax_amount', nameNl: 'Regel BTW', nameEn: 'Line Tax', dataType: 'CURRENCY', aggregation: 'SUM', category: 'product', recordType: 'line_item' },
    { slug: 'line_item_discount_amount', nameNl: 'Regelkorting', nameEn: 'Line Discount', dataType: 'CURRENCY', aggregation: 'SUM', category: 'product', recordType: 'line_item' },
    { slug: 'line_item_refund_amount', nameNl: 'Regelretour', nameEn: 'Line Refund', dataType: 'CURRENCY', aggregation: 'SUM', category: 'product', recordType: 'line_item' },
    { slug: 'line_item_original_price', nameNl: 'Oorspronkelijke Prijs', nameEn: 'Original Price', dataType: 'CURRENCY', aggregation: 'NONE', category: 'product', recordType: 'line_item' },
    { slug: 'items_sold', nameNl: 'Verkochte Items', nameEn: 'Items Sold', dataType: 'COUNT', aggregation: 'SUM', category: 'count', recordType: 'line_item' },
];

// ─── Derived Metrics ─────────────────────────────────────────────

export const ECOM_DERIVED_METRICS: EcomDerivedMetric[] = [
    {
        slug: 'average_order_value',
        nameNl: 'Gem. Orderwaarde',
        nameEn: 'Avg. Order Value',
        dataType: 'CURRENCY',
        formula: 'SUM(order_grand_total) / nullIf(SUM(order_count), 0)',
        numerator: 'order_grand_total',
        denominator: 'order_count',
        category: 'kpi',
    },
    {
        slug: 'items_per_order',
        nameNl: 'Items Per Bestelling',
        nameEn: 'Items Per Order',
        dataType: 'NUMBER',
        formula: 'SUM(items_sold) / nullIf(SUM(order_count), 0)',
        numerator: 'items_sold',
        denominator: 'order_count',
        category: 'kpi',
    },
    {
        slug: 'return_rate',
        nameNl: 'Retourpercentage',
        nameEn: 'Return Rate',
        dataType: 'PERCENTAGE',
        formula: 'SUM(order_refund_amount) / nullIf(SUM(order_grand_total), 0) * 100',
        numerator: 'order_refund_amount',
        denominator: 'order_grand_total',
        multiply: 100,
        category: 'kpi',
    },
    {
        slug: 'discount_rate',
        nameNl: 'Kortingspercentage',
        nameEn: 'Discount Rate',
        dataType: 'PERCENTAGE',
        formula: 'SUM(order_discount_amount) / nullIf(SUM(order_subtotal), 0) * 100',
        numerator: 'order_discount_amount',
        denominator: 'order_subtotal',
        multiply: 100,
        category: 'kpi',
    },
    {
        slug: 'avg_line_item_value',
        nameNl: 'Gem. Product Waarde',
        nameEn: 'Avg. Line Item Value',
        dataType: 'CURRENCY',
        formula: 'SUM(line_item_total) / nullIf(SUM(items_sold), 0)',
        numerator: 'line_item_total',
        denominator: 'items_sold',
        category: 'kpi',
    },
];

// ─── Utility Functions ───────────────────────────────────────────

const _knownOrderDimensions = new Set(ECOM_DIMENSIONS.map(d => d.slug));
const _knownOrderMetrics = new Set(ECOM_METRICS.map(m => m.slug));

export function getKnownOrderDimensions(): Set<string> {
    return _knownOrderDimensions;
}

export function getKnownOrderMetrics(): Set<string> {
    return _knownOrderMetrics;
}

export function getPIIDimensions(): string[] {
    return ECOM_DIMENSIONS.filter(d => d.isPII).map(d => d.slug);
}

export function getOrderDimensionsByCategory(category: string): EcomDimension[] {
    return ECOM_DIMENSIONS.filter(d => d.category === category);
}

export function getOrderMetricsByCategory(category: string): EcomMetric[] {
    return ECOM_METRICS.filter(m => m.category === category);
}
