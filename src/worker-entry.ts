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

// Register all connectors so sync-engine can find them
import '@/lib/data-integration/connectors';

async function main() {
    console.log('');
    console.log('════════════════════════════════════════════');
    console.log('  Evalco Sync Worker');
    console.log('════════════════════════════════════════════');
    console.log('');

    // Verify Redis
    if (!process.env.REDIS_URL) {
        console.error('[Worker] ❌ REDIS_URL environment variable is not set');
        process.exit(1);
    }

    const available = await isQueueAvailable();
    if (!available) {
        console.error('[Worker] ❌ Cannot connect to Redis. Check REDIS_URL.');
        process.exit(1);
    }
    console.log('[Worker] Redis connected ✅');

    // Show queue state
    const health = await getQueueHealth();
    console.log(`[Worker] Queue state: ${health.waiting} waiting, ${health.active} active, ${health.failed} failed`);

    // Start the worker
    const worker = createSyncWorker();

    // Graceful shutdown
    const shutdown = async (signal: string) => {
        console.log(`\n[Worker] ${signal} received — shutting down gracefully...`);

        // Close worker (waits for active jobs to finish)
        await worker.close();
        console.log('[Worker] Worker closed');

        // Close queue connection
        const queue = getSyncQueue();
        await queue.close();
        console.log('[Worker] Queue closed');

        process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Periodic health logging
    setInterval(async () => {
        try {
            const h = await getQueueHealth();
            if (h.waiting > 0 || h.active > 0) {
                console.log(`[Worker] Health: ${h.waiting} waiting, ${h.active} active, ${h.completed} completed, ${h.failed} failed`);
            }
        } catch { /* ignore */ }
    }, 60_000); // Log every minute

    console.log('[Worker] Ready — waiting for jobs...');
    console.log('');
}

main().catch((err) => {
    console.error('[Worker] Fatal error:', err);
    process.exit(1);
});
