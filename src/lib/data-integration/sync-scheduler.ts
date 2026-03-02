// ═══════════════════════════════════════════════════════════════════
// Sync Scheduler — Queue-backed scheduling for automatic data syncs
//
// The scheduler's job is purely to ENQUEUE work:
// 1. Find data sources that are due for sync
// 2. Add sync jobs to the BullMQ queue
// 3. The separate worker process picks up and executes the jobs
//
// For local dev without Redis, falls back to direct execution.
// ═══════════════════════════════════════════════════════════════════

import { prisma } from '@/lib/db';
import { syncEngine, type SyncMode } from './sync-engine';
import { addSyncJob, addBulkSyncJobs, isQueueAvailable, type SyncJobPayload } from './sync-queue';

interface SchedulerConfig {
    maxConcurrentJobs: number;
    defaultIntervalMinutes: number;
    maxRetries: number;
    retryBackoffMinutes: number;
}

const DEFAULT_CONFIG: SchedulerConfig = {
    maxConcurrentJobs: 3,
    defaultIntervalMinutes: 1440,
    maxRetries: 3,
    retryBackoffMinutes: 30,
};

/**
 * Queue-backed Sync Scheduler.
 *
 * In production: enqueues jobs to BullMQ (processed by worker-entry.ts).
 * In local dev:  falls back to direct execution if Redis is unavailable.
 */
export class SyncScheduler {
    private config: SchedulerConfig;
    private isRunning = false;

    constructor(config?: Partial<SchedulerConfig>) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * Scheduler tick — find due sources and enqueue them.
     * Called by the cron endpoint every 5 minutes.
     */
    async tick(): Promise<{ started: number; skipped: number; errors: string[] }> {
        if (this.isRunning) {
            return { started: 0, skipped: 0, errors: ['Scheduler already running'] };
        }

        this.isRunning = true;
        const errors: string[] = [];
        let started = 0;
        let skipped = 0;

        try {
            // Check how many slots are available
            const runningJobs = await prisma.syncJob.count({ where: { status: 'RUNNING' } });
            const availableSlots = this.config.maxConcurrentJobs - runningJobs;
            if (availableSlots <= 0) {
                return { started: 0, skipped: 0, errors: ['All job slots occupied'] };
            }

            const dueSources = await this.findDueSources(availableSlots);
            if (dueSources.length === 0) {
                return { started: 0, skipped: 0, errors: [] };
            }

            // Try queue-based execution first, fallback to direct
            const useQueue = await isQueueAvailable();

            if (useQueue) {
                // ─── Queue Mode: enqueue all due sources ───
                const payloads: SyncJobPayload[] = dueSources.map(source => ({
                    dataSourceId: source.id,
                    mode: 'INCREMENTAL' as const,
                    priority: 5,
                }));

                const jobIds = await addBulkSyncJobs(payloads);
                started = jobIds.length;
                console.log(`[Scheduler] Enqueued ${started} sync jobs via queue`);
            } else {
                // ─── Fallback: direct execution (local dev without Redis) ───
                console.log(`[Scheduler] Redis unavailable — running ${dueSources.length} syncs directly`);

                const syncPromises = dueSources.map(async (source) => {
                    try {
                        await syncEngine.syncDataSource({ dataSourceId: source.id });
                        started++;
                    } catch (error) {
                        const msg = error instanceof Error ? error.message : 'Unknown error';
                        errors.push(`${source.id}: ${msg}`);
                        await this.handleRetry(source.id, msg);
                    }
                });

                await Promise.allSettled(syncPromises);
                skipped = dueSources.length - started - errors.length;
            }
        } finally {
            this.isRunning = false;
        }

        return { started, skipped, errors };
    }

    /**
     * Schedule an immediate sync (manual trigger from UI).
     * Uses queue if available, otherwise direct execution.
     */
    async scheduleNow(connectionId: string, mode?: SyncMode) {
        const useQueue = await isQueueAvailable();

        if (useQueue) {
            const jobId = await addSyncJob({
                dataSourceId: connectionId,
                mode: mode || 'INCREMENTAL',
                priority: 1, // Manual syncs get highest priority
            });
            return { queued: true, queueJobId: jobId };
        }

        // Fallback: direct execution
        return syncEngine.syncDataSource({
            dataSourceId: connectionId,
            mode: mode || 'INCREMENTAL',
            force: true,
        });
    }

