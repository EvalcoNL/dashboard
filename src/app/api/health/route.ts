// ═══════════════════════════════════════════════════════════════════
// Health Check Endpoint — For Docker health checks & monitoring
//
// GET /api/health → 200 OK or 503 Service Unavailable
// No auth required (public route for container orchestration)
// ═══════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { healthCheck as clickhouseHealthCheck } from '@/lib/clickhouse';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface ServiceStatus {
    status: 'ok' | 'error';
    latencyMs?: number;
    error?: string;
}

export async function GET() {
    const services: Record<string, ServiceStatus> = {};
    let allHealthy = true;

    // ─── SQLite (Prisma) ───
    const sqliteStart = Date.now();
    try {
        await prisma.user.count();
        services.sqlite = { status: 'ok', latencyMs: Date.now() - sqliteStart };
    } catch (error) {
        allHealthy = false;
        services.sqlite = {
            status: 'error',
            latencyMs: Date.now() - sqliteStart,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }

    // ─── ClickHouse ───
    const chStart = Date.now();
    try {
        const ok = await clickhouseHealthCheck();
        services.clickhouse = ok
            ? { status: 'ok', latencyMs: Date.now() - chStart }
            : { status: 'error', latencyMs: Date.now() - chStart, error: 'Health check returned false' };
        if (!ok) allHealthy = false;
    } catch (error) {
        allHealthy = false;
        services.clickhouse = {
            status: 'error',
            latencyMs: Date.now() - chStart,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }

    // ─── Redis (check via env only — actual check requires BullMQ import) ───
    services.redis = process.env.REDIS_URL
        ? { status: 'ok' }
        : { status: 'error', error: 'REDIS_URL not configured' };
    if (!process.env.REDIS_URL) allHealthy = false;

    const response = {
        status: allHealthy ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
        services,
    };

    return NextResponse.json(response, {
        status: allHealthy ? 200 : 503,
    });
}
