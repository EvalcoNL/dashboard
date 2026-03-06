// ═══════════════════════════════════════════════════════════════════
// Shopware 6 Connector — E-commerce Order Data
// Fetches orders via Shopware 6 Admin API (POST /api/search/order)
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

interface ShopwareCredentials {
    domain: string;         // e.g. https://shop.example.com
    projectId: string;       // Integration client ID
    clientSecret: string;   // Integration client secret
}

interface ShopwareTokenCache {
    token: string;
    expiresAt: number;
}

// Shopware API response types
interface ShopwareOrder {
    id: string;
    orderNumber: string;
    orderDateTime: string;
    updatedAt: string | null;
    currencyFactor: number;
    salesChannelId: string;
    price: {
        totalPrice: number;
        netPrice: number;
        positionPrice: number;
        calculatedTaxes: Array<{ tax: number; taxRate: number }>;
    };
    shippingCosts: {
        totalPrice: number;
        calculatedTaxes: Array<{ tax: number }>;
    };
    amountTotal: number;
    amountNet: number;
    stateMachineState?: {
        technicalName: string;
        name: string;
    };
    orderCustomer?: {
        email: string;
        firstName: string;
        lastName: string;
        customerId: string | null;
        customerNumber: string | null;
        customer?: {
            groupId: string | null;
        };
    };
    currency?: {
        isoCode: string;
    };
    salesChannel?: {
        name: string;
    };
    lineItems: ShopwareLineItem[];
    deliveries?: Array<{
        shippingOrderAddress?: {
            country?: { iso: string };
            city?: string;
        };
        stateMachineState?: {
            technicalName: string;
        };
    }>;
    billingAddress?: {
        country?: { iso: string };
        city?: string;
    };
    tags?: Array<{ name: string }>;
    transactions?: Array<{
        paymentMethod?: { name: string };
        stateMachineState?: { technicalName: string };
    }>;
}

interface ShopwareLineItem {
    id: string;
    type: string; // 'product', 'promotion', 'credit', 'custom'
    label: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    productId: string | null;
    payload?: {
        productNumber?: string;
    };
    price?: {
        calculatedTaxes?: Array<{ tax: number }>;
    };
}

export class ShopwareConnector extends BaseConnector {
    readonly slug = 'shopware';
    readonly name = 'Shopware 6';
    readonly category: ConnectorCategory = 'ECOMMERCE';
    readonly authType: AuthType = 'api_key';

    protected rateLimitPerMinute = 100;

    private tokenCache: ShopwareTokenCache | null = null;

    // ─── Auth ────────────────────────────────────────────────────

