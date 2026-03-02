// ═══════════════════════════════════════════════════════════════════
// Dashboard Widgets API — Create, Bulk Update, Delete
// ═══════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireDashboardAccess } from '@/lib/api-guard';

/**
 * POST /api/dashboards/:id/widgets
 * Add a new widget to a dashboard.
 */
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: dashboardId } = await params;

        const [, authError] = await requireDashboardAccess(dashboardId);
        if (authError) return authError;

        const body = await request.json();
        const { type, title, position, config } = body;

        if (!type || !title) {
            return NextResponse.json({ success: false, error: 'type and title are required' }, { status: 400 });
        }

        // Get the highest sort order
        const maxOrder = await prisma.dashboardWidget.aggregate({
            where: { dashboardId },
            _max: { sortOrder: true },
        });

        const widget = await prisma.dashboardWidget.create({
            data: {
                dashboardId,
                type,
                title,
                position: position || { x: 0, y: 99, w: type === 'kpi' ? 4 : type === 'table' ? 12 : 6, h: type === 'kpi' ? 1 : 2 },
                sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
                config: config || {},
            },
        });

        return NextResponse.json({ success: true, widget });
    } catch (error) {
        console.error('Widget create error:', error);
        return NextResponse.json({ success: false, error: 'Failed to create widget' }, { status: 500 });
    }
}

/**
 * PATCH /api/dashboards/:id/widgets
 * Bulk-update widgets (positions, configs, titles).
 * Body: { widgets: [{ id, title?, position?, config?, sortOrder? }] }
 */
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: dashboardId } = await params;

        const [, authError] = await requireDashboardAccess(dashboardId);
        if (authError) return authError;

        const body = await request.json();
        const { widgets } = body;

        if (!Array.isArray(widgets)) {
            return NextResponse.json({ success: false, error: 'widgets array is required' }, { status: 400 });
        }

        // Update each widget in a transaction
        await prisma.$transaction(
            widgets.map((w: { id: string; title?: string; position?: Record<string, unknown>; config?: Record<string, unknown>; sortOrder?: number; type?: string }) =>
                prisma.dashboardWidget.update({
                    where: { id: w.id },
                    data: {
                        ...(w.title !== undefined && { title: w.title }),
                        ...(w.position !== undefined && { position: w.position as object }),
                        ...(w.config !== undefined && { config: w.config as object }),
                        ...(w.sortOrder !== undefined && { sortOrder: w.sortOrder }),
                        ...(w.type !== undefined && { type: w.type }),
                    },
                })
            )
        );

        // Return updated widgets
        const updated = await prisma.dashboardWidget.findMany({
            where: { dashboardId },
            orderBy: { sortOrder: 'asc' },
        });

        return NextResponse.json({ success: true, widgets: updated });
    } catch (error) {
        console.error('Widget bulk update error:', error);
        return NextResponse.json({ success: false, error: 'Failed to update widgets' }, { status: 500 });
    }
}

/**
 * DELETE /api/dashboards/:id/widgets?widgetId=X
 * Delete a specific widget.
 */
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: dashboardId } = await params;

        const [, authError] = await requireDashboardAccess(dashboardId);
        if (authError) return authError;

        const { searchParams } = new URL(request.url);
        const widgetId = searchParams.get('widgetId');

        if (!widgetId) {
            return NextResponse.json({ success: false, error: 'widgetId is required' }, { status: 400 });
        }

        await prisma.dashboardWidget.delete({ where: { id: widgetId } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Widget delete error:', error);
        return NextResponse.json({ success: false, error: 'Failed to delete widget' }, { status: 500 });
    }
}
