// ═══════════════════════════════════════════════════════════════════
// Magento 2 Connector — E-commerce Order Data
// Fetches orders via Magento 2 REST API (/V1/orders)
// ═══════════════════════════════════════════════════════════════════

import { BaseConnector } from '../base-connector';
import type {
    ConnectorCategory,
    AuthType,
    AuthResult,
    DiscoveredAccount,
    DataLevel,
    FetchConfig,
    FetchResponse,
    DimensionMapping,
    MetricMapping,
} from '@/types/data-integration';

interface MagentoCredentials {
    domain: string;     // e.g. https://shop.example.com
    apiKey: string;     // Integration Access Token (Bearer)
}

interface MagentoOrder {
    entity_id: number;
    increment_id: string;
    created_at: string;
    updated_at: string;
    state: string;
    status: string;
    store_id: number;
    store_name: string;
    customer_id: number | null;
    customer_group_id: number | null;
    customer_email: string;
    customer_firstname: string;
    customer_lastname: string;
    order_currency_code: string;
    grand_total: number;
    subtotal: number;
    tax_amount: number;
    shipping_amount: number;
    shipping_tax_amount: number;
    discount_amount: number;
    discount_description: string | null;
    total_refunded: number | null;
    payment: { method: string; additional_information?: string[] };
    billing_address: { country_id: string; city?: string };
    extension_attributes?: {
        shipping_assignments?: Array<{
            shipping?: {
                address?: { country_id: string; city?: string };
            };
        }>;
    };
    items: MagentoOrderItem[];
    applied_rule_ids?: string;
}

interface MagentoOrderItem {
    item_id: number;
    name: string;
    sku: string;
    product_id: number;
    product_type: string;
    qty_ordered: number;
    price: number;
    original_price: number;
    row_total: number;
    row_total_incl_tax: number;
    tax_amount: number;
    discount_amount: number;
    amount_refunded: number;
    parent_item_id: number | null;
}

export class MagentoConnector extends BaseConnector {
    readonly slug = 'magento';
    readonly name = 'Magento 2';
    readonly category: ConnectorCategory = 'ECOMMERCE';
    readonly authType: AuthType = 'api_key';

    protected rateLimitPerMinute = 120;

    // ─── Auth ────────────────────────────────────────────────────

    async authenticate(params: Record<string, string>): Promise<AuthResult> {
        const { domain, apiKey } = params;
        if (!domain || !apiKey) {
            return { success: false, error: 'Domain and API key are required' };
        }

        try {
            const cleanDomain = domain.replace(/\/+$/, '');
            const res = await fetch(`${cleanDomain}/rest/V1/store/storeConfigs`, {
                headers: { Authorization: `Bearer ${apiKey}` },
            });

            if (!res.ok) {
                return { success: false, error: `Magento API error: ${res.status} ${res.statusText}` };
            }

            return {
                success: true,
                credentials: JSON.stringify({ domain: cleanDomain, apiKey }),
            };
        } catch (error) {
            return { success: false, error: `Connection failed: ${(error as Error).message}` };
        }
    }

    async testConnection(credentials: string): Promise<boolean> {
        try {
            const creds = this.parseCredentials<MagentoCredentials>(credentials);
            const res = await fetch(`${creds.domain}/rest/V1/store/storeConfigs`, {
                headers: { Authorization: `Bearer ${creds.apiKey}` },
            });
            return res.ok;
        } catch {
            return false;
        }
    }

    async getAvailableAccounts(credentials: string): Promise<DiscoveredAccount[]> {
        const creds = this.parseCredentials<MagentoCredentials>(credentials);

        try {
            const res = await fetch(`${creds.domain}/rest/V1/store/storeConfigs`, {
                headers: { Authorization: `Bearer ${creds.apiKey}` },
            });

            if (!res.ok) return [];

            const stores = await res.json() as Array<{ id: number; code: string; website_id: number; base_url: string }>;

            return stores.map(store => ({
                externalId: String(store.id),
                name: store.code || `Store ${store.id}`,
                currency: 'EUR',
            }));
        } catch {
            // Default account based on domain
            return [{
                externalId: 'default',
                name: new URL(creds.domain).hostname,
                currency: 'EUR',
            }];
        }
    }

    // ─── Levels ──────────────────────────────────────────────────

