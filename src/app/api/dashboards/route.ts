// ═══════════════════════════════════════════════════════════════════
// Dashboards API — List & Create
// ═══════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireClientAccess } from '@/lib/api-guard';

/**
 * GET /api/dashboards?clientId=X
 * List all dashboards for a client.
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const clientId = searchParams.get('clientId');

        if (!clientId) {
            return NextResponse.json({ success: false, error: 'clientId is required' }, { status: 400 });
        }

        const [, authError] = await requireClientAccess(clientId);
        if (authError) return authError;

        const dashboards = await prisma.dashboard.findMany({
            where: { clientId },
            include: {
                _count: { select: { widgets: true } },
            },
            orderBy: { updatedAt: 'desc' },
        });

        return NextResponse.json({
            success: true,
            dashboards: dashboards.map(d => ({
                id: d.id,
                name: d.name,
                description: d.description,
                starred: d.starred,
                widgetCount: d._count.widgets,
                filters: d.filters,
                createdAt: d.createdAt,
                updatedAt: d.updatedAt,
            })),
        });
    } catch (error) {
        console.error('Dashboards list error:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch dashboards' }, { status: 500 });
    }
}

/**
 * POST /api/dashboards
 * Create a new dashboard.
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { clientId, name, description, templateId } = body;

        if (!clientId || !name) {
            return NextResponse.json({ success: false, error: 'clientId and name are required' }, { status: 400 });
        }

        const [, authError] = await requireClientAccess(clientId);
        if (authError) return authError;

        // Create dashboard
        const dashboard = await prisma.dashboard.create({
            data: {
                clientId,
                name,
                description: description || null,
            },
        });

        // If template, add pre-built widgets
        if (templateId) {
            const templateWidgets = getTemplateWidgets(templateId);
            if (templateWidgets.length > 0) {
                await prisma.dashboardWidget.createMany({
                    data: templateWidgets.map((w, i) => ({
                        dashboardId: dashboard.id,
                        type: w.type,
                        title: w.title,
                        position: w.position as object,
                        sortOrder: i,
                        config: w.config as object,
                    })),
                });
            }
        }

        return NextResponse.json({ success: true, dashboard: { id: dashboard.id, name: dashboard.name } });
    } catch (error) {
        console.error('Dashboard create error:', error);
        return NextResponse.json({ success: false, error: 'Failed to create dashboard' }, { status: 500 });
    }
}

// ─── Templates ───

interface TemplateWidget {
    type: string;
    title: string;
    position: { x: number; y: number; w: number; h: number };
    config: Record<string, unknown>;
}

function getTemplateWidgets(templateId: string): TemplateWidget[] {
    const templates: Record<string, TemplateWidget[]> = {
        'performance': [
            { type: 'kpi', title: 'Kosten', position: { x: 0, y: 0, w: 4, h: 1 }, config: { metric: 'cost' } },
            { type: 'kpi', title: 'Clicks', position: { x: 4, y: 0, w: 4, h: 1 }, config: { metric: 'clicks' } },
            { type: 'kpi', title: 'Conversies', position: { x: 8, y: 0, w: 4, h: 1 }, config: { metric: 'conversions' } },
            { type: 'line_chart', title: 'Kosten Trend', position: { x: 0, y: 1, w: 6, h: 2 }, config: { metrics: ['cost'], dimensions: ['date'] } },
            { type: 'bar_chart', title: 'Kosten per Campagne', position: { x: 6, y: 1, w: 6, h: 2 }, config: { metrics: ['cost'], dimensions: ['campaign_name'], limit: 10 } },
            { type: 'table', title: 'Campagne Overzicht', position: { x: 0, y: 3, w: 12, h: 2 }, config: { metrics: ['impressions', 'clicks', 'cost', 'conversions', 'ctr', 'roas'], dimensions: ['campaign_name'], limit: 20 } },
        ],
        'ecommerce': [
            { type: 'kpi', title: 'Omzet', position: { x: 0, y: 0, w: 3, h: 1 }, config: { metric: 'conversion_value' } },
            { type: 'kpi', title: 'ROAS', position: { x: 3, y: 0, w: 3, h: 1 }, config: { metric: 'roas' } },
            { type: 'kpi', title: 'Kosten', position: { x: 6, y: 0, w: 3, h: 1 }, config: { metric: 'cost' } },
            { type: 'kpi', title: 'Conversies', position: { x: 9, y: 0, w: 3, h: 1 }, config: { metric: 'conversions' } },
            { type: 'line_chart', title: 'Omzet vs Kosten', position: { x: 0, y: 1, w: 8, h: 2 }, config: { metrics: ['conversion_value', 'cost'], dimensions: ['date'] } },
            { type: 'pie_chart', title: 'Omzet per Apparaat', position: { x: 8, y: 1, w: 4, h: 2 }, config: { metrics: ['conversion_value'], dimensions: ['device'], limit: 5 } },
        ],
        'seo': [
            { type: 'kpi', title: 'Sessies', position: { x: 0, y: 0, w: 4, h: 1 }, config: { metric: 'sessions' } },
            { type: 'kpi', title: 'Actieve Gebruikers', position: { x: 4, y: 0, w: 4, h: 1 }, config: { metric: 'active_users' } },
            { type: 'kpi', title: 'Paginaweergaven', position: { x: 8, y: 0, w: 4, h: 1 }, config: { metric: 'screen_page_views' } },
            { type: 'line_chart', title: 'Sessies Trend', position: { x: 0, y: 1, w: 12, h: 2 }, config: { metrics: ['sessions', 'active_users'], dimensions: ['date'] } },
        ],
        'google-ads': [
            { type: 'kpi', title: 'Kosten', position: { x: 0, y: 0, w: 3, h: 1 }, config: { metric: 'cost' } },
            { type: 'kpi', title: 'Clicks', position: { x: 3, y: 0, w: 3, h: 1 }, config: { metric: 'clicks' } },
            { type: 'kpi', title: 'Conversies', position: { x: 6, y: 0, w: 3, h: 1 }, config: { metric: 'conversions' } },
            { type: 'kpi', title: 'ROAS', position: { x: 9, y: 0, w: 3, h: 1 }, config: { metric: 'roas' } },
            { type: 'line_chart', title: 'Spend & Conversies', position: { x: 0, y: 1, w: 8, h: 2 }, config: { metrics: ['cost', 'conversions'], dimensions: ['date'] } },
            { type: 'pie_chart', title: 'Kosten per Campagne Type', position: { x: 8, y: 1, w: 4, h: 2 }, config: { metrics: ['cost'], dimensions: ['campaign_type'], limit: 6 } },
            { type: 'bar_chart', title: 'Top Campagnes', position: { x: 0, y: 3, w: 6, h: 2 }, config: { metrics: ['cost'], dimensions: ['campaign_name'], limit: 10 } },
            { type: 'table', title: 'Campagne Details', position: { x: 6, y: 3, w: 6, h: 2 }, config: { metrics: ['impressions', 'clicks', 'cost', 'conversions', 'ctr', 'cpc'], dimensions: ['campaign_name'], limit: 15 } },
        ],
        'meta-ads': [
            { type: 'kpi', title: 'Kosten', position: { x: 0, y: 0, w: 3, h: 1 }, config: { metric: 'cost' } },
            { type: 'kpi', title: 'Impressies', position: { x: 3, y: 0, w: 3, h: 1 }, config: { metric: 'impressions' } },
            { type: 'kpi', title: 'Clicks', position: { x: 6, y: 0, w: 3, h: 1 }, config: { metric: 'clicks' } },
            { type: 'kpi', title: 'CTR', position: { x: 9, y: 0, w: 3, h: 1 }, config: { metric: 'ctr' } },
            { type: 'line_chart', title: 'Spend Trend', position: { x: 0, y: 1, w: 8, h: 2 }, config: { metrics: ['cost', 'clicks'], dimensions: ['date'] } },
            { type: 'bar_chart', title: 'Kosten per Campagne', position: { x: 8, y: 1, w: 4, h: 2 }, config: { metrics: ['cost'], dimensions: ['campaign_name'], limit: 8 } },
            { type: 'table', title: 'Campagne Overzicht', position: { x: 0, y: 3, w: 12, h: 2 }, config: { metrics: ['impressions', 'clicks', 'cost', 'conversions', 'ctr', 'cpc'], dimensions: ['campaign_name'], limit: 15 } },
        ],
        'microsoft-ads': [
            { type: 'kpi', title: 'Kosten', position: { x: 0, y: 0, w: 3, h: 1 }, config: { metric: 'cost' } },
            { type: 'kpi', title: 'Clicks', position: { x: 3, y: 0, w: 3, h: 1 }, config: { metric: 'clicks' } },
            { type: 'kpi', title: 'Conversies', position: { x: 6, y: 0, w: 3, h: 1 }, config: { metric: 'conversions' } },
            { type: 'kpi', title: 'CPC', position: { x: 9, y: 0, w: 3, h: 1 }, config: { metric: 'cpc' } },
            { type: 'line_chart', title: 'Performance Trend', position: { x: 0, y: 1, w: 8, h: 2 }, config: { metrics: ['cost', 'conversions'], dimensions: ['date'] } },
            { type: 'bar_chart', title: 'Top Campagnes', position: { x: 8, y: 1, w: 4, h: 2 }, config: { metrics: ['cost'], dimensions: ['campaign_name'], limit: 8 } },
            { type: 'table', title: 'Campagne Details', position: { x: 0, y: 3, w: 12, h: 2 }, config: { metrics: ['impressions', 'clicks', 'cost', 'conversions', 'ctr', 'cpc'], dimensions: ['campaign_name'], limit: 15 } },
        ],
    };
    return templates[templateId] || [];
}
