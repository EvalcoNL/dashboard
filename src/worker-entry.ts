#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════
// Worker Entry Point — Run this as a standalone process
//
// Usage:
//   npm run worker:dev                             (development)
//   npm run worker:start                           (production)
//
// Environment:
//   REDIS_URL             — Redis connection string (required)
//   WORKER_CONCURRENCY    — Max parallel sync jobs (default: 3)
//   DATABASE_URL          — SQLite connection string
// ═══════════════════════════════════════════════════════════════════

import { createSyncWorker } from '@/lib/data-integration/sync-worker';
import { getSyncQueue, getQueueHealth, isQueueAvailable } from '@/lib/data-integration/sync-queue';
import { workerLogger } from '@/lib/logger';

// Register all connectors so sync-engine can find them
import '@/lib/data-integration/connectors';

async function main() {
    workerLogger.info('════════════════════════════════════════════');
    workerLogger.info('  Evalco Sync Worker starting');
    workerLogger.info('════════════════════════════════════════════');

    // Verify Redis
    if (!process.env.REDIS_URL) {
        workerLogger.fatal('REDIS_URL environment variable is not set');
        process.exit(1);
    }

    const available = await isQueueAvailable();
    if (!available) {
        workerLogger.fatal('Cannot connect to Redis — check REDIS_URL');
        process.exit(1);
    }
    workerLogger.info('Redis connected');

    // Show queue state
    const health = await getQueueHealth();
    workerLogger.info({ waiting: health.waiting, active: health.active, failed: health.failed }, 'Queue state');

    // Start the worker
    const worker = createSyncWorker();

    // Graceful shutdown
    const shutdown = async (signal: string) => {
        workerLogger.info({ signal }, 'Graceful shutdown initiated');

        // Close worker (waits for active jobs to finish)
        await worker.close();
        workerLogger.info('Worker closed');

        // Close queue connection
        const queue = getSyncQueue();
        await queue.close();
        workerLogger.info('Queue closed');

        process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Periodic health logging
    setInterval(async () => {
        try {
            const h = await getQueueHealth();
            if (h.waiting > 0 || h.active > 0) {
                workerLogger.info({ waiting: h.waiting, active: h.active, completed: h.completed, failed: h.failed }, 'Health check');
            }
        } catch { /* ignore */ }
    }, 60_000); // Log every minute

    workerLogger.info('Ready — waiting for jobs');
}

main().catch((err) => {
    workerLogger.fatal({ err }, 'Fatal error');
    process.exit(1);
});
