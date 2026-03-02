// ═══════════════════════════════════════════════════════════════════
// Sync Worker — BullMQ worker that processes sync jobs
// Runs as a separate process (worker-entry.ts) or embedded in dev
// ═══════════════════════════════════════════════════════════════════

import { Worker, type Job } from 'bullmq';
import { SYNC_QUEUE_NAME, type SyncJobPayload, type SyncJobResult } from './sync-queue';
import { syncEngine } from './sync-engine';
import { prisma } from '@/lib/db';

/**
 * Process a single sync job.
 * This is the core handler — it receives a job from the queue
 * and delegates to the existing syncEngine.
 */
async function processSyncJob(job: Job<SyncJobPayload, SyncJobResult>): Promise<SyncJobResult> {
    const { dataSourceId, mode, level, dateFrom, dateTo } = job.data;

    console.log(`[SyncWorker] Processing job ${job.id}: ${mode} sync for ${dataSourceId}`);
    await job.updateProgress(10);

    try {
        const result = await syncEngine.syncDataSource({
            dataSourceId,
            mode,
            level,
            dateFrom: dateFrom ? new Date(dateFrom) : undefined,
            dateTo: dateTo ? new Date(dateTo) : undefined,
            force: true,
        });

        await job.updateProgress(100);

        console.log(`[SyncWorker] Job ${job.id} completed: ${result.fetched} fetched, ${result.newRows} new`);

        return {
            jobId: result.jobId,
            mode: result.mode,
            fetched: result.fetched,
            stored: result.stored,
            newRows: result.newRows,
            updatedRows: result.updatedRows,
            deletedRows: result.deletedRows,
            skippedRows: result.skippedRows,
            errors: result.errors,
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[SyncWorker] Job ${job.id} failed:`, message);

        // Update data source with error info
        try {
            const recentFailures = await prisma.syncJob.count({
                where: {
                    dataSourceId,
                    status: 'FAILED',
                    createdAt: { gte: new Date(Date.now() - 86400000) },
                },
            });

            if (recentFailures >= 3) {
                await prisma.dataSource.update({
                    where: { id: dataSourceId },
                    data: {
                        syncStatus: 'ERROR',
                        syncError: `Auto-paused after ${recentFailures} failures: ${message}`,
                    },
                });
                console.log(`[SyncWorker] Data source ${dataSourceId} auto-paused after ${recentFailures} failures`);
            }
        } catch (dbError) {
            console.error('[SyncWorker] Failed to update error status:', dbError);
        }

        throw error; // Re-throw so BullMQ marks the job as failed and retries
    }
}

// ─── Worker Factory ───

export interface WorkerOptions {
    concurrency?: number;
}

/**
 * Create and start the sync worker.
 * Call this from the worker entry point.
 */
export function createSyncWorker(options: WorkerOptions = {}): Worker<SyncJobPayload, SyncJobResult> {
    const concurrency = options.concurrency ?? parseInt(process.env.WORKER_CONCURRENCY || '3', 10);

    const worker = new Worker<SyncJobPayload, SyncJobResult>(
        SYNC_QUEUE_NAME,
        processSyncJob,
        {
            connection: { url: process.env.REDIS_URL!, maxRetriesPerRequest: null },
            concurrency,
            // Stalled job detection: if a job doesn't report progress
            // within this window, it's considered stalled and retried
            stalledInterval: 120_000,   // Check every 2 minutes
            maxStalledCount: 2,         // Retry stalled jobs max 2 times
        }
    );

    // ─── Event Handlers ───

    worker.on('completed', (job, result) => {
        console.log(
            `[SyncWorker] ✅ ${job.id} completed: ${result.fetched} records, ${result.newRows} new`
        );
    });

    worker.on('failed', (job, err) => {
        const attempts = job?.attemptsMade ?? 0;
        const maxAttempts = job?.opts?.attempts ?? 3;
        console.error(
            `[SyncWorker] ❌ ${job?.id} failed (attempt ${attempts}/${maxAttempts}):`,
            err.message
        );
    });

    worker.on('stalled', (jobId) => {
        console.warn(`[SyncWorker] ⚠️ Job ${jobId} stalled — will be retried`);
    });

    worker.on('error', (err) => {
        console.error('[SyncWorker] Worker error:', err.message);
    });

    console.log(`[SyncWorker] Started with concurrency=${concurrency}`);

    return worker;
}
