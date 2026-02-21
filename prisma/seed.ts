/// <reference types="node" />
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { hash } from "bcryptjs";

function createPrismaClient() {
    const adapter = new PrismaLibSql({
        url: process.env.DATABASE_URL!,
    });
    return new PrismaClient({ adapter });
}

const prisma = createPrismaClient();

async function main() {
    console.log("🌱 Seeding database (SQLite)...");

    // Create admin user
    const adminPassword = await hash("Admin123!", 12);
    const admin = await prisma.user.upsert({
        where: { email: "admin@evalco.nl" },
        update: {},
        create: {
            name: "Admin User",
            email: "admin@evalco.nl",
            passwordHash: adminPassword,
            role: "ADMIN",
        },
    });

    // Create strategist user
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

    // Create demo clients
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

    // Create demo campaign metrics (14 days of data)
    const campaigns = [
        { id: "camp-1", name: "Brand - Search", type: "SEARCH" },
        { id: "camp-2", name: "Non-Brand - Search", type: "SEARCH" },
        { id: "camp-3", name: "Performance Max", type: "PERFORMANCE_MAX" },
        { id: "camp-4", name: "Display - Remarketing", type: "DISPLAY" },
        { id: "camp-5", name: "Shopping - All Products", type: "SHOPPING" },
    ];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
        const date = new Date(today);
        date.setDate(date.getDate() - dayOffset);

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

            // LeadGen client (CPA)
            await prisma.campaignMetric.upsert({
                where: {
                    campaignId_date: {
                        campaignId: `leadgen-${campaign.id}`,
                        date: date,
                    },
                },
                update: {},
                create: {
                    clientId: client1.id,
                    campaignId: `leadgen-${campaign.id}`,
                    campaignName: campaign.name,
                    campaignType: campaign.type,
                    date: date,
                    spend: spend,
                    conversions: conversions,
                    conversionValue: convValue,
                    clicks: clicks,
                    impressions: impressions,
                    status: "ENABLED",
                    servingStatus: campaign.id === "camp-4" && dayOffset < 3 ? "LIMITED" : "ELIGIBLE",
                },
            });

            // E-commerce client (ROAS)
            const ecomSpend = spend * 1.5;
            const ecomConversions = conversions * 1.2;
            const ecomConvValue = ecomConversions * (120 + Math.random() * 80);

            await prisma.campaignMetric.upsert({
                where: {
                    campaignId_date: {
                        campaignId: `ecom-${campaign.id}`,
                        date: date,
                    },
                },
                update: {},
                create: {
                    clientId: client2.id,
                    campaignId: `ecom-${campaign.id}`,
                    campaignName: campaign.name,
                    campaignType: campaign.type,
                    date: date,
                    spend: ecomSpend,
                    conversions: ecomConversions,
                    conversionValue: ecomConvValue,
                    clicks: Math.floor(ecomSpend * (1.5 + Math.random())),
                    impressions: Math.floor(ecomSpend * 15),
                    status: "ENABLED",
                    servingStatus: "ELIGIBLE",
                },
            });
        }
    }

    console.log("✅ Campaign metrics created");

    // Create a demo analyst report
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

    // Create a demo advisor report
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
