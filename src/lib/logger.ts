// ═══════════════════════════════════════════════════════════════════
// Structured Logger — Pino-based logging for all subsystems
//
// Usage:
//   import { logger } from '@/lib/logger';
//   const log = logger.child({ component: 'sync-engine' });
//   log.info({ jobId, connector }, 'Sync completed');
//
// In production: JSON lines → compatible with any log aggregator
// In development: pretty-printed with colors
// ═══════════════════════════════════════════════════════════════════

import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

/**
 * Root logger instance.
 * Create child loggers with `.child({ component: '...' })` for each subsystem.
 */
export const logger = pino({
    level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
    ...(isDev
        ? {
            transport: {
                target: 'pino-pretty',
                options: {
                    colorize: true,
                    translateTime: 'HH:MM:ss',
                    ignore: 'pid,hostname',
                },
            },
        }
        : {}),
    // Add base context to every log line
    base: {
        service: 'evalco',
    },
    // Redact sensitive fields from log output
    redact: [
        'token',
        'password',
        'accessToken',
        'refreshToken',
        'credentials',
        'secret',
        'encryptionKey',
    ],
});

// ─── Convenience child loggers for common subsystems ───

export const syncLogger = logger.child({ component: 'sync-engine' });
export const workerLogger = logger.child({ component: 'worker' });
export const clickhouseLogger = logger.child({ component: 'clickhouse' });
export const apiLogger = logger.child({ component: 'api' });