    /**
     * Get bearer token via client_credentials grant
     */
    private async getBearerToken(creds: ShopwareCredentials): Promise<string> {
        // Return cached token if valid
        if (this.tokenCache && Date.now() < this.tokenCache.expiresAt - 60_000) {
            return this.tokenCache.token;
        }

        const res = await fetch(`${creds.domain}/api/oauth/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                grant_type: 'client_credentials',
                client_id: creds.projectId,
                client_secret: creds.clientSecret,
            }),
        });

        if (!res.ok) {
            throw new Error(`Shopware auth failed: ${res.status} ${res.statusText}`);
        }

        const data = await res.json() as { access_token: string; expires_in: number };

        this.tokenCache = {
            token: data.access_token,
            expiresAt: Date.now() + data.expires_in * 1000,
        };

        return data.access_token;
    }

    async authenticate(params: Record<string, string>): Promise<AuthResult> {
        const { domain, projectId, clientSecret } = params;
        if (!domain || !projectId || !clientSecret) {
            return { success: false, error: 'Domain, Client ID and Client Secret are required' };
        }

        try {
            const cleanDomain = domain.replace(/\/+$/, '');
            const creds: ShopwareCredentials = { domain: cleanDomain, projectId, clientSecret };
            await this.getBearerToken(creds);

            return {
                success: true,
                credentials: JSON.stringify(creds),
            };
        } catch (error) {
            return { success: false, error: `Connection failed: ${(error as Error).message}` };
        }
    }

    async testConnection(credentials: string): Promise<boolean> {
        try {
            const creds = this.parseCredentials<ShopwareCredentials>(credentials);
            await this.getBearerToken(creds);
            return true;
        } catch {
            return false;
        }
    }

    async getAvailableAccounts(credentials: string): Promise<DiscoveredAccount[]> {
        const creds = this.parseCredentials<ShopwareCredentials>(credentials);

        try {
            const token = await this.getBearerToken(creds);

            // Fetch sales channels
            const res = await fetch(`${creds.domain}/api/search/sales-channel`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    limit: 50,
                    includes: { sales_channel: ['id', 'name'] },
                }),
            });

            if (!res.ok) {
                return [{ externalId: 'default', name: new URL(creds.domain).hostname, currency: 'EUR' }];
            }

            const data = await res.json() as { data: Array<{ id: string; name: string }> };

            return data.data.map(sc => ({
                externalId: sc.id,
                name: sc.name || `Channel ${sc.id.slice(0, 8)}`,
                currency: 'EUR',
            }));
        } catch {
            return [{ externalId: 'default', name: new URL(creds.domain).hostname, currency: 'EUR' }];
        }
    }

    // ─── Levels ──────────────────────────────────────────────────

    getSupportedLevels(): DataLevel[] {
        return [
            {
                slug: 'order',
                name: 'Order Level',
                defaultDimensions: [
                    'id', 'orderNumber', 'orderDateTime', 'updatedAt',
                    'stateName', 'stateLabel', 'paymentMethod', 'currencyCode',
                    'salesChannelId', 'salesChannelName',
                    'billingCountry', 'shippingCountry',
                    'customerId', 'discountCode',
                ],
                optionalDimensions: [
                    'customerEmail', 'customerFirstName', 'customerLastName',
                    'billingCity', 'shippingCity', 'tags',
                ],
                defaultMetrics: [
                    'totalPrice', 'netPrice', 'taxAmount',
                    'shippingTotal', 'shippingTax', 'discountAmount',
                ],
                optionalMetrics: [],
            },
            {
                slug: 'line_item',
                name: 'Line Item Level',
                defaultDimensions: [
                    'lineItemId', 'label', 'productId', 'productNumber', 'type',
                ],
                optionalDimensions: [],
                defaultMetrics: [
                    'quantity', 'unitPrice', 'lineItemTotal',
                    'lineItemTax',
                ],
                optionalMetrics: [],
            },
        ];
    }

    getAttributionWindowDays(): number {
        return 14;
    }

    getMaxLookbackDays(): number {
        return 365;
    }

    // ─── Data Fetching ───────────────────────────────────────────

    async fetchData(credentials: string, config: FetchConfig): Promise<FetchResponse> {
        const creds = this.parseCredentials<ShopwareCredentials>(credentials);
        const token = await this.getBearerToken(creds);

        const dateFrom = this.formatDate(config.dateFrom);
        const dateTo = this.formatDate(config.dateTo);

        const allOrders: ShopwareOrder[] = [];
        let page = 1;
        const limit = 100;
        let hasMore = true;

        while (hasMore) {
            await this.rateLimit();

            const body = {
                page,
                limit,
                filter: [
                    {
                        type: 'range',
                        field: 'orderDateTime',
                        parameters: {
                            gte: `${dateFrom}T00:00:00.000Z`,
                            lte: `${dateTo}T23:59:59.999Z`,
                        },
                    },
                ],
                sort: [{ field: 'orderDateTime', order: 'ASC' }],
                associations: {
                    lineItems: {},
                    stateMachineState: {},
                    orderCustomer: {
                        associations: { customer: {} },
                    },
                    currency: {},
                    salesChannel: {},
                    deliveries: {
                        associations: {
                            shippingOrderAddress: {
                                associations: { country: {} },
                            },
                            stateMachineState: {},
                        },
                    },
                    billingAddress: {
                        associations: { country: {} },
                    },
                    tags: {},
                    transactions: {
                        associations: {
                            paymentMethod: {},
                            stateMachineState: {},
                        },
                    },
                },
            };

            const res = await this.retryWithBackoff(async () => {
                const response = await fetch(`${creds.domain}/api/search/order`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                    body: JSON.stringify(body),
                });

                if (!response.ok) {
                    throw new Error(`Shopware API error: ${response.status} ${response.statusText}`);
                }
                return response.json();
            });

            const data = res as { data: ShopwareOrder[]; total: number };
            allOrders.push(...(data.data || []));

            hasMore = allOrders.length < data.total;
            page++;
        }

        // Transform orders into rows
        const rows: FetchResponse['rows'] = [];

        for (const order of allOrders) {
            // Order-level row
            rows.push({
                dimensions: this.extractOrderDimensions(order),
                metrics: this.extractOrderMetrics(order),
            });

            // Line item rows (only product type, skip promotions/credits)
            for (const item of order.lineItems) {
                if (item.type !== 'product') continue;

                rows.push({
                    dimensions: {
                        ...this.extractOrderDimensions(order),
                        _record_type: 'line_item',
                        lineItemId: item.id,
                        label: item.label,
                        productId: item.productId || '',
                        productNumber: item.payload?.productNumber || '',
                        itemType: item.type,
                    },
                    metrics: this.extractLineItemMetrics(item),
                });
            }
        }

        return { rows, totalRows: rows.length };
    }

    // ─── Extraction ──────────────────────────────────────────────

    private extractOrderDimensions(order: ShopwareOrder): Record<string, string | number | boolean> {
        const delivery = order.deliveries?.[0];
        const transaction = order.transactions?.[0];

        // Calculate discount from promotion line items
        let discountCode = '';
        for (const item of order.lineItems) {
            if (item.type === 'promotion') {
                discountCode = item.label;
                break;
            }
        }

        return {
            _record_type: 'order',
            id: order.id,
            orderNumber: order.orderNumber,
            orderDateTime: order.orderDateTime,
            updatedAt: order.updatedAt || '',
            stateName: order.stateMachineState?.technicalName || '',
            stateLabel: order.stateMachineState?.name || '',
            paymentMethod: transaction?.paymentMethod?.name || '',
            currencyCode: order.currency?.isoCode || 'EUR',
            salesChannelId: order.salesChannelId,
            salesChannelName: order.salesChannel?.name || '',
            billingCountry: order.billingAddress?.country?.iso || '',
            billingCity: order.billingAddress?.city || '',
            shippingCountry: delivery?.shippingOrderAddress?.country?.iso || '',
            shippingCity: delivery?.shippingOrderAddress?.city || '',
            customerId: order.orderCustomer?.customerId || '',
            customerGroupId: order.orderCustomer?.customer?.groupId || '',
            customerEmail: order.orderCustomer?.email || '',
            customerFirstName: order.orderCustomer?.firstName || '',
            customerLastName: order.orderCustomer?.lastName || '',
            discountCode,
            tags: (order.tags || []).map(t => t.name).join(', '),
        };
    }

    private extractOrderMetrics(order: ShopwareOrder): Record<string, number> {
        const totalTax = (order.price?.calculatedTaxes || []).reduce((sum, t) => sum + t.tax, 0);
        const shippingTax = (order.shippingCosts?.calculatedTaxes || []).reduce((sum, t) => sum + t.tax, 0);

        // Discount = sum of promotion line item totals (negative)
        let discountAmount = 0;
        for (const item of order.lineItems) {
            if (item.type === 'promotion') {
                discountAmount += Math.abs(item.totalPrice);
            }
        }

        return {
            totalPrice: Number(order.price?.totalPrice) || 0,
            netPrice: Number(order.price?.netPrice) || 0,
            taxAmount: totalTax,
            shippingTotal: Number(order.shippingCosts?.totalPrice) || 0,
            shippingTax,
            discountAmount,
            order_count: 1,
        };
    }

    private extractLineItemMetrics(item: ShopwareLineItem): Record<string, number> {
        const itemTax = (item.price?.calculatedTaxes || []).reduce((sum, t) => sum + t.tax, 0);

        return {
            quantity: Number(item.quantity) || 0,
            unitPrice: Number(item.unitPrice) || 0,
            lineItemTotal: Number(item.totalPrice) || 0,
            lineItemTax: itemTax,
            items_sold: Number(item.quantity) || 0,
        };
    }

    // ─── Field Mappings ──────────────────────────────────────────

    getDimensionMappings(): DimensionMapping[] {
        return [
            // Order dimensions
            { platformField: 'id', canonicalField: 'order_id' },
            { platformField: 'orderNumber', canonicalField: 'order_number' },
            { platformField: 'orderDateTime', canonicalField: 'order_date' },
            { platformField: 'updatedAt', canonicalField: 'order_updated_at' },
            { platformField: 'stateName', canonicalField: 'order_status' },
            { platformField: 'stateLabel', canonicalField: 'order_state' },
            { platformField: 'paymentMethod', canonicalField: 'payment_method' },
            { platformField: 'currencyCode', canonicalField: 'currency' },
            { platformField: 'salesChannelId', canonicalField: 'store_id' },
            { platformField: 'salesChannelName', canonicalField: 'store_name' },
            { platformField: 'salesChannelName', canonicalField: 'sales_channel' },
            { platformField: 'billingCountry', canonicalField: 'billing_country' },
            { platformField: 'billingCity', canonicalField: 'billing_city' },
            { platformField: 'shippingCountry', canonicalField: 'shipping_country' },
            { platformField: 'shippingCity', canonicalField: 'shipping_city' },
            { platformField: 'customerId', canonicalField: 'customer_id' },
            { platformField: 'customerGroupId', canonicalField: 'customer_group' },
            { platformField: 'customerEmail', canonicalField: 'customer_email' },
            { platformField: 'customerFirstName', canonicalField: 'customer_first_name' },
            { platformField: 'customerLastName', canonicalField: 'customer_last_name' },
            { platformField: 'discountCode', canonicalField: 'discount_code' },
            { platformField: 'tags', canonicalField: 'tags' },
            { platformField: '_record_type', canonicalField: 'record_type' },

            // Line item dimensions
            { platformField: 'lineItemId', canonicalField: 'line_item_id' },
            { platformField: 'label', canonicalField: 'line_item_name' },
            { platformField: 'productId', canonicalField: 'product_id' },
            { platformField: 'productNumber', canonicalField: 'product_sku' },
            { platformField: 'itemType', canonicalField: 'product_type' },
        ];
    }

    getMetricMappings(): MetricMapping[] {
        return [
            // Order metrics
            { platformField: 'totalPrice', canonicalField: 'order_grand_total' },
            { platformField: 'netPrice', canonicalField: 'order_subtotal' },
            { platformField: 'taxAmount', canonicalField: 'order_tax_amount' },
            { platformField: 'shippingTotal', canonicalField: 'order_shipping_amount' },
            { platformField: 'shippingTax', canonicalField: 'order_shipping_tax' },
            { platformField: 'discountAmount', canonicalField: 'order_discount_amount' },
            { platformField: 'order_count', canonicalField: 'order_count' },

            // Line item metrics
            { platformField: 'quantity', canonicalField: 'line_item_quantity' },
            { platformField: 'unitPrice', canonicalField: 'line_item_price' },
            { platformField: 'lineItemTotal', canonicalField: 'line_item_total' },
            { platformField: 'lineItemTax', canonicalField: 'line_item_tax_amount' },
            { platformField: 'items_sold', canonicalField: 'items_sold' },
        ];
    }
}
