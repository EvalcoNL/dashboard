// ═══════════════════════════════════════════════════════════════════
// Connection Health Monitor — Track and report data source health
// ═══════════════════════════════════════════════════════════════════

import { prisma } from '@/lib/db';
import { query as chQuery } from '@/lib/clickhouse';

export type HealthStatus = 'healthy' | 'warning' | 'error' | 'stale' | 'never_synced';

export interface ConnectionHealth {
    dataSourceId: string;
    connectorName: string;
    connectorSlug: string;
    status: HealthStatus;
    lastSyncAt: Date | null;
    lastSyncStatus: string | null;
    minutesSinceLastSync: number | null;
    syncInterval: number;
    recentFailures: number;
    totalRecords: number;
    errorMessage: string | null;
}

export interface HealthSummary {
    total: number;
    healthy: number;
    warning: number;
    error: number;
    stale: number;
    neverSynced: number;
    connections: ConnectionHealth[];
}

export class ConnectionHealthMonitor {
    async getClientHealth(projectId: string): Promise<HealthSummary> {
        const sources = await prisma.dataSource.findMany({
            where: { projectId },
            include: { connector: true },
        });

        const healthChecks = await Promise.all(
            sources.map(s => this.checkSource(s))
        );

        return {
            total: healthChecks.length,
            healthy: healthChecks.filter(h => h.status === 'healthy').length,
            warning: healthChecks.filter(h => h.status === 'warning').length,
            error: healthChecks.filter(h => h.status === 'error').length,
            stale: healthChecks.filter(h => h.status === 'stale').length,
            neverSynced: healthChecks.filter(h => h.status === 'never_synced').length,
            connections: healthChecks,
        };
    }

    async getConnectionHealth(dataSourceId: string): Promise<ConnectionHealth | null> {
        const source = await prisma.dataSource.findUnique({
            where: { id: dataSourceId },
            include: { connector: true },
        });
        if (!source) return null;
        return this.checkSource(source);
    }

    async getSyncHistory(dataSourceId: string, days = 30) {
        const since = new Date();
        since.setDate(since.getDate() - days);

        const jobs = await prisma.syncJob.findMany({
            where: { dataSourceId, createdAt: { gte: since } },
            orderBy: { createdAt: 'asc' },
        });

        const completed = jobs.filter(j => j.status === 'COMPLETED');
        const failed = jobs.filter(j => j.status === 'FAILED');

        const durations = completed
            .filter(j => j.startedAt && j.completedAt)
            .map(j => (j.completedAt!.getTime() - j.startedAt!.getTime()) / 1000);
        const avgDuration = durations.length > 0
            ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
            : 0;

        const records = completed.filter(j => j.recordsStored).map(j => j.recordsStored!);
        const avgRecords = records.length > 0
            ? Math.round(records.reduce((a, b) => a + b, 0) / records.length)
            : 0;

        const dailyMap = new Map<string, { jobs: number; completed: number; failed: number; totalRecords: number }>();
        for (const job of jobs) {
            const date = job.createdAt.toISOString().split('T')[0];
            if (!dailyMap.has(date)) dailyMap.set(date, { jobs: 0, completed: 0, failed: 0, totalRecords: 0 });
            const day = dailyMap.get(date)!;
            day.jobs++;
            if (job.status === 'COMPLETED') day.completed++;
            if (job.status === 'FAILED') day.failed++;
            if (job.recordsStored) day.totalRecords += job.recordsStored;
        }

        return {
            totalJobs: jobs.length,
            completedJobs: completed.length,
            failedJobs: failed.length,
            avgDurationSeconds: avgDuration,
            avgRecordsPerSync: avgRecords,
            dailyStats: Array.from(dailyMap.entries()).map(([date, stats]) => ({ date, ...stats })),
        };
    }

    async cleanup(retentionDays = 90) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - retentionDays);

        const deletedLogs = await prisma.syncLog.deleteMany({
            where: { job: { createdAt: { lt: cutoff }, status: { in: ['COMPLETED', 'FAILED', 'CANCELLED'] } } },
        });

        const deletedJobs = await prisma.syncJob.deleteMany({
            where: { createdAt: { lt: cutoff }, status: { in: ['COMPLETED', 'FAILED', 'CANCELLED'] } },
        });

        return { deletedJobs: deletedJobs.count, deletedLogs: deletedLogs.count };
    }

    async cleanStuckJobs(maxRunningMinutes = 60): Promise<number> {
        const cutoff = new Date(Date.now() - maxRunningMinutes * 60 * 1000);
        const result = await prisma.syncJob.updateMany({
            where: { status: 'RUNNING', startedAt: { lt: cutoff } },
            data: { status: 'FAILED', errorMessage: `Job timed out after ${maxRunningMinutes} minutes`, completedAt: new Date() },
        });
        return result.count;
    }

    // ─── Private ───

    private async checkSource(source: {
        id: string;
        syncStatus: string;
        lastSyncedAt: Date | null;
        syncInterval: number;
        syncError: string | null;
        connector: { name: string; slug: string } | null;
    }): Promise<ConnectionHealth> {
        const now = new Date();

        const recentFailures = await prisma.syncJob.count({
            where: { dataSourceId: source.id, status: 'FAILED', createdAt: { gte: new Date(now.getTime() - 86400000) } },
        });

        let totalRecords = 0;
        try {
            const result = await chQuery<{ cnt: string }>(
                `SELECT count() AS cnt FROM metrics_data WHERE data_source_id = {dsId:String}`,
                { dsId: source.id }
            );
            totalRecords = Number(result[0]?.cnt || 0);
        } catch {
            totalRecords = 0;
        }

        const minutesSinceLastSync = source.lastSyncedAt
            ? Math.round((now.getTime() - source.lastSyncedAt.getTime()) / 60000)
            : null;

        const lastJob = await prisma.syncJob.findFirst({
            where: { dataSourceId: source.id },
            orderBy: { createdAt: 'desc' },
            select: { status: true },
        });

        let status: HealthStatus;
        if (source.syncStatus === 'ERROR') {
            status = 'error';
        } else if (!source.lastSyncedAt) {
            status = 'never_synced';
        } else if (minutesSinceLastSync! > source.syncInterval * 2) {
            status = 'stale';
        } else if (recentFailures > 0 || minutesSinceLastSync! > source.syncInterval * 1.5) {
            status = 'warning';
        } else {
            status = 'healthy';
        }

        return {
            dataSourceId: source.id,
            connectorName: source.connector?.name || 'Unknown',
            connectorSlug: source.connector?.slug || 'unknown',
            status,
            lastSyncAt: source.lastSyncedAt,
            lastSyncStatus: lastJob?.status || null,
            minutesSinceLastSync,
            syncInterval: source.syncInterval,
            recentFailures,
            totalRecords,
            errorMessage: source.syncError,
        };
    }
}

export const connectionHealthMonitor = new ConnectionHealthMonitor();
