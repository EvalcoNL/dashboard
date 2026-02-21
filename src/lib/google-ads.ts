import { GoogleAdsApi } from "google-ads-api";
import { prisma } from "./db";

export class GoogleAdsService {

    private async getConfig() {
        const settings = await prisma.globalSetting.findMany();
        const settingsMap = settings.reduce((acc: Record<string, string>, s) => {
            acc[s.key] = s.value;
            return acc;
        }, {} as Record<string, string>);

        return {
            client_id: settingsMap.GOOGLE_ADS_CLIENT_ID || process.env.GOOGLE_ADS_CLIENT_ID || "",
            client_secret: settingsMap.GOOGLE_ADS_CLIENT_SECRET || process.env.GOOGLE_ADS_CLIENT_SECRET || "",
            developer_token: settingsMap.GOOGLE_ADS_DEVELOPER_TOKEN || process.env.GOOGLE_ADS_DEVELOPER_TOKEN || "",
        };
    }

    /**
     * Generates the OAuth authorization URL.
     */
    async getAuthUrl(redirectUri: string) {
        const config = await this.getConfig();
        const rootUrl = "https://accounts.google.com/o/oauth2/v2/auth";
        const options = {
            redirect_uri: redirectUri,
            client_id: config.client_id,
            access_type: "offline",
            response_type: "code",
            prompt: "consent",
            scope: "https://www.googleapis.com/auth/adwords",
        };

        const qs = new URLSearchParams(options);
        return `${rootUrl}?${qs.toString()}`;
    }

    /**
     * Exchanges auth code for refresh token.
     */
    async getRefreshToken(code: string, redirectUri: string) {
        const config = await this.getConfig();
        const response = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                code,
                client_id: config.client_id,
                client_secret: config.client_secret,
                redirect_uri: redirectUri,
                grant_type: "authorization_code",
            }),
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error_description || data.error);
        return data.refresh_token;
    }

    /**
     * Lists accessible customer accounts for a given refresh token.
     */
    async listAccessibleCustomers(refreshToken: string) {
        const config = await this.getConfig();
        const client = new GoogleAdsApi({
            client_id: config.client_id,
            client_secret: config.client_secret,
            developer_token: config.developer_token,
        });
        const customerList = await client.listAccessibleCustomers(refreshToken);
        const resourceNames = Array.isArray(customerList) ? customerList : customerList.resource_names || [];

        const results: Array<{ id: string; name: string; loginCustomerId?: string }> = [];
        const seenIds = new Set<string>();

        for (const resourceName of resourceNames) {
            const customerId = resourceName.replace("customers/", "");
            try {
                const customer = client.Customer({
                    customer_id: customerId,
                    refresh_token: refreshToken,
                });

                // Fetch basic info and check if it's a manager
                const [row] = await customer.query(`
                    SELECT customer.descriptive_name, customer.id, customer.manager 
                    FROM customer 
                    LIMIT 1
                `);

                if (row?.customer) {
                    const name = row.customer.descriptive_name || customerId;
                    const isManager = row.customer.manager;

                    if (!seenIds.has(customerId)) {
                        results.push({ id: customerId, name: isManager ? `${name} (MCC)` : name });
                        seenIds.add(customerId);
                    }

                    // If it's a manager, let's also try to find direct sub-accounts
                    if (isManager) {
                        try {
                            const subAccounts = await customer.query(`
                                SELECT 
                                    customer_client.descriptive_name, 
                                    customer_client.client_customer,
                                    customer_client.level
                                FROM customer_client
                                WHERE customer_client.level = 1
                            `);

                            for (const sub of subAccounts) {
                                if (sub.customer_client) {
                                    const subId = sub.customer_client.client_customer!.replace("customers/", "");
                                    if (!seenIds.has(subId)) {
                                        results.push({
                                            id: subId,
                                            name: `${sub.customer_client.descriptive_name || subId} (Sub)`,
                                            loginCustomerId: customerId // Store the MCC as loginCustomerId
                                        });
                                        seenIds.add(subId);
                                    }
                                }
                            }
                        } catch (subErr) {
                            console.error(`Failed to fetch sub-accounts for manager ${customerId}:`, subErr);
                        }
                    }
                }
            } catch (e) {
                console.error(`Failed to interact with customer ${customerId}:`, e);
                if (!seenIds.has(customerId)) {
                    results.push({ id: customerId, name: customerId });
                    seenIds.add(customerId);
                }
            }
        }
        return results;
    }

    /**
     * Fetches campaign metrics for a specific customer.
     */
    async getCampaignMetrics(
        customerId: string,
        refreshToken: string,
        startDate: string,
        endDate: string,
        loginCustomerId?: string
    ) {
        const config = await this.getConfig();
        const client = new GoogleAdsApi({
            client_id: config.client_id,
            client_secret: config.client_secret,
            developer_token: config.developer_token,
        });
        const customer = client.Customer({
            customer_id: customerId,
            refresh_token: refreshToken,
            login_customer_id: loginCustomerId,
        });

        const query = `
            SELECT
                campaign.id,
                campaign.name,
                campaign.advertising_channel_type,
                metrics.cost_micros,
                metrics.conversions,
                metrics.conversions_value,
                metrics.clicks,
                metrics.impressions,
                campaign.status,
                campaign.serving_status,
                segments.date
            FROM campaign
            WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
        `;

        const rows = await customer.query(query);
        return rows.map((row) => {
            if (!row.campaign || !row.metrics || !row.segments) {
                throw new Error("Missing expected fields in Google Ads query result");
            }
            return {
                campaignId: row.campaign.id!.toString(),
                campaignName: row.campaign.name!,
                campaignType: row.campaign.advertising_channel_type?.toString() || "UNKNOWN",
                date: new Date(row.segments.date!),
                spend: Number(row.metrics.cost_micros) / 1_000_000,
                conversions: Number(row.metrics.conversions),
                conversionValue: Number(row.metrics.conversions_value),
                clicks: Number(row.metrics.clicks),
                impressions: Number(row.metrics.impressions),
                status: row.campaign.status?.toString() || "UNKNOWN",
                servingStatus: row.campaign.serving_status?.toString() || "UNKNOWN",
            };
        });
    }
}

export const googleAdsService = new GoogleAdsService();