    getSupportedLevels(): DataLevel[] {
        return [
            {
                slug: 'order',
                name: 'Order Level',
                defaultDimensions: [
                    'entity_id', 'increment_id', 'created_at', 'updated_at',
                    'status', 'state', 'payment_method', 'order_currency_code',
                    'store_id', 'store_name', 'billing_country', 'shipping_country',
                    'customer_id', 'customer_group_id', 'discount_description',
                ],
                optionalDimensions: [
                    'customer_email', 'customer_firstname', 'customer_lastname',
                    'billing_city', 'shipping_city', 'applied_rule_ids',
                ],
                defaultMetrics: [
                    'grand_total', 'subtotal', 'tax_amount',
                    'shipping_amount', 'shipping_tax_amount',
                    'discount_amount', 'total_refunded',
                ],
                optionalMetrics: [],
            },
            {
                slug: 'line_item',
                name: 'Line Item Level',
                defaultDimensions: [
                    'item_id', 'name', 'sku', 'product_id', 'product_type',
                ],
                optionalDimensions: [],
                defaultMetrics: [
                    'qty_ordered', 'price', 'original_price',
                    'row_total', 'row_total_incl_tax',
                    'tax_amount', 'discount_amount', 'amount_refunded',
                ],
                optionalMetrics: [],
            },
        ];
    }

    getAttributionWindowDays(): number {
        return 14; // Orders can have status changes and refunds weeks later
    }

    getMaxLookbackDays(): number {
        return 365; // Full year of order history
    }

    // ─── Data Fetching ───────────────────────────────────────────

    async fetchData(credentials: string, config: FetchConfig): Promise<FetchResponse> {
        const creds = this.parseCredentials<MagentoCredentials>(credentials);

        const dateFrom = this.formatDate(config.dateFrom);
        const dateTo = this.formatDate(config.dateTo);

        // Fetch orders with date filter and pagination
        const allOrders: MagentoOrder[] = [];
        let currentPage = 1;
        const pageSize = 100;
        let hasMore = true;

        while (hasMore) {
            await this.rateLimit();

            const params = new URLSearchParams({
                'searchCriteria[filter_groups][0][filters][0][field]': 'created_at',
                'searchCriteria[filter_groups][0][filters][0][value]': `${dateFrom} 00:00:00`,
                'searchCriteria[filter_groups][0][filters][0][condition_type]': 'gteq',
                'searchCriteria[filter_groups][1][filters][0][field]': 'created_at',
                'searchCriteria[filter_groups][1][filters][0][value]': `${dateTo} 23:59:59`,
                'searchCriteria[filter_groups][1][filters][0][condition_type]': 'lteq',
                'searchCriteria[pageSize]': String(pageSize),
                'searchCriteria[currentPage]': String(currentPage),
                'searchCriteria[sortOrders][0][field]': 'created_at',
                'searchCriteria[sortOrders][0][direction]': 'ASC',
            });

            const res = await this.retryWithBackoff(async () => {
                const response = await fetch(
                    `${creds.domain}/rest/V1/orders?${params.toString()}`,
                    { headers: { Authorization: `Bearer ${creds.apiKey}` } }
                );
                if (!response.ok) {
                    throw new Error(`Magento API error: ${response.status} ${response.statusText}`);
                }
                return response.json();
            });

            const data = res as { items: MagentoOrder[]; total_count: number };
            allOrders.push(...(data.items || []));

            hasMore = allOrders.length < data.total_count;
            currentPage++;
        }

        // Transform orders into rows (order-level + line-item-level)
        const rows: FetchResponse['rows'] = [];

        for (const order of allOrders) {
            // Order-level row
            const shippingAddr = order.extension_attributes?.shipping_assignments?.[0]?.shipping?.address;

            rows.push({
                dimensions: this.extractOrderDimensions(order, shippingAddr),
                metrics: this.extractOrderMetrics(order),
            });

            // Line item rows (skip child items from configurable products)
            for (const item of order.items) {
                if (item.parent_item_id) continue; // Skip child items

                rows.push({
                    dimensions: {
                        ...this.extractOrderDimensions(order, shippingAddr),
                        _record_type: 'line_item',
                        item_id: String(item.item_id),
                        item_name: item.name,
                        item_sku: item.sku,
                        item_product_id: String(item.product_id),
                        item_product_type: item.product_type,
                    },
                    metrics: this.extractLineItemMetrics(item),
                });
            }
        }

        return { rows, totalRows: rows.length };
    }

    // ─── Extraction Helpers ──────────────────────────────────────

    private extractOrderDimensions(
        order: MagentoOrder,
        shippingAddr?: { country_id: string; city?: string }
    ): Record<string, string | number | boolean> {
        return {
            _record_type: 'order',
            entity_id: String(order.entity_id),
            increment_id: order.increment_id,
            created_at: order.created_at,
            updated_at: order.updated_at,
            status: order.status,
            state: order.state,
            payment_method: order.payment?.method || '',
            order_currency_code: order.order_currency_code,
            store_id: String(order.store_id),
            store_name: order.store_name || '',
            billing_country: order.billing_address?.country_id || '',
            billing_city: order.billing_address?.city || '',
            shipping_country: shippingAddr?.country_id || '',
            shipping_city: shippingAddr?.city || '',
            customer_id: order.customer_id ? String(order.customer_id) : '',
            customer_group_id: order.customer_group_id ? String(order.customer_group_id) : '',
            customer_email: order.customer_email || '',
            customer_firstname: order.customer_firstname || '',
            customer_lastname: order.customer_lastname || '',
            discount_description: order.discount_description || '',
            applied_rule_ids: order.applied_rule_ids || '',
        };
    }

