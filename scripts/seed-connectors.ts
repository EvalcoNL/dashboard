// ═══════════════════════════════════════════════════════════════════
// Connector Seed Script — Populates the connector catalog
// Run: npx tsx scripts/seed-connectors.ts
// ═══════════════════════════════════════════════════════════════════

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ConnectorSeed {
    slug: string;
    name: string;
    category: string;
    authType: string;
    description: string;
    isActive: boolean;
}

const CONNECTORS: ConnectorSeed[] = [
    // ─── Paid Search ───
    { slug: 'google-ads', name: 'Google Ads', category: 'PAID_SEARCH', authType: 'oauth2', description: 'Google Ads (formerly AdWords) — Search, Display, Shopping, Video, Performance Max campaigns', isActive: true },
    { slug: 'microsoft-ads', name: 'Microsoft Advertising', category: 'PAID_SEARCH', authType: 'oauth2', description: 'Microsoft Advertising (formerly Bing Ads) — Search, Shopping, Audience campaigns', isActive: true },
    { slug: 'apple-search-ads', name: 'Apple Search Ads', category: 'PAID_SEARCH', authType: 'oauth2', description: 'Apple Search Ads — App Store search advertising', isActive: false },
    { slug: 'search-ads-360', name: 'Search Ads 360', category: 'PAID_SEARCH', authType: 'oauth2', description: 'Google Search Ads 360 — Cross-engine search management', isActive: false },

    // ─── Paid Social ───
    { slug: 'meta-ads', name: 'Meta Ads', category: 'PAID_SOCIAL', authType: 'oauth2', description: 'Facebook & Instagram advertising — Campaigns, Ad Sets, Ads with breakdowns', isActive: true },
    { slug: 'linkedin-ads', name: 'LinkedIn Ads', category: 'PAID_SOCIAL', authType: 'oauth2', description: 'LinkedIn advertising — Campaign Groups, Campaigns, Creatives', isActive: true },
    { slug: 'tiktok-ads', name: 'TikTok Ads', category: 'PAID_SOCIAL', authType: 'oauth2', description: 'TikTok advertising — Auction ads, Reach & Frequency', isActive: true },
    { slug: 'pinterest-ads', name: 'Pinterest Ads', category: 'PAID_SOCIAL', authType: 'oauth2', description: 'Pinterest advertising — Campaigns, Ad Groups, Ads', isActive: false },
    { slug: 'snapchat-ads', name: 'Snapchat Ads', category: 'PAID_SOCIAL', authType: 'oauth2', description: 'Snapchat advertising — Campaigns, Ad Squads, Ads', isActive: false },
    { slug: 'x-ads', name: 'X Ads', category: 'PAID_SOCIAL', authType: 'oauth2', description: 'X (Twitter) advertising — Campaigns, Line Items, Creatives', isActive: false },
    { slug: 'reddit-ads', name: 'Reddit Ads', category: 'PAID_SOCIAL', authType: 'oauth2', description: 'Reddit advertising — Campaigns, Ad Groups, Ads', isActive: false },

    // ─── Analytics ───
    { slug: 'ga4', name: 'Google Analytics 4', category: 'ANALYTICS', authType: 'oauth2', description: 'Google Analytics 4 — Website & app analytics with 200+ dimensions', isActive: true },
    { slug: 'adobe-analytics', name: 'Adobe Analytics', category: 'ANALYTICS', authType: 'oauth2', description: 'Adobe Analytics — Enterprise web analytics', isActive: false },
    { slug: 'matomo', name: 'Matomo', category: 'ANALYTICS', authType: 'api_key', description: 'Matomo (formerly Piwik) — Open-source web analytics', isActive: false },
    { slug: 'mixpanel', name: 'Mixpanel', category: 'ANALYTICS', authType: 'api_key', description: 'Mixpanel — Product analytics and user behavior', isActive: false },

    // ─── Organic Social ───
    { slug: 'facebook-pages', name: 'Facebook Pages', category: 'ORGANIC_SOCIAL', authType: 'oauth2', description: 'Facebook Pages — Post insights, page reach, engagement', isActive: false },
    { slug: 'instagram-insights', name: 'Instagram Insights', category: 'ORGANIC_SOCIAL', authType: 'oauth2', description: 'Instagram Insights — Media, profile, stories metrics', isActive: false },
    { slug: 'linkedin-organic', name: 'LinkedIn Organic', category: 'ORGANIC_SOCIAL', authType: 'oauth2', description: 'LinkedIn Organic — Posts, followers, visitors', isActive: false },
    { slug: 'youtube', name: 'YouTube', category: 'ORGANIC_SOCIAL', authType: 'oauth2', description: 'YouTube — Channel, video, playlist analytics', isActive: false },
    { slug: 'tiktok-organic', name: 'TikTok Organic', category: 'ORGANIC_SOCIAL', authType: 'oauth2', description: 'TikTok Organic — Video performance, profile analytics', isActive: false },
    { slug: 'x-organic', name: 'X Organic', category: 'ORGANIC_SOCIAL', authType: 'oauth2', description: 'X (Twitter) Organic — Tweet activity, audience insights', isActive: false },
    { slug: 'threads', name: 'Threads', category: 'ORGANIC_SOCIAL', authType: 'oauth2', description: 'Threads — Post performance metrics', isActive: false },

    // ─── E-commerce ───
    { slug: 'shopify', name: 'Shopify', category: 'ECOMMERCE', authType: 'oauth2', description: 'Shopify — Orders, products, customers, sales analytics', isActive: false },
    { slug: 'woocommerce', name: 'WooCommerce', category: 'ECOMMERCE', authType: 'api_key', description: 'WooCommerce — Orders, products, customer data', isActive: false },
    { slug: 'amazon-seller', name: 'Amazon Seller Central', category: 'ECOMMERCE', authType: 'oauth2', description: 'Amazon Seller Central — Sales, inventory, advertising', isActive: false },

    // ─── CRM ───
    { slug: 'hubspot', name: 'HubSpot', category: 'CRM', authType: 'oauth2', description: 'HubSpot — Contacts, deals, activities, email marketing', isActive: false },
    { slug: 'salesforce', name: 'Salesforce', category: 'CRM', authType: 'oauth2', description: 'Salesforce — Reports, objects, pipeline data', isActive: false },
    { slug: 'pipedrive', name: 'Pipedrive', category: 'CRM', authType: 'api_key', description: 'Pipedrive — Deals, activities, pipeline analytics', isActive: false },

    // ─── Email Marketing ───
    { slug: 'mailchimp', name: 'Mailchimp', category: 'EMAIL', authType: 'oauth2', description: 'Mailchimp — Campaigns, lists, automations', isActive: false },
    { slug: 'klaviyo', name: 'Klaviyo', category: 'EMAIL', authType: 'api_key', description: 'Klaviyo — Campaigns, flows, segments, revenue attribution', isActive: false },
    { slug: 'activecampaign', name: 'ActiveCampaign', category: 'EMAIL', authType: 'api_key', description: 'ActiveCampaign — Campaigns, automations, contacts', isActive: false },

    // ─── SEO ───
    { slug: 'google-search-console', name: 'Google Search Console', category: 'SEO', authType: 'oauth2', description: 'Google Search Console — Search performance, sitemaps', isActive: true },
    { slug: 'google-merchant-center', name: 'Google Merchant Center', category: 'SEO', authType: 'oauth2', description: 'Google Merchant Center — Product, price, competitive data', isActive: false },
    { slug: 'ahrefs', name: 'Ahrefs', category: 'SEO', authType: 'api_key', description: 'Ahrefs — Backlinks, keywords, site audit', isActive: false },
    { slug: 'semrush', name: 'Semrush', category: 'SEO', authType: 'api_key', description: 'Semrush — Keyword research, competitive analysis', isActive: false },

    // ─── Programmatic / DSP ───
    { slug: 'dv360', name: 'Display & Video 360', category: 'PROGRAMMATIC', authType: 'oauth2', description: 'Google DV360 — Programmatic display, video, audio', isActive: false },
    { slug: 'campaign-manager-360', name: 'Campaign Manager 360', category: 'PROGRAMMATIC', authType: 'oauth2', description: 'Google CM360 — Ad serving, verification, reporting', isActive: false },
    { slug: 'the-trade-desk', name: 'The Trade Desk', category: 'PROGRAMMATIC', authType: 'api_key', description: 'The Trade Desk — Programmatic DSP reporting', isActive: false },
    { slug: 'amazon-dsp', name: 'Amazon DSP', category: 'PROGRAMMATIC', authType: 'oauth2', description: 'Amazon DSP — Programmatic display, video advertising', isActive: false },
    { slug: 'criteo', name: 'Criteo', category: 'PROGRAMMATIC', authType: 'oauth2', description: 'Criteo — Retargeting, commerce media', isActive: false },

    // ─── Affiliate ───
    { slug: 'taboola', name: 'Taboola', category: 'AFFILIATE', authType: 'oauth2', description: 'Taboola — Native advertising, content discovery', isActive: false },
    { slug: 'outbrain', name: 'Outbrain', category: 'AFFILIATE', authType: 'oauth2', description: 'Outbrain — Native advertising, recommendations', isActive: false },

    // ─── Custom ───
    { slug: 'file-import', name: 'File Import', category: 'CUSTOM', authType: 'custom', description: 'Import data from CSV, Excel, or JSON files', isActive: true },
    { slug: 'google-sheets', name: 'Google Sheets', category: 'CUSTOM', authType: 'oauth2', description: 'Import data from Google Sheets', isActive: false },
    { slug: 'bigquery', name: 'BigQuery', category: 'CUSTOM', authType: 'oauth2', description: 'Import data from Google BigQuery', isActive: false },
];

