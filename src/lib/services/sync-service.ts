import { googleAdsService } from "@/lib/integrations/google-ads";
import { prisma } from "@/lib/db";
import { insert } from "@/lib/clickhouse";
import { format, subDays } from "date-fns";
import { createHash } from "crypto";

function canonicalHash(dataSourceId: string, date: Date, dimensions: Record<string, string>, level: string): string {
    const key = `${dataSourceId}|${date.toISOString()}|${level}|${JSON.stringify(dimensions)}`;
    return createHash("sha256").update(key).digest("hex").slice(0, 40);
}

export class SyncService {
    /**
     * Synchronizes campaign metrics for a specific client.
     * Writes campaign metrics to ClickHouse metrics_data table.
     */
    async syncProjectData(projectId: string, daysBack: number = 90) {
        const client = await prisma.project.findUnique({
            where: { id: projectId },
            include: { dataSources: { where: { active: true, type: "GOOGLE_ADS" } } },
        });

        if (!client) throw new Error("Client not found");
        if (client.dataSources.length === 0) {
            throw new Error("No active Google Ads data sources linked for this client");
        }

        const endDate = format(new Date(), "yyyy-MM-dd");
        const startDate = format(subDays(new Date(), daysBack), "yyyy-MM-dd");

        let totalRecordsSynced = 0;

        try {
            for (const source of client.dataSources) {
                const config = source.config as { loginCustomerId?: string } | null;
                const metrics = await googleAdsService.getCampaignMetrics(
                    source.externalId,
                    source.token,
                    startDate,
                    endDate,
                    config?.loginCustomerId
                );

                // Build ClickHouse rows from campaign metrics
                const clickhouseRows = metrics.map((m) => {
                    const dimensions = {
                        campaign_id: m.campaignId.toString(),
                        campaign_name: m.campaignName,
                        campaign_type: m.campaignType,
                        status: m.status,
                        serving_status: m.servingStatus,
                    };
                    const hash = canonicalHash(source.id, m.date, dimensions, "campaign");

                    return {
                        canonical_hash: hash,
                        data_source_id: source.id,
                        client_id: projectId,
                        connector_slug: 'google-ads',
                        date: format(m.date, "yyyy-MM-dd"),
                        level: 'campaign',
                        campaign_id: m.campaignId.toString(),
                        campaign_name: m.campaignName,
                        campaign_type: m.campaignType,
                        campaign_status: m.status,
                        cost: m.spend,
                        conversions: m.conversions,
                        conversion_value: m.conversionValue,
                        clicks: m.clicks,
                        impressions: m.impressions,
                    };
                });

                // Batch insert into ClickHouse
                if (clickhouseRows.length > 0) {
                    await insert('metrics_data', clickhouseRows);
                }
                totalRecordsSynced += metrics.length;

                // Sync account users (linked accounts / access management)
                try {
                    const users = await googleAdsService.getAccountUsers(
                        source.externalId,
                        source.token,
                        config?.loginCustomerId
                    );
                    if (users.length > 0) {
                        const userUpserts = users.map((u) =>
                            prisma.linkedAccount.upsert({
                                where: {
                                    dataSourceId_email: {
                                        dataSourceId: source.id,
                                        email: u.email,
                                    },
                                },
                                update: {
                                    name: u.name,
                                    role: u.role,
                                    status: "ACTIVE",
                                },
                                create: {
                                    dataSourceId: source.id,
                                    email: u.email,
                                    name: u.name,
                                    role: u.role,
                                    status: "ACTIVE",
                                },
                            })
                        );
                        await prisma.$transaction(userUpserts);
                    }
                } catch (userErr) {
                    console.error(`Failed to sync account users for source ${source.id}:`, userErr);
                }

                // Update last synced
                await prisma.dataSource.update({
                    where: { id: source.id },
                    data: { lastSyncedAt: new Date() }
                });
            }
        } catch (error: any) {
            const message = error instanceof Error ? error.message : String(error);
            console.error(`Sync error for client ${projectId}:`, message);
            throw error;
        }

        return { success: true, recordsSynced: totalRecordsSynced };
    }
}

export const syncService = new SyncService();
