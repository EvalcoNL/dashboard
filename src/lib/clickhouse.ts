// ═══════════════════════════════════════════════════════════════════
// ClickHouse Client — Analytical Data Store
// Singleton client for all ClickHouse operations
// ═══════════════════════════════════════════════════════════════════

import { createClient } from '@clickhouse/client';

// ─── Singleton Client ───

let _client: ReturnType<typeof createClient> | null = null;

function getClient() {
    if (!_client) {
        _client = createClient({
            url: process.env.CLICKHOUSE_URL || 'http://localhost:8123',
            username: process.env.CLICKHOUSE_USER || 'evalco',
            password: process.env.CLICKHOUSE_PASSWORD || 'evalco_dev',
            database: process.env.CLICKHOUSE_DATABASE || 'evalco',
        });
    }
    return _client;
}

// ─── Query Helper ───

/**
 * Execute a SELECT query and return typed results.
 */
export async function query<T = Record<string, unknown>>(
    sql: string,
    params?: Record<string, unknown>
): Promise<T[]> {
    const client = getClient();
    const result = await client.query({
        query: sql,
        query_params: params,
        format: 'JSONEachRow',
    });
    return result.json<T>();
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

    const client = getClient();
    await client.insert({
        table,
        values: rows,
        format: 'JSONEachRow',
    });
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
        console.error('[ClickHouse] Health check failed:', error);
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
