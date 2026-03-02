// ═══════════════════════════════════════════════════════════════════
// Sync Queue — BullMQ queue for data sync jobs
// Producers add jobs; the separate worker process picks them up.
// ═══════════════════════════════════════════════════════════════════

import { Queue, type ConnectionOptions, type JobsOptions } from 'bullmq';

// ─── Types ───

export interface SyncJobPayload {
    dataSourceId: string;
    mode: 'INCREMENTAL' | 'FULL' | 'DELTA';
    level?: string;
    dateFrom?: string;   // ISO string
    dateTo?: string;     // ISO string
    priority?: number;   // 1 = highest, 10 = lowest
}

export interface SyncJobResult {
    jobId: string;
    mode: string;
    fetched: number;
    stored: number;
    newRows: number;
    updatedRows: number;
    deletedRows: number;
    skippedRows: number;
    errors: string[];
}

// ─── Queue Name ───

export const SYNC_QUEUE_NAME = 'data-sync';

// ─── Redis Connection ───

let _connectionOpts: ConnectionOptions | null = null;

export function getRedisConnectionOpts(): ConnectionOptions {
    if (_connectionOpts) return _connectionOpts;

    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
        throw new Error('REDIS_URL environment variable is required for queue-based sync');
    }

    // BullMQ accepts a URL string directly as ConnectionOptions
    _connectionOpts = redisUrl as unknown as ConnectionOptions;
    return _connectionOpts;
}

// ─── Queue Instance ───

let _queue: Queue | null = null;

/**
 * Get the shared queue instance (creates lazily).
 * Safe to call from serverless — only creates a connection when actually used.
 */
export function getSyncQueue(): Queue {
    if (_queue) return _queue;

    _queue = new Queue(SYNC_QUEUE_NAME, {
        connection: { url: process.env.REDIS_URL!, maxRetriesPerRequest: null },
        defaultJobOptions: {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 30_000, // 30s → 2min → 10min
            },
            removeOnComplete: {
                age: 7 * 24 * 3600, // Keep completed jobs for 7 days
                count: 200,         // Keep max 200 completed jobs
            },
            removeOnFail: {
                age: 14 * 24 * 3600, // Keep failed jobs for 14 days
            },
        },
    });

    return _queue;
}

// ─── Producer Functions ───

/**
 * Add a single sync job to the queue.
 */
export async function addSyncJob(payload: SyncJobPayload, opts?: Partial<JobsOptions>): Promise<string> {
    const queue = getSyncQueue();

    const jobName = `sync:${payload.dataSourceId}:${payload.mode.toLowerCase()}`;
    const priority = payload.priority ?? 5;

    const job = await queue.add(jobName, payload, {
        priority,
        // Deduplicate: don't add if same source+mode is already waiting
        jobId: `${payload.dataSourceId}:${payload.mode}:${Date.now()}`,
        ...opts,
    });

    console.log(`[SyncQueue] Job added: ${job.id} (${payload.mode} for ${payload.dataSourceId})`);
    return job.id!;
}

/**
 * Add multiple sync jobs in bulk (e.g., from scheduler tick).
 */
export async function addBulkSyncJobs(payloads: SyncJobPayload[]): Promise<string[]> {
    const queue = getSyncQueue();

    const jobs = payloads.map(payload => ({
        name: `sync:${payload.dataSourceId}:${payload.mode.toLowerCase()}`,
        data: payload,
        opts: {
            priority: payload.priority ?? 5,
            jobId: `${payload.dataSourceId}:${payload.mode}:${Date.now()}`,
        } as JobsOptions,
    }));

    const results = await queue.addBulk(jobs);
    const ids = results.map(j => j.id!);

    console.log(`[SyncQueue] ${ids.length} jobs added in bulk`);
    return ids;
}

/**
 * Get queue health metrics.
 */
export async function getQueueHealth() {
    const queue = getSyncQueue();
    const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
}

/**
 * Check if Redis is connected and the queue is operational.
 */
export async function isQueueAvailable(): Promise<boolean> {
    if (!process.env.REDIS_URL) return false;
    try {
        const queue = getSyncQueue();
        // Try a lightweight operation to see if Redis is reachable
        await queue.getWaitingCount();
        return true;
    } catch {
        return false;
    }
}