    private extractOrderMetrics(order: MagentoOrder): Record<string, number> {
        return {
            grand_total: Number(order.grand_total) || 0,
            subtotal: Number(order.subtotal) || 0,
            tax_amount: Number(order.tax_amount) || 0,
            shipping_amount: Number(order.shipping_amount) || 0,
            shipping_tax_amount: Number(order.shipping_tax_amount) || 0,
            discount_amount: Math.abs(Number(order.discount_amount) || 0),
            total_refunded: Number(order.total_refunded) || 0,
            order_count: 1,
        };
    }

    private extractLineItemMetrics(item: MagentoOrderItem): Record<string, number> {
        return {
            qty_ordered: Number(item.qty_ordered) || 0,
            item_price: Number(item.price) || 0,
            item_original_price: Number(item.original_price) || 0,
            row_total: Number(item.row_total) || 0,
            row_total_incl_tax: Number(item.row_total_incl_tax) || 0,
            item_tax_amount: Number(item.tax_amount) || 0,
            item_discount_amount: Math.abs(Number(item.discount_amount) || 0),
            item_amount_refunded: Number(item.amount_refunded) || 0,
            items_sold: Number(item.qty_ordered) || 0,
        };
    }

    // ─── Field Mappings ──────────────────────────────────────────

    getDimensionMappings(): DimensionMapping[] {
        return [
            // Order dimensions
            { platformField: 'entity_id', canonicalField: 'order_id' },
            { platformField: 'increment_id', canonicalField: 'order_number' },
            { platformField: 'created_at', canonicalField: 'order_date' },
            { platformField: 'updated_at', canonicalField: 'order_updated_at' },
            { platformField: 'status', canonicalField: 'order_status' },
            { platformField: 'state', canonicalField: 'order_state' },
            { platformField: 'payment_method', canonicalField: 'payment_method' },
            { platformField: 'order_currency_code', canonicalField: 'currency' },
            { platformField: 'store_id', canonicalField: 'store_id' },
            { platformField: 'store_name', canonicalField: 'store_name' },
            { platformField: 'billing_country', canonicalField: 'billing_country' },
            { platformField: 'billing_city', canonicalField: 'billing_city' },
            { platformField: 'shipping_country', canonicalField: 'shipping_country' },
            { platformField: 'shipping_city', canonicalField: 'shipping_city' },
            { platformField: 'customer_id', canonicalField: 'customer_id' },
            { platformField: 'customer_group_id', canonicalField: 'customer_group' },
            { platformField: 'customer_email', canonicalField: 'customer_email' },
            { platformField: 'customer_firstname', canonicalField: 'customer_first_name' },
            { platformField: 'customer_lastname', canonicalField: 'customer_last_name' },
            { platformField: 'discount_description', canonicalField: 'discount_code' },
            { platformField: '_record_type', canonicalField: 'record_type' },

            // Line item dimensions
            { platformField: 'item_id', canonicalField: 'line_item_id' },
            { platformField: 'item_name', canonicalField: 'line_item_name' },
            { platformField: 'item_product_id', canonicalField: 'product_id' },
            { platformField: 'item_sku', canonicalField: 'product_sku' },
            { platformField: 'item_product_type', canonicalField: 'product_type' },
        ];
    }

    getMetricMappings(): MetricMapping[] {
        return [
            // Order metrics
            { platformField: 'grand_total', canonicalField: 'order_grand_total' },
            { platformField: 'subtotal', canonicalField: 'order_subtotal' },
            { platformField: 'tax_amount', canonicalField: 'order_tax_amount' },
            { platformField: 'shipping_amount', canonicalField: 'order_shipping_amount' },
            { platformField: 'shipping_tax_amount', canonicalField: 'order_shipping_tax' },
            { platformField: 'discount_amount', canonicalField: 'order_discount_amount' },
            { platformField: 'total_refunded', canonicalField: 'order_refund_amount' },
            { platformField: 'order_count', canonicalField: 'order_count' },

            // Line item metrics
            { platformField: 'qty_ordered', canonicalField: 'line_item_quantity' },
            { platformField: 'item_price', canonicalField: 'line_item_price' },
            { platformField: 'item_original_price', canonicalField: 'line_item_original_price' },
            { platformField: 'row_total', canonicalField: 'line_item_total' },
            { platformField: 'row_total_incl_tax', canonicalField: 'line_item_total_incl_tax' },
            { platformField: 'item_tax_amount', canonicalField: 'line_item_tax_amount' },
            { platformField: 'item_discount_amount', canonicalField: 'line_item_discount_amount' },
            { platformField: 'item_amount_refunded', canonicalField: 'line_item_refund_amount' },
            { platformField: 'items_sold', canonicalField: 'items_sold' },
        ];
    }
}
