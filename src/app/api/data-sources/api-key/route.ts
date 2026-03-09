export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { encrypt } from "@/lib/encryption";

// Map platformType → connector slug
const CONNECTOR_SLUG_MAP: Record<string, string> = {
    MAGENTO: "magento",
    SHOPWARE: "shopware",
    SHOPIFY: "shopify",
    WORDPRESS: "woocommerce",
    LIGHTSPEED: "lightspeed",
};

/**
 * POST /api/data-sources/api-key
 * Creates a DataSource from an API key or login credentials.
 * Body: { projectId, platformType, name, config: { apiKey?, domain?, projectId?, clientSecret?, ... } }
 */
export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const body = await req.json();
        const { projectId, platformType, name, config } = body;

        if (!projectId || !platformType || !config) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Store credentials as encrypted JSON
        const credentialsJson = JSON.stringify(config);
        const encryptedToken = encrypt(credentialsJson);
        const externalId = config.storeUrl || config.domain || config.username || platformType;

        // Map connector slug to definition metadata
        const connectorSlug = CONNECTOR_SLUG_MAP[platformType];
        let connectorId: string | null = null;

        const CONNECTOR_NAMES: Record<string, { name: string; category: string }> = {
            magento: { name: "Magento 2", category: "ECOMMERCE" },
            shopware: { name: "Shopware 6", category: "ECOMMERCE" },
            shopify: { name: "Shopify", category: "ECOMMERCE" },
            woocommerce: { name: "WooCommerce", category: "ECOMMERCE" },
            lightspeed: { name: "Lightspeed", category: "ECOMMERCE" },
        };

        if (connectorSlug) {
            const meta = CONNECTOR_NAMES[connectorSlug] || { name: connectorSlug, category: "CUSTOM" };
            const connDef = await prisma.connectorDefinition.upsert({
                where: { slug: connectorSlug },
                update: {},
                create: { slug: connectorSlug, name: meta.name, category: meta.category, authType: "api_key", isActive: true },
            });
            connectorId = connDef.id;
        }

        // Create the data source with proper connector linkage
        const dataSource = await prisma.dataSource.create({
            data: {
                projectId,
                type: platformType,
                category: "APP",
                name: name || platformType,
                externalId,
                token: encryptedToken,
                config: config,
                active: true,
                connectorId,
            },
        });

        return NextResponse.json({
            success: true,
            dataSource: { id: dataSource.id, name: dataSource.name },
        });
    } catch (error: unknown) {
        console.error("[api-key] Error creating data source:", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : "Onbekende fout" }, { status: 500 });
    }
}
