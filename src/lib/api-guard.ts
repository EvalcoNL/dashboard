// ═══════════════════════════════════════════════════════════════════
// API Guard — Auth + Authorization helpers for API routes
// ═══════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export interface AuthSession {
    user: { id: string; role: string; email?: string | null; name?: string | null };
}

/**
 * Require authentication. Returns the session or a 401 response.
 * Usage:
 *   const [session, errorResponse] = await requireAuth();
 *   if (errorResponse) return errorResponse;
 */
export async function requireAuth(): Promise<[AuthSession, null] | [null, NextResponse]> {
    const session = await auth();
    if (!session?.user?.id) {
        return [null, NextResponse.json(
            { success: false, error: 'Authentication required' },
            { status: 401 }
        )];
    }
    return [session as AuthSession, null];
}

/**
 * Require authentication AND verify the user has access to the given project.
 * Admins have access to all projects. Regular users must be in the project's access list.
 */
export async function requireProjectAccess(projectId: string): Promise<[AuthSession, null] | [null, NextResponse]> {
    const [session, authError] = await requireAuth();
    if (authError) return [null, authError];

    // Admins can access everything
    if (session.user.role === 'ADMIN') return [session, null];

    // Check if user has access to this project
    const project = await prisma.project.findFirst({
        where: {
            id: projectId,
            users: { some: { id: session.user.id } },
        },
        select: { id: true },
    });

    if (!project) {
        return [null, NextResponse.json(
            { success: false, error: 'Access denied' },
            { status: 403 }
        )];
    }

    return [session, null];
}

/**
 * Require authentication AND verify the user owns the dashboard (via its projectId).
 */
export async function requireDashboardAccess(dashboardId: string): Promise<[AuthSession & { dashboardProjectId: string }, null] | [null, NextResponse]> {
    const [session, authError] = await requireAuth();
    if (authError) return [null, authError];

    // Look up the dashboard to get its projectId
    const dashboard = await prisma.dashboard.findUnique({
        where: { id: dashboardId },
        select: { projectId: true },
    });

    if (!dashboard) {
        return [null, NextResponse.json(
            { success: false, error: 'Dashboard not found' },
            { status: 404 }
        )];
    }

    // Admins can access everything
    if (session.user.role === 'ADMIN') {
        return [{ ...session, dashboardProjectId: dashboard.projectId } as AuthSession & { dashboardProjectId: string }, null];
    }

    // Check if user has access to this project
    const project = await prisma.project.findFirst({
        where: {
            id: dashboard.projectId,
            users: { some: { id: session.user.id } },
        },
        select: { id: true },
    });

    if (!project) {
        return [null, NextResponse.json(
            { success: false, error: 'Access denied' },
            { status: 403 }
        )];
    }

    return [{ ...session, dashboardProjectId: dashboard.projectId } as AuthSession & { dashboardProjectId: string }, null];
}

/**
 * Require authentication AND verify the user has access to the data source's project.
 * Returns the session + the data source record.
 */
export async function requireDataSourceAccess(dataSourceId: string): Promise<[AuthSession & { dataSource: { id: string; projectId: string } }, null] | [null, NextResponse]> {
    const [session, authError] = await requireAuth();
    if (authError) return [null, authError];

    const dataSource = await prisma.dataSource.findUnique({
        where: { id: dataSourceId },
        select: { id: true, projectId: true },
    });

    if (!dataSource) {
        return [null, NextResponse.json(
            { success: false, error: 'Data source not found' },
            { status: 404 }
        )];
    }

    // Admins can access everything
    if (session.user.role === 'ADMIN') {
        return [{ ...session, dataSource } as AuthSession & { dataSource: { id: string; projectId: string } }, null];
    }

    // Check if user has access to this project
    const project = await prisma.project.findFirst({
        where: {
            id: dataSource.projectId,
            users: { some: { id: session.user.id } },
        },
        select: { id: true },
    });

    if (!project) {
        return [null, NextResponse.json(
            { success: false, error: 'Access denied' },
            { status: 403 }
        )];
    }

    return [{ ...session, dataSource } as AuthSession & { dataSource: { id: string; projectId: string } }, null];
}

/**
 * Require ADMIN role. Returns the session or a 403 response.
 */
export async function requireAdmin(): Promise<[AuthSession, null] | [null, NextResponse]> {
    const [session, authError] = await requireAuth();
    if (authError) return [null, authError];

    if (session.user.role !== 'ADMIN') {
        return [null, NextResponse.json(
            { success: false, error: 'Admin access required' },
            { status: 403 }
        )];
    }

    return [session, null];
}
