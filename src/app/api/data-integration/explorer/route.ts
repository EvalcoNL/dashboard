// ═══════════════════════════════════════════════════════════════════
// Data Explorer API — Query endpoint for the Data Explorer UI
// ═══════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-guard';
import { datasetQueryEngine } from '@/lib/data-integration/dataset-query-engine';
import { prisma } from '@/lib/db';

/**
 * POST /api/data-integration/explorer
 */
export async function POST(request: Request) {
    try {
        const [, authError] = await requireAuth();
        if (authError) return authError;

        const body = await request.json();
        const { projectId, connectionIds, dimensions, metrics, dateFrom, dateTo, compare, filters } = body;

        if (!dimensions?.length || !metrics?.length) {
            return NextResponse.json({ success: false, error: 'dimensions and metrics are required' }, { status: 400 });
        }

        // If no connectionIds given, use all active data sources
        let resolvedIds = connectionIds;
        if (!resolvedIds || resolvedIds.length === 0) {
            const sources = await prisma.dataSource.findMany({
                where: { projectId: projectId, syncStatus: 'ACTIVE', active: true },
                select: { id: true },
            });
            resolvedIds = sources.map((s: { id: string }) => s.id);
        }

        const query = {
            connectionIds: resolvedIds,
            dimensions,
            metrics,
            dateFrom: new Date(dateFrom),
            dateTo: new Date(dateTo),
            filters: filters?.map((f: { field: string; operator: string; value: string | number }) => ({
                field: f.field,
                operator: f.operator,
                value: f.value,
            })),
            limit: 10000,
        };

        if (compare) {
            const result = await datasetQueryEngine.compare(query, compare as 'previous_period' | 'previous_year');
            return NextResponse.json({
                success: true,
                rows: result.current.rows,
                totalRows: result.current.totalRows,
                comparison: result.changes,
                previousRows: result.previous.rows,
            });
        }

        const result = await datasetQueryEngine.query(query);
        return NextResponse.json({
            success: true,
            rows: result.rows,
            totalRows: result.totalRows,
        });
    } catch (error) {
        console.error('Data Explorer query error:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Query failed' },
            { status: 500 }
        );
    }
}