    /**
     * Schedule a backfill job.
     */
    async scheduleBackfill(connectionId: string, dateFrom: Date, dateTo: Date, level?: string, mode?: SyncMode) {
        const useQueue = await isQueueAvailable();

        if (useQueue) {
            const jobId = await addSyncJob({
                dataSourceId: connectionId,
                mode: mode || 'FULL',
                level,
                dateFrom: dateFrom.toISOString(),
                dateTo: dateTo.toISOString(),
                priority: 3, // Backfills get medium-high priority
            });
            return { queued: true, queueJobId: jobId };
        }

        // Fallback: direct execution
        return syncEngine.syncDataSource({
            dataSourceId: connectionId,
            dateFrom,
            dateTo,
            level,
            mode: mode || 'FULL',
            force: true,
        });
    }

    async pauseConnection(connectionId: string): Promise<void> {
        await prisma.dataSource.update({
            where: { id: connectionId },
            data: { syncStatus: 'PAUSED' },
        });
    }

    async resumeConnection(connectionId: string): Promise<void> {
        await prisma.dataSource.update({
            where: { id: connectionId },
            data: { syncStatus: 'ACTIVE', syncError: null },
        });
    }

    async updateInterval(connectionId: string, intervalMinutes: number): Promise<void> {
        await prisma.dataSource.update({
            where: { id: connectionId },
            data: { syncInterval: intervalMinutes },
        });
    }

    async getSchedulerStatus() {
        const [total, active, paused, errorSources, running, pending, due, failures] = await Promise.all([
            prisma.dataSource.count(),
            prisma.dataSource.count({ where: { syncStatus: 'ACTIVE' } }),
            prisma.dataSource.count({ where: { syncStatus: 'PAUSED' } }),
            prisma.dataSource.count({ where: { syncStatus: 'ERROR' } }),
            prisma.syncJob.count({ where: { status: 'RUNNING' } }),
            prisma.syncJob.count({ where: { status: 'PENDING' } }),
            this.countDueSources(),
            prisma.syncJob.count({
                where: { status: 'FAILED', createdAt: { gte: new Date(Date.now() - 86400000) } },
            }),
        ]);

        // Add queue health if available
        let queueHealth = null;
        try {
            const { getQueueHealth } = await import('./sync-queue');
            if (await isQueueAvailable()) {
                queueHealth = await getQueueHealth();
            }
        } catch { /* queue not available */ }

        return {
            isRunning: this.isRunning,
            totalConnections: total,
            activeConnections: active,
            pausedConnections: paused,
            errorConnections: errorSources,
            runningJobs: running,
            pendingJobs: pending,
            dueForSync: due,
            recentFailures: failures,
            queue: queueHealth,
        };
    }

    // ─── Private ───

    private async findDueSources(limit: number) {
        const now = new Date();
        const sources = await prisma.dataSource.findMany({
            where: { syncStatus: 'ACTIVE' },
            include: { connector: true },
        });

        const due = sources.filter(s => {
            if (!s.lastSyncedAt) return true;
            const nextSyncAt = new Date(s.lastSyncedAt.getTime() + s.syncInterval * 60 * 1000);
            return nextSyncAt <= now;
        });

        due.sort((a, b) => {
            if (!a.lastSyncedAt && !b.lastSyncedAt) return 0;
            if (!a.lastSyncedAt) return -1;
            if (!b.lastSyncedAt) return 1;
            return a.lastSyncedAt.getTime() - b.lastSyncedAt.getTime();
        });

        return due.slice(0, limit);
    }

    private async countDueSources(): Promise<number> {
        const sources = await prisma.dataSource.findMany({
            where: { syncStatus: 'ACTIVE' },
            select: { lastSyncedAt: true, syncInterval: true },
        });

        const now = new Date();
        return sources.filter(s => {
            if (!s.lastSyncedAt) return true;
            const nextSyncAt = new Date(s.lastSyncedAt.getTime() + s.syncInterval * 60 * 1000);
            return nextSyncAt <= now;
        }).length;
    }

    private async handleRetry(dataSourceId: string, errorMessage: string): Promise<void> {
        const recentFailures = await prisma.syncJob.count({
            where: {
                dataSourceId,
                status: 'FAILED',
                createdAt: { gte: new Date(Date.now() - 86400000) },
            },
        });

        if (recentFailures >= this.config.maxRetries) {
            await prisma.dataSource.update({
                where: { id: dataSourceId },
                data: {
                    syncStatus: 'ERROR',
                    syncError: `Auto-paused after ${recentFailures} failures: ${errorMessage}`,
                },
            });
        }
    }
}

export const syncScheduler = new SyncScheduler();
