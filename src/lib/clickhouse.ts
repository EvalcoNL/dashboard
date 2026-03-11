// ═══════════════════════════════════════════════════════════════════
// ClickHouse Client — Analytical Data Store
// Singleton client with retry logic and structured logging
// ═══════════════════════════════════════════════════════════════════

import { createClient } from '@clickhouse/client';
import { clickhouseLogger } from '@/lib/logger';

// ─── Retry Configuration ───

const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 500;

// ─── Singleton Client ───

let _client: ReturnType<typeof createClient> | null = null;

function getClient() {
    if (!_client) {
        _client = createClient({
            url: process.env.CLICKHOUSE_URL || 'http://localhost:8123',
            username: process.env.CLICKHOUSE_USER || 'evalco',
            password: process.env.CLICKHOUSE_PASSWORD || 'evalco_dev',
            database: process.env.CLICKHOUSE_DATABASE || 'evalco',
            request_timeout: 30_000,
            max_open_connections: 10,
            keep_alive: {
                enabled: true,
            },
        });
    }
    return _client;
}

/**
 * Retry a function with exponential backoff for transient errors.
 */
async function withRetry<T>(fn: () => Promise<T>, context?: string): Promise<T> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            const isTransient = isTransientError(error);
            if (!isTransient || attempt === MAX_RETRIES) {
                if (attempt > 1) {
                    clickhouseLogger.error({ err: error, attempt, context }, 'Query failed after retries');
                }
                throw error;
            }
            const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
            clickhouseLogger.warn({ attempt, delay, context }, 'Transient error, retrying');
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    throw lastError;
}

/**
 * Check if an error is transient (network/timeout) and worth retrying.
 */
function isTransientError(error: unknown): boolean {
    if (error instanceof Error) {
        const msg = error.message.toLowerCase();
        return (
            msg.includes('econnreset') ||
            msg.includes('econnrefused') ||
            msg.includes('etimedout') ||
            msg.includes('socket hang up') ||
            msg.includes('timeout') ||
            msg.includes('network')
        );
    }
    return false;
}

// ─── Query Helper ───

/**
 * Execute a SELECT query and return typed results.
 */
export async function query<T = Record<string, unknown>>(
    sql: string,
    params?: Record<string, unknown>
): Promise<T[]> {
    return withRetry(async () => {
        const client = getClient();
        const result = await client.query({
            query: sql,
            query_params: params,
            format: 'JSONEachRow',
        });
        return result.json<T>();
    }, 'query');
}

/**
 * Execute a query that returns a single row (e.g. COUNT).
 */
export async function queryOne<T = Record<string, unknown>>(
    sql: string,
    params?: Record<string, unknown>
): Promise<T | null> {
    const rows = await query<T>(sql, params);
    return rows[0] ?? null;
}

// ─── Insert Helper ───

/**
 * Batch insert rows into a ClickHouse table.
 * Uses JSONEachRow format for maximum flexibility.
 */
export async function insert(
    table: string,
    rows: Record<string, unknown>[]
): Promise<void> {
    if (rows.length === 0) return;

    return withRetry(async () => {
        const client = getClient();
        await client.insert({
            table,
            values: rows,
            format: 'JSONEachRow',
        });
    }, `insert:${table}`);
}

// ─── Command Helper ───

/**
 * Execute a command (CREATE, ALTER, DROP, etc.) that doesn't return data.
 */
export async function command(sql: string): Promise<void> {
    const client = getClient();
    await client.command({ query: sql });
}

// ─── Health Check ───

/**
 * Check if ClickHouse is reachable and responding.
 */
export async function healthCheck(): Promise<boolean> {
    try {
        const result = await queryOne<{ ok: number }>('SELECT 1 AS ok');
        return result?.ok === 1;
    } catch (error) {
        clickhouseLogger.error({ err: error }, 'Health check failed');
        return false;
    }
}

// ─── Cached DESCRIBE TABLE ───

/**
 * Cache for DESCRIBE TABLE results.
 * Schema metadata rarely changes, so we cache for 5 minutes.
 */
const describeCache = new Map<string, { data: any[]; expiresAt: number }>();
const DESCRIBE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get table schema (cached).
 * Avoids repeated DESCRIBE TABLE calls which are unnecessary when schema is stable.
 */
export async function describeTable<T = { name: string; type: string }>(
    table: string
): Promise<T[]> {
    const cached = describeCache.get(table);
    if (cached && Date.now() < cached.expiresAt) {
        return cached.data as T[];
    }

    const result = await query<T>(`DESCRIBE TABLE ${table}`);
    describeCache.set(table, { data: result, expiresAt: Date.now() + DESCRIBE_CACHE_TTL });
    return result;
}

/** Clear the describe cache (e.g. after schema migration). */
export function clearDescribeCache() {
    describeCache.clear();
}

// ─── Exports ───

export const clickhouse = {
    query,
    queryOne,
    insert,
    command,
    healthCheck,
    getClient,
    describeTable,
    clearDescribeCache,
};
