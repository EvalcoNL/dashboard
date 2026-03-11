// ═══════════════════════════════════════════════════════════════════
// Server-side In-Memory Cache
// Lightweight TTL cache for expensive data fetches
// ═══════════════════════════════════════════════════════════════════

interface CacheEntry<T> {
    data: T;
    expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();

/**
 * Get-or-set cache pattern with TTL.
 * If the key exists and hasn't expired, return cached data.
 * Otherwise, call the fetcher, cache the result, and return it.
 *
 * @param key - Unique cache key
 * @param fetcher - Async function to fetch data on cache miss
 * @param ttlMs - Time-to-live in milliseconds (default: 5 minutes)
 */
export async function cached<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlMs: number = 5 * 60 * 1000
): Promise<T> {
    const existing = store.get(key);
    if (existing && Date.now() < existing.expiresAt) {
        return existing.data as T;
    }

    const data = await fetcher();
    store.set(key, { data, expiresAt: Date.now() + ttlMs });
    return data;
}

/**
 * Invalidate a specific cache key.
 */
export function invalidateCache(key: string): void {
    store.delete(key);
}

/**
 * Invalidate all cache keys matching a prefix.
 * Useful for invalidating all cached data for a project.
 */
export function invalidateCacheByPrefix(prefix: string): void {
    for (const key of store.keys()) {
        if (key.startsWith(prefix)) {
            store.delete(key);
        }
    }
}

/**
 * Clear the entire cache.
 */
export function clearCache(): void {
    store.clear();
}

/**
 * Get cache statistics for debugging.
 */
export function cacheStats(): { size: number; keys: string[] } {
    // Clean expired entries
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
        if (now >= entry.expiresAt) {
            store.delete(key);
        }
    }
    return { size: store.size, keys: Array.from(store.keys()) };
}
