// ═══════════════════════════════════════════════════════════════════
// Dashboard Detail API — Get, Update, Delete
// ═══════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireDashboardAccess } from '@/lib/api-guard';

/**
 * GET /api/dashboards/:id
 * Get a single dashboard with all widgets.
 */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const [, authError] = await requireDashboardAccess(id);
        if (authError) return authError;

        const dashboard = await prisma.dashboard.findUnique({
            where: { id },
            include: {
                widgets: { orderBy: { sortOrder: 'asc' } },
            },
        });

        if (!dashboard) {
            return NextResponse.json({ success: false, error: 'Dashboard not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, dashboard });
    } catch (error) {
        console.error('Dashboard get error:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch dashboard' }, { status: 500 });
    }
}

/**
 * PATCH /api/dashboards/:id
 * Update dashboard name, description, or filters.
 */
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const [, authError] = await requireDashboardAccess(id);
        if (authError) return authError;

        const body = await request.json();
        const { name, description, filters, starred } = body;

        const data: Record<string, unknown> = {};
        if (name !== undefined) data.name = name;
        if (description !== undefined) data.description = description;
        if (filters !== undefined) data.filters = filters;
        if (starred !== undefined) data.starred = starred;

        const dashboard = await prisma.dashboard.update({
            where: { id },
            data,
        });

        return NextResponse.json({ success: true, dashboard });
    } catch (error) {
        console.error('Dashboard update error:', error);
        return NextResponse.json({ success: false, error: 'Failed to update dashboard' }, { status: 500 });
    }
}

/**
 * DELETE /api/dashboards/:id
 * Delete a dashboard and all its widgets (cascade).
 */
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const [, authError] = await requireDashboardAccess(id);
        if (authError) return authError;

        await prisma.dashboard.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Dashboard delete error:', error);
        return NextResponse.json({ success: false, error: 'Failed to delete dashboard' }, { status: 500 });
    }
}
