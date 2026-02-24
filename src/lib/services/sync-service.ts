import { googleAdsService } from "@/lib/integrations/google-ads";
import { prisma } from "@/lib/db";
import { format, subDays } from "date-fns";

export class SyncService {
    /**
     * Synchronizes campaign metrics for a specific client.
     */
    async syncClientData(clientId: string, daysBack: number = 90) {
        const client = await prisma.client.findUnique({
            where: { id: clientId },
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

                // Batch upsert all metrics in a single transaction
                const upsertOps = metrics.map((m) =>
                    prisma.campaignMetric.upsert({
                        where: {
                            campaignId_date: {
                                campaignId: m.campaignId.toString(),
                                date: m.date,
                            },
                        },
                        update: {
                            campaignName: m.campaignName,
                            campaignType: m.campaignType,
                            spend: m.spend,
                            conversions: m.conversions,
                            conversionValue: m.conversionValue,
                            clicks: m.clicks,
                            impressions: m.impressions,
                            status: m.status,
                            servingStatus: m.servingStatus,
                            dataSourceId: source.id,
                        },
                        create: {
                            clientId: clientId,
                            dataSourceId: source.id,
                            campaignId: m.campaignId.toString(),
                            campaignName: m.campaignName,
                            campaignType: m.campaignType,
                            date: m.date,
                            spend: m.spend,
                            conversions: m.conversions,
                            conversionValue: m.conversionValue,
                            clicks: m.clicks,
                            impressions: m.impressions,
                            status: m.status,
                            servingStatus: m.servingStatus,
                        },
                    })
                );
                await prisma.$transaction(upsertOps);
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
                    // Don't fail the entire sync if user access fetch fails
                }

                // Update last synced
                await prisma.dataSource.update({
                    where: { id: source.id },
                    data: { lastSyncedAt: new Date() }
                });
            }
        } catch (error: any) {
            const message = error instanceof Error ? error.message : String(error);
            console.error(`Sync error for client ${clientId}:`, message);
            throw error;
        }

        return { success: true, recordsSynced: totalRecordsSynced };
    }
}

export const syncService = new SyncService();
