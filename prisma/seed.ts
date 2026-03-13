/// <reference types="node" />
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { hash } from "bcryptjs";
import { createHash } from "crypto";

function createPrismaClient() {
    const adapter = new PrismaLibSql({
        url: process.env.DATABASE_URL || "file:./dev.db",
    });
    return new PrismaClient({ adapter });
}

const prisma = createPrismaClient();

function canonicalHash(dataSourceId: string, date: Date, dimensions: Record<string, string>, level: string): string {
    const key = `${dataSourceId}|${date.toISOString()}|${level}|${JSON.stringify(dimensions)}`;
    return createHash("sha256").update(key).digest("hex").slice(0, 40);
}

async function main() {
    console.log("🌱 Seeding database (SQLite)...");

    // ═══════════════════════════════════════════════════════════════
    // Users
    // ═══════════════════════════════════════════════════════════════

    const adminPassword = await hash("Admin123!", 12);
    const admin = await prisma.user.upsert({
        where: { email: "e.v.lieshout@evalco.nl" },
        update: {},
        create: {
            name: "Erwin van Lieshout",
            email: "e.v.lieshout@evalco.nl",
            passwordHash: adminPassword,
            role: "SUPER_ADMIN",
        },
    });

    const strategistPassword = await hash("Strategist123!", 12);
    const strategist = await prisma.user.upsert({
        where: { email: "strategist@evalco.nl" },
        update: {},
        create: {
            name: "Sarah Strategist",
            email: "strategist@evalco.nl",
            passwordHash: strategistPassword,
            role: "STRATEGIST",
        },
    });

    console.log("✅ Users created:", { admin: admin.email, strategist: strategist.email });

    // ═══════════════════════════════════════════════════════════════
    // Connector Definition (Google Ads)
    // ═══════════════════════════════════════════════════════════════

    const googleAdsConnector = await prisma.connectorDefinition.upsert({
        where: { slug: "google-ads" },
        update: {},
        create: {
            id: "connector-google-ads",
            slug: "google-ads",
            name: "Google Ads",
            category: "PAID_SEARCH",
            authType: "oauth2",
            description: "Google Ads advertising platform",
            isActive: true,
        },
    });

    console.log("✅ Connector definition created:", googleAdsConnector.slug);

    // ═══════════════════════════════════════════════════════════════
    // Connector Definition (Google Analytics 4)
    // ═══════════════════════════════════════════════════════════════

    const ga4Connector = await prisma.connectorDefinition.upsert({
        where: { slug: "ga4" },
        update: {},
        create: {
            id: "connector-ga4",
            slug: "ga4",
            name: "Google Analytics 4",
            category: "WEB_ANALYTICS",
            authType: "oauth2",
            description: "Google Analytics 4 website analytics — sessies, gebruikers, paginaweergaven, conversies",
            isActive: true,
        },
    });

    console.log("✅ Connector definition created:", ga4Connector.slug);

    // ═══════════════════════════════════════════════════════════════
    // Clients + DataSources
    // ═══════════════════════════════════════════════════════════════

    const client1 = await prisma.client.upsert({
        where: { id: "demo-client-leadgen" },
        update: {},
        create: {
            id: "demo-client-leadgen",
            name: "LeadGen Pro BV",
            industryType: "LEADGEN",
            targetType: "CPA",
            targetValue: 25.0,
            tolerancePct: 15,
            currency: "EUR",
        },
    });

    const client2 = await prisma.client.upsert({
        where: { id: "demo-client-ecommerce" },
        update: {},
        create: {
            id: "demo-client-ecommerce",
            name: "Fashion Store Online",
            industryType: "ECOMMERCE",
            targetType: "ROAS",
            targetValue: 5.0,
            tolerancePct: 15,
            currency: "EUR",
        },
    });

    const client3 = await prisma.client.upsert({
        where: { id: "demo-client-ecom2" },
        update: {},
        create: {
            id: "demo-client-ecom2",
            name: "TechGadgets.nl",
            industryType: "ECOMMERCE",
            targetType: "ROAS",
            targetValue: 4.0,
            tolerancePct: 20,
            profitMarginPct: 35.0,
            currency: "EUR",
        },
    });

    console.log("✅ Clients created:", { client1: client1.name, client2: client2.name, client3: client3.name });

    // Create DataSources linked to connector
    const ds1 = await prisma.dataSource.upsert({
        where: { id: "ds-leadgen-gads" },
        update: {},
        create: {
            id: "ds-leadgen-gads",
            clientId: client1.id,
            type: "GOOGLE_ADS",
            name: "LeadGen Google Ads",
            category: "DATA_SOURCE",
            externalId: "123-456-7890",
            token: "demo-token-leadgen",
            active: true,
            connectorId: googleAdsConnector.id,
            syncStatus: "ACTIVE",
        },
    });

    const ds2 = await prisma.dataSource.upsert({
        where: { id: "ds-ecom-gads" },
        update: {},
        create: {
            id: "ds-ecom-gads",
            clientId: client2.id,
            type: "GOOGLE_ADS",
            name: "Fashion Store Google Ads",
            category: "DATA_SOURCE",
            externalId: "234-567-8901",
            token: "demo-token-ecom",
            active: true,
            connectorId: googleAdsConnector.id,
            syncStatus: "ACTIVE",
        },
    });

    console.log("✅ DataSources created");

    // ═══════════════════════════════════════════════════════════════
    // Seed campaign data into ClickHouse
    // ═══════════════════════════════════════════════════════════════

    const campaigns = [
        { id: "camp-1", name: "Brand - Search", type: "SEARCH" },
        { id: "camp-2", name: "Non-Brand - Search", type: "SEARCH" },
        { id: "camp-3", name: "Performance Max", type: "PERFORMANCE_MAX" },
        { id: "camp-4", name: "Display - Remarketing", type: "DISPLAY" },
        { id: "camp-5", name: "Shopping - All Products", type: "SHOPPING" },
    ];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const clickhouseRows: Record<string, unknown>[] = [];

    for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
        const date = new Date(today);
        date.setDate(date.getDate() - dayOffset);
        const dateStr = date.toISOString().split("T")[0];

        for (const campaign of campaigns) {
            const isRecentWeek = dayOffset < 7;
            const baseSpend = campaign.type === "SEARCH" ? 150 : campaign.type === "PERFORMANCE_MAX" ? 200 : 80;
            const spendVariation = (Math.random() - 0.5) * 40;
            const spend = Math.max(20, baseSpend + spendVariation + (isRecentWeek ? 10 : 0));

            const baseConversions = campaign.type === "SEARCH" ? 6 : campaign.type === "PERFORMANCE_MAX" ? 8 : 3;
            const convVariation = (Math.random() - 0.5) * 4;
            const conversions = Math.max(0, baseConversions + convVariation + (isRecentWeek ? 1 : 0));

            const convValue = conversions * (45 + Math.random() * 30);
            const clicks = Math.floor(spend * (2 + Math.random()));
            const impressions = Math.floor(clicks * (8 + Math.random() * 12));

            // LeadGen client
            const leadgenHash = canonicalHash(ds1.id, date, { campaign_id: `leadgen-${campaign.id}` }, "campaign");
            clickhouseRows.push({
                canonical_hash: leadgenHash,
                data_source_id: ds1.id,
                client_id: client1.id,
                connector_slug: "google-ads",
                date: dateStr,
                level: "campaign",
                campaign_id: `leadgen-${campaign.id}`,
                campaign_name: campaign.name,
                campaign_type: campaign.type,
                campaign_status: "ENABLED",
                impressions,
                clicks,
                cost: parseFloat(spend.toFixed(2)),
                conversions: parseFloat(conversions.toFixed(4)),
                conversion_value: parseFloat(convValue.toFixed(2)),
            });

            // E-commerce client
            const ecomSpend = spend * 1.5;
            const ecomConversions = conversions * 1.2;
            const ecomConvValue = ecomConversions * (120 + Math.random() * 80);
            const ecomClicks = Math.floor(ecomSpend * (1.5 + Math.random()));
            const ecomImpressions = Math.floor(ecomSpend * 15);

            const ecomHash = canonicalHash(ds2.id, date, { campaign_id: `ecom-${campaign.id}` }, "campaign");
            clickhouseRows.push({
                canonical_hash: ecomHash,
                data_source_id: ds2.id,
                client_id: client2.id,
                connector_slug: "google-ads",
                date: dateStr,
                level: "campaign",
                campaign_id: `ecom-${campaign.id}`,
                campaign_name: campaign.name,
                campaign_type: campaign.type,
                campaign_status: "ENABLED",
                impressions: ecomImpressions,
                clicks: ecomClicks,
                cost: parseFloat(ecomSpend.toFixed(2)),
                conversions: parseFloat(ecomConversions.toFixed(4)),
                conversion_value: parseFloat(ecomConvValue.toFixed(2)),
            });
        }
    }

    // Insert into ClickHouse
    try {
        const { createClient } = await import("@clickhouse/client");
        const ch = createClient({
            url: process.env.CLICKHOUSE_URL || "http://localhost:8123",
            username: process.env.CLICKHOUSE_USER || "evalco",
            password: process.env.CLICKHOUSE_PASSWORD || "evalco_dev",
            database: process.env.CLICKHOUSE_DATABASE || "evalco",
        });

        // Clear existing seed data for these data sources
        await ch.command({ query: `ALTER TABLE metrics_data DELETE WHERE data_source_id IN ('${ds1.id}', '${ds2.id}')` });

        // Insert new data
        await ch.insert({
            table: "metrics_data",
            values: clickhouseRows,
            format: "JSONEachRow",
        });

        await ch.close();
        console.log(`✅ ClickHouse: ${clickhouseRows.length} campaign records seeded`);
    } catch (error) {
        console.warn("⚠️ ClickHouse not available, skipping campaign data seed:", (error as Error).message);
        console.warn("   Start ClickHouse with: docker-compose up -d clickhouse");
    }

    // ═══════════════════════════════════════════════════════════════
    // Demo Analyst Report
    // ═══════════════════════════════════════════════════════════════

    const analystReport = await prisma.analystReport.upsert({
        where: { id: "demo-analyst-report-1" },
        update: {},
        create: {
            id: "demo-analyst-report-1",
            clientId: client1.id,
            periodStart: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
            periodEnd: today,
            healthScore: 72,
            healthScoreBreakdown: JSON.stringify({
                target: -15,
                disapprovals: -5,
                serving_issues: -8,
                merchant_issues: 0,
                spend_anomaly: 0,
            }),
            deviationPct: 18.5,
            trendDirection: "DECLINING",
            reportJson: JSON.stringify({
                healthScore: 72,
                primaryRiskDriver: "CPA above target on Non-Brand Search campaigns",
                topIssues: [
                    { issue: "Non-Brand CPA at €32.40 (29.6% above €25 target)", impact: "HIGH", category: "performance" },
                    { issue: "Display Remarketing has limited serving status", impact: "MEDIUM", category: "compliance" },
                    { issue: "Week-over-week spend increase of 12% without proportional conversion growth", impact: "MEDIUM", category: "efficiency" },
                ],
                actionCandidates: [
                    "Review Non-Brand Search bid strategy and negative keywords",
                    "Investigate Display Remarketing serving limitation",
                    "Analyze spend allocation across campaign types",
                ],
                complianceFlags: ["1 campaign with limited serving status"],
                revenuLeakageEstimate: null,
            }),
            inputJson: JSON.stringify({ blendedCPA: 29.6, targetCPA: 25.0, totalSpend: 4250.0 }),
        },
    });

    // Advisor report
    await prisma.advisorReport.upsert({
        where: { id: "demo-advisor-report-1" },
        update: {},
        create: {
            id: "demo-advisor-report-1",
            analystReportId: analystReport.id,
            adviceJson: JSON.stringify({
                executiveSummary:
                    "LeadGen Pro BV toont een dalende trend met een blended CPA van €29.60, wat 18.5% boven target ligt. De primaire oorzaak is de Non-Brand Search campagne die inefficiënt converteert. Quick wins zijn beschikbaar via bid optimalisatie en het oplossen van de display serving limitation.",
                priorities: [
                    {
                        priority: "P1",
                        action: "Optimaliseer Non-Brand Search bid strategy",
                        expectedEffect: "CPA reductie van ~15-20%",
                        risk: "Mogelijk volumedaling bij agressieve CPA targets",
                    },
                    {
                        priority: "P2",
                        action: "Los Display Remarketing serving limitation op",
                        expectedEffect: "Herstel van remarketing bereik, extra conversies",
                        risk: "Laag risico",
                    },
                    {
                        priority: "P3",
                        action: "Herbalanceer budget allocatie richting best performing campaigns",
                        expectedEffect: "Efficiëntere spend verdeling",
                        risk: "Minder bereik op exploration campagnes",
                    },
                ],
                checklist: [
                    "Review search term rapport voor irrelevante queries",
                    "Pas bid strategy aan naar Target CPA €25",
                    "Check display ad policy compliance",
                    "Monitor resultaten na 3 dagen",
                ],
            }),
            status: "DRAFT",
        },
    });

    console.log("✅ Demo reports created");

    // ═══════════════════════════════════════════════════════════════
    // Default User Roles
    // ═══════════════════════════════════════════════════════════════

    const defaultRoles = [
        {
            id: "beheerder",
            name: "Beheerder",
            description: "Volledige toegang tot alle platforms",
            isDefault: true,
            sortOrder: 0,
            roleMapping: {
                GOOGLE_ADS: "ADMIN", GOOGLE_ANALYTICS: "ADMINISTRATOR", GOOGLE_MERCHANT: "ADMIN",
                GOOGLE_TAG_MANAGER: "ADMIN", GOOGLE_BUSINESS: "OWNER", YOUTUBE: "OWNER",
                META: "ADMIN", INSTAGRAM: "ADMIN", LINKEDIN: "ADMIN", PINTEREST: "ADMIN",
                MICROSOFT_ADS: "SUPER_ADMIN", SHOPIFY: "STAFF", WORDPRESS: "ADMINISTRATOR",
                KLAVIYO: "ADMIN", CHANNABLE: "FULL_ACCESS", MAGENTO: "ADMIN",
                LIGHTSPEED: "FULL_ACCESS", MICROSOFT_CLARITY: "ADMIN", COOKIEBOT: "FULL_ACCESS", STAPE: "FULL_ACCESS",
            },
        },
        {
            id: "standaard",
            name: "Standaard",
            description: "Kan data beheren en aanpassen",
            isDefault: true,
            sortOrder: 1,
            roleMapping: {
                GOOGLE_ADS: "STANDARD", GOOGLE_ANALYTICS: "EDITOR", GOOGLE_MERCHANT: "STANDARD",
                GOOGLE_TAG_MANAGER: "EDIT", GOOGLE_BUSINESS: "MANAGER", YOUTUBE: "EDITOR",
                META: "ADVERTISER", INSTAGRAM: "CONTENT_CREATOR", LINKEDIN: "CONTENT_CREATOR", PINTEREST: "COLLABORATOR",
                MICROSOFT_ADS: "STANDARD", SHOPIFY: "COLLABORATOR", WORDPRESS: "EDITOR",
                KLAVIYO: "MANAGER", CHANNABLE: "FULL_ACCESS", MAGENTO: "MANAGER",
                LIGHTSPEED: "FULL_ACCESS", MICROSOFT_CLARITY: "MEMBER", COOKIEBOT: "FULL_ACCESS", STAPE: "FULL_ACCESS",
            },
        },
        {
            id: "alleen-lezen",
            name: "Alleen lezen",
            description: "Kan alleen data en rapporten bekijken",
            isDefault: true,
            sortOrder: 2,
            roleMapping: {
                GOOGLE_ADS: "READ_ONLY", GOOGLE_ANALYTICS: "VIEWER", GOOGLE_MERCHANT: "EMAIL_CONTACTS",
                GOOGLE_TAG_MANAGER: "READ", GOOGLE_BUSINESS: "SITE_MANAGER", YOUTUBE: "VIEWER",
                META: "ANALYST", INSTAGRAM: "VIEWER", LINKEDIN: "ANALYST", PINTEREST: "COLLABORATOR",
                MICROSOFT_ADS: "VIEWER", SHOPIFY: "COLLABORATOR", WORDPRESS: "SUBSCRIBER",
                KLAVIYO: "READ_ONLY", CHANNABLE: "FULL_ACCESS", MAGENTO: "API_ACCESS",
                LIGHTSPEED: "FULL_ACCESS", MICROSOFT_CLARITY: "MEMBER", COOKIEBOT: "FULL_ACCESS", STAPE: "FULL_ACCESS",
            },
        },
    ];

    for (const r of defaultRoles) {
        await prisma.userRole.upsert({
            where: { id: r.id },
            update: { roleMapping: r.roleMapping },
            create: r,
        });
    }

    console.log("✅ Default user roles created");
    console.log("\n🎉 Seeding complete (SQLite)!");
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