async function main() {
    console.log('🌱 Seeding connector definitions...\n');

    let created = 0;
    let updated = 0;

    for (const connector of CONNECTORS) {
        const existing = await prisma.connectorDefinition.findUnique({
            where: { slug: connector.slug },
        });

        if (existing) {
            await prisma.connectorDefinition.update({
                where: { slug: connector.slug },
                data: connector,
            });
            updated++;
            console.log(`  ✏️  Updated: ${connector.name}`);
        } else {
            await prisma.connectorDefinition.create({
                data: connector,
            });
            created++;
            console.log(`  ✅ Created: ${connector.name}`);
        }
    }

    console.log(`\n📊 Summary: ${created} created, ${updated} updated, ${CONNECTORS.length} total`);

    // Also seed system-wide derived metrics
    const derivedMetrics = [
        { slug: 'ctr', name: 'CTR (Click-through Rate)', formula: 'clicks / impressions * 100', inputMetrics: ['clicks', 'impressions'], outputType: 'PERCENTAGE', description: 'Percentage of impressions that resulted in a click' },
        { slug: 'cpc', name: 'CPC (Cost per Click)', formula: 'cost / clicks', inputMetrics: ['cost', 'clicks'], outputType: 'CURRENCY', description: 'Average cost per click' },
        { slug: 'cpm', name: 'CPM (Cost per 1000 Impressions)', formula: 'cost / impressions * 1000', inputMetrics: ['cost', 'impressions'], outputType: 'CURRENCY', description: 'Cost per 1000 impressions' },
        { slug: 'roas', name: 'ROAS (Return on Ad Spend)', formula: 'conversion_value / cost', inputMetrics: ['conversion_value', 'cost'], outputType: 'NUMBER', description: 'Revenue generated per euro spent on advertising' },
        { slug: 'conversion_rate', name: 'Conversion Rate', formula: 'conversions / clicks * 100', inputMetrics: ['conversions', 'clicks'], outputType: 'PERCENTAGE', description: 'Percentage of clicks that led to a conversion' },
        { slug: 'cost_per_conversion', name: 'Cost per Conversion', formula: 'cost / conversions', inputMetrics: ['cost', 'conversions'], outputType: 'CURRENCY', description: 'Average cost paid per conversion' },
        { slug: 'aov', name: 'Average Order Value', formula: 'revenue / transactions', inputMetrics: ['revenue', 'transactions'], outputType: 'CURRENCY', description: 'Average revenue per transaction' },
    ];

    console.log('\n🌱 Seeding derived metric definitions...\n');

    for (const metric of derivedMetrics) {
        await prisma.derivedMetricDefinition.upsert({
            where: { id: metric.slug }, // Using slug as pseudo-ID for upsert
            create: {
                slug: metric.slug,
                name: metric.name,
                formula: metric.formula,
                inputMetrics: metric.inputMetrics,
                outputType: metric.outputType,
                description: metric.description,
                connectorId: null,
                projectId: null,
            },
            update: {
                name: metric.name,
                formula: metric.formula,
                inputMetrics: metric.inputMetrics,
                outputType: metric.outputType,
                description: metric.description,
            },
        });
        console.log(`  ✅ ${metric.name}`);
    }

    console.log('\n🎉 Seeding complete!');
}

main()
    .catch(e => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
