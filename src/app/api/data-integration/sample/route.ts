// ═══════════════════════════════════════════════════════════════════
// Sample Data API — Seed/remove sample data in ClickHouse
// Uses DataSource (merged model) for tracking, data goes to ClickHouse.
// ═══════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-guard';
import { prisma } from '@/lib/db';
import { insert, command, query as chQuery } from '@/lib/clickhouse';
import crypto from 'crypto';

const SAMPLE_SOURCE_NAME = '__sample__';

/**
 * GET /api/data-integration/sample?projectId=xxx
 */
export async function GET(request: Request) {
    try {
        const [, authError] = await requireAuth();
        if (authError) return authError;

        const { searchParams } = new URL(request.url);
        const projectId = searchParams.get('projectId');
        if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

        const source = await prisma.dataSource.findFirst({
            where: { projectId, name: SAMPLE_SOURCE_NAME },
        });

        if (!source) {
            return NextResponse.json({ success: true, exists: false, count: 0 });
        }

        let count = 0;
        try {
            const result = await chQuery<{ cnt: string }>(
                `SELECT count() AS cnt FROM metrics_data FINAL WHERE data_source_id = {dsId:String}`,
                { dsId: source.id }
            );
            count = Number(result[0]?.cnt || 0);
        } catch {
            count = 0;
        }

        return NextResponse.json({ success: true, exists: count > 0, count, connectionId: source.id });
    } catch (error) {
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}

/**
 * POST /api/data-integration/sample
 */
export async function POST(request: Request) {
    try {
        const [, authError] = await requireAuth();
        if (authError) return authError;

        const { projectId } = await request.json();
        if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

        // 1. Ensure ConnectorDefinition for google-ads exists
        let connector = await prisma.connectorDefinition.findUnique({ where: { slug: 'google-ads' } });
        if (!connector) {
            connector = await prisma.connectorDefinition.create({
                data: {
                    slug: 'google-ads',
                    name: 'Google Ads',
                    category: 'PAID_SEARCH',
                    authType: 'oauth2',
                    description: 'Google Ads advertising platform',
                    isActive: true,
                },
            });
        }

        // 2. Seed dimension definitions
        const existingDims = await prisma.dimensionDefinition.count({ where: { connectorId: connector.id } });
        if (existingDims === 0) {
            await prisma.dimensionDefinition.createMany({
                data: [
                    { connectorId: connector.id, slug: 'date', name: 'Date', canonicalName: 'date', dataType: 'DATE', isDefault: true },
                    { connectorId: connector.id, slug: 'campaign_id', name: 'Campaign ID', canonicalName: 'campaign_id', dataType: 'STRING', isDefault: true },
                    { connectorId: connector.id, slug: 'campaign_name', name: 'Campaign Name', canonicalName: 'campaign_name', dataType: 'STRING', isDefault: true },
                    { connectorId: connector.id, slug: 'campaign_type', name: 'Campaign Type', canonicalName: 'campaign_type', dataType: 'STRING' },
                    { connectorId: connector.id, slug: 'campaign_status', name: 'Campaign Status', canonicalName: 'campaign_status', dataType: 'STRING' },
                    { connectorId: connector.id, slug: 'ad_group_id', name: 'Ad Group ID', canonicalName: 'ad_group_id', dataType: 'STRING' },
                    { connectorId: connector.id, slug: 'ad_group_name', name: 'Ad Group Name', canonicalName: 'ad_group_name', dataType: 'STRING' },
                    { connectorId: connector.id, slug: 'device', name: 'Device', canonicalName: 'device', dataType: 'STRING' },
                    { connectorId: connector.id, slug: 'country', name: 'Country', canonicalName: 'country', dataType: 'STRING' },
                    { connectorId: connector.id, slug: 'network', name: 'Network', canonicalName: 'network', dataType: 'STRING' },
                ],
            });
        }

        // 3. Seed metric definitions
        const existingMetrics = await prisma.metricDefinition.count({ where: { connectorId: connector.id } });
        if (existingMetrics === 0) {
            await prisma.metricDefinition.createMany({
                data: [
                    { connectorId: connector.id, slug: 'impressions', name: 'Impressions', canonicalName: 'impressions', dataType: 'NUMBER', aggregationType: 'SUM', isDefault: true },
                    { connectorId: connector.id, slug: 'clicks', name: 'Clicks', canonicalName: 'clicks', dataType: 'NUMBER', aggregationType: 'SUM', isDefault: true },
                    { connectorId: connector.id, slug: 'cost', name: 'Cost', canonicalName: 'cost', dataType: 'CURRENCY', aggregationType: 'SUM', isDefault: true },
                    { connectorId: connector.id, slug: 'conversions', name: 'Conversions', canonicalName: 'conversions', dataType: 'NUMBER', aggregationType: 'SUM', isDefault: true },
                    { connectorId: connector.id, slug: 'conversion_value', name: 'Conversion Value', canonicalName: 'conversion_value', dataType: 'CURRENCY', aggregationType: 'SUM', isDefault: true },
                    { connectorId: connector.id, slug: 'reach', name: 'Reach', canonicalName: 'reach', dataType: 'NUMBER', aggregationType: 'SUM' },
                    { connectorId: connector.id, slug: 'video_views', name: 'Video Views', canonicalName: 'video_views', dataType: 'NUMBER', aggregationType: 'SUM' },
                ],
            });
        }

        // 4. Seed derived metrics
        const existingDerived = await prisma.derivedMetricDefinition.count({ where: { connectorId: connector.id } });
        if (existingDerived === 0) {
            await prisma.derivedMetricDefinition.createMany({
                data: [
                    { connectorId: connector.id, slug: 'ctr', name: 'CTR (%)', formula: 'clicks / impressions * 100', inputMetrics: '["clicks", "impressions"]', outputType: 'PERCENTAGE' },
                    { connectorId: connector.id, slug: 'cpc', name: 'CPC', formula: 'cost / clicks', inputMetrics: '["cost", "clicks"]', outputType: 'CURRENCY' },
                    { connectorId: connector.id, slug: 'roas', name: 'ROAS', formula: 'conversion_value / cost', inputMetrics: '["conversion_value", "cost"]', outputType: 'RATIO' },
                ],
            });
        }

        // 5. Create/find sample DataSource
        let source = await prisma.dataSource.findFirst({
            where: { projectId, name: SAMPLE_SOURCE_NAME },
        });
        if (!source) {
            source = await prisma.dataSource.create({
                data: {
                    projectId,
                    type: 'sample',
                    name: SAMPLE_SOURCE_NAME,
                    externalId: 'sample-data',
                    token: '{}',
                    active: true,
                    connectorId: connector.id,
                    syncStatus: 'ACTIVE',
                    syncInterval: 1440,
                    lookbackDays: 30,
                },
            });
        }

        // 6. Remove existing sample data from ClickHouse
        try {
            const safeDsId = source.id.replace(/'/g, '');
            await command(`ALTER TABLE metrics_data DELETE WHERE data_source_id = '${safeDsId}'`);
        } catch {
            // ClickHouse might not be ready yet during first run
        }

        // 7. Generate 30 days × 5 campaigns of sample data
        const campaigns = [
            { id: 'C001', name: 'Brand Awareness NL', type: 'SEARCH', status: 'ENABLED' },
            { id: 'C002', name: 'Performance Max — E-commerce', type: 'PERFORMANCE_MAX', status: 'ENABLED' },
            { id: 'C003', name: 'Display Remarketing', type: 'DISPLAY', status: 'ENABLED' },
            { id: 'C004', name: 'YouTube Video Ads', type: 'VIDEO', status: 'ENABLED' },
            { id: 'C005', name: 'Shopping — Bestsellers', type: 'SHOPPING', status: 'PAUSED' },
        ];
        const devices = ['DESKTOP', 'MOBILE', 'TABLET'];
        const countries = ['NL', 'BE', 'DE'];

        const records: Record<string, unknown>[] = [];

        const now = new Date();
        for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
            const date = new Date(now);
            date.setDate(date.getDate() - dayOffset);
            date.setHours(0, 0, 0, 0);
            const dateStr = date.toISOString().split('T')[0];

            for (const campaign of campaigns) {
                const device = devices[dayOffset % devices.length];
                const country = countries[dayOffset % countries.length];

                const baseImpressions = campaign.type === 'SEARCH' ? 2000 : campaign.type === 'DISPLAY' ? 5000 : 1000;
                const variance = 0.7 + Math.random() * 0.6;
                const impressions = Math.round(baseImpressions * variance);
                const clickRate = campaign.type === 'SEARCH' ? 0.05 : 0.01;
                const clicks = Math.round(impressions * clickRate * (0.8 + Math.random() * 0.4));
                const costPerClick = campaign.type === 'SEARCH' ? 0.8 : 0.3;
                const cost = parseFloat((clicks * costPerClick * (0.7 + Math.random() * 0.6)).toFixed(2));
                const convRate = campaign.type === 'PERFORMANCE_MAX' ? 0.08 : 0.03;
                const conversions = Math.round(clicks * convRate * (0.5 + Math.random()));
                const avgOrderValue = 45 + Math.random() * 30;
                const conversionValue = parseFloat((conversions * avgOrderValue).toFixed(2));

                const hashInput = `${source.id}|${dateStr}|${campaign.id}|${device}|${country}|campaign`;
                const canonicalHash = crypto.createHash('sha256').update(hashInput).digest('hex');

                records.push({
                    canonical_hash: canonicalHash,
                    data_source_id: source.id,
                    client_id: projectId,
                    connector_slug: 'google-ads',
                    date: dateStr,
                    level: 'campaign',
                    campaign_id: campaign.id,
                    campaign_name: campaign.name,
                    campaign_type: campaign.type,
                    campaign_status: campaign.status,
                    device,
                    country,
                    impressions,
                    clicks,
                    cost,
                    conversions,
                    conversion_value: conversionValue,
                    video_views: campaign.type === 'VIDEO' ? Math.round(impressions * 0.3) : 0,
                });
            }
        }

        await insert('metrics_data', records);

        return NextResponse.json({
            success: true,
            message: `Seeded ${records.length} sample records to ClickHouse`,
            count: records.length,
            connectionId: source.id,
        });
    } catch (error) {
        console.error('Sample data seed error:', error);
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}

/**
 * DELETE /api/data-integration/sample
 */
export async function DELETE(request: Request) {
    try {
        const [, authError] = await requireAuth();
        if (authError) return authError;

        const { searchParams } = new URL(request.url);
        const projectId = searchParams.get('projectId');
        if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

        const source = await prisma.dataSource.findFirst({
            where: { projectId, name: SAMPLE_SOURCE_NAME },
        });

        if (!source) {
            return NextResponse.json({ success: true, message: 'No sample data found', deleted: 0 });
        }

        // Delete from ClickHouse
        let deleted = 0;
        try {
            const countResult = await chQuery<{ cnt: string }>(
                `SELECT count() AS cnt FROM metrics_data FINAL WHERE data_source_id = {dsId:String}`,
                { dsId: source.id }
            );
            deleted = Number(countResult[0]?.cnt || 0);
            const safeDsId = source.id.replace(/'/g, '');
            await command(`ALTER TABLE metrics_data DELETE WHERE data_source_id = '${safeDsId}'`);
        } catch {
            // ClickHouse might not be available
        }

        await prisma.dataSource.delete({ where: { id: source.id } });

        return NextResponse.json({ success: true, message: `Removed ${deleted} sample records from ClickHouse`, deleted });
    } catch (error) {
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}
