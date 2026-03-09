export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { syncScheduler } from "@/lib/data-integration/sync-scheduler";
import { syncMerchantHealth } from "@/lib/services/merchant-center-sync";

// Map DataSource type to connector definition
const CONNECTOR_DEFS: Record<string, { slug: string; name: string; category: string }> = {
    GOOGLE_ADS: { slug: "google-ads", name: "Google Ads", category: "PAID_SEARCH" },
    GOOGLE_ANALYTICS: { slug: "ga4", name: "Google Analytics 4", category: "WEB_ANALYTICS" },
    META: { slug: "meta-ads", name: "Meta Ads", category: "PAID_SOCIAL" },
    LINKEDIN: { slug: "linkedin-ads", name: "LinkedIn Ads", category: "PAID_SOCIAL" },
    MICROSOFT_ADS: { slug: "microsoft-ads", name: "Microsoft Ads", category: "PAID_SEARCH" },
    TIKTOK: { slug: "tiktok-ads", name: "TikTok Ads", category: "PAID_SOCIAL" },
    GOOGLE_MERCHANT: { slug: "google-merchant", name: "Google Merchant Center", category: "SHOPPING" },
    MAGENTO: { slug: "magento", name: "Magento 2", category: "ECOMMERCE" },
    SHOPWARE: { slug: "shopware", name: "Shopware 6", category: "ECOMMERCE" },
};

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string; sourceId: string }> }
) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: projectId, sourceId } = await params;

    try {
        const body = await req.json();
        const { externalId, name } = body;

        if (!externalId || !name) {
            return NextResponse.json({ error: "Missing externalId or name" }, { status: 400 });
        }

        const source = await prisma.dataSource.findUnique({
            where: { id: sourceId, projectId }
        });

        if (!source || !source.token) {
            return NextResponse.json({ error: "Invalid data source" }, { status: 400 });
        }

        // Auto-link the correct ConnectorDefinition based on the data source type
        let connectorId: string | null = null;
        const connectorDef = CONNECTOR_DEFS[source.type];
        if (connectorDef) {
            const connector = await prisma.connectorDefinition.upsert({
                where: { slug: connectorDef.slug },
                update: {},
                create: { slug: connectorDef.slug, name: connectorDef.name, category: connectorDef.category, authType: "oauth2", isActive: true },
            });
            connectorId = connector.id;
        }

        await prisma.dataSource.update({
            where: { id: source.id },
            data: {
                externalId: externalId,
                name: name,
                category: "APP",
                active: true,
                linkedAt: new Date(),
                ...(connectorId ? { connectorId } : {}),
            }
        });

        // Create a DataSourceAccount (sync account) for the selected account
        // The sync engine requires at least one active sync account to fetch data
        if (connectorId) {
            await prisma.dataSourceAccount.upsert({
                where: {
                    dataSourceId_externalId: {
                        dataSourceId: source.id,
                        externalId: externalId,
                    }
                },
                create: {
                    dataSourceId: source.id,
                    externalId: externalId,
                    name: name,
                    isActive: true,
                },
                update: {
                    name: name,
                    isActive: true,
                },
            });
        }

        // Auto-trigger first FULL sync in background (loads all data on first connect)
        if (source.type === "GOOGLE_MERCHANT") {
            // Merchant Center uses its own sync service (not the generic sync engine)
            const updatedSource = await prisma.dataSource.findUnique({ where: { id: source.id } });
            if (updatedSource) {
                syncMerchantHealth(updatedSource).catch(err =>
                    console.error(`[AutoSync] Failed MC sync for ${source.id}:`, err)
                );
            }
        } else {
            syncScheduler.scheduleNow(source.id, 'FULL').catch(err =>
                console.error(`[AutoSync] Failed to schedule sync for activated source ${source.id}:`, err)
            );
        }

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error("Error activating data source:", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : "Onbekende fout" }, { status: 500 });
    }
}

