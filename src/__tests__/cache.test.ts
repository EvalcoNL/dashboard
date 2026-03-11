import { describe, it, expect, beforeEach, vi } from 'vitest';
import { cached, invalidateCache, invalidateCacheByPrefix, clearCache, cacheStats } from '@/lib/cache';

/**
 * Tests for the in-memory TTL cache module.
 */

describe('cache', () => {
    beforeEach(() => {
        clearCache();
    });

    describe('cached()', () => {
        it('calls fetcher on first access', async () => {
            const fetcher = vi.fn().mockResolvedValue('result');
            const result = await cached('key1', fetcher);
            expect(result).toBe('result');
            expect(fetcher).toHaveBeenCalledOnce();
        });

        it('returns cached value on second access', async () => {
            const fetcher = vi.fn().mockResolvedValue('result');
            await cached('key2', fetcher, 60_000);
            const result = await cached('key2', fetcher, 60_000);
            expect(result).toBe('result');
            expect(fetcher).toHaveBeenCalledOnce(); // NOT called twice
        });

        it('re-fetches after TTL expires', async () => {
            const fetcher = vi.fn()
                .mockResolvedValueOnce('first')
                .mockResolvedValueOnce('second');

            const result1 = await cached('key3', fetcher, 1); // 1ms TTL
            expect(result1).toBe('first');

            // Wait for TTL to expire
            await new Promise(resolve => setTimeout(resolve, 10));

            const result2 = await cached('key3', fetcher, 1);
            expect(result2).toBe('second');
            expect(fetcher).toHaveBeenCalledTimes(2);
        });

        it('handles different keys independently', async () => {
            const fetcherA = vi.fn().mockResolvedValue('A');
            const fetcherB = vi.fn().mockResolvedValue('B');

            const a = await cached('keyA', fetcherA);
            const b = await cached('keyB', fetcherB);

            expect(a).toBe('A');
            expect(b).toBe('B');
            expect(fetcherA).toHaveBeenCalledOnce();
            expect(fetcherB).toHaveBeenCalledOnce();
        });
    });

    describe('invalidateCache()', () => {
        it('removes a specific key', async () => {
            const fetcher = vi.fn()
                .mockResolvedValueOnce('first')
                .mockResolvedValueOnce('second');

            await cached('del-key', fetcher, 60_000);
            invalidateCache('del-key');

            const result = await cached('del-key', fetcher, 60_000);
            expect(result).toBe('second');
            expect(fetcher).toHaveBeenCalledTimes(2);
        });
    });

    describe('invalidateCacheByPrefix()', () => {
        it('removes all keys matching the prefix', async () => {
            const fetcher = vi.fn().mockResolvedValue('data');

            await cached('project:1:metrics', fetcher, 60_000);
            await cached('project:1:campaigns', fetcher, 60_000);
            await cached('project:2:metrics', fetcher, 60_000);

            invalidateCacheByPrefix('project:1');

            const stats = cacheStats();
            expect(stats.size).toBe(1);
            expect(stats.keys).toEqual(['project:2:metrics']);
        });
    });

    describe('clearCache()', () => {
        it('removes all entries', async () => {
            const fetcher = vi.fn().mockResolvedValue('data');
            await cached('a', fetcher);
            await cached('b', fetcher);

            clearCache();

            const stats = cacheStats();
            expect(stats.size).toBe(0);
        });
    });

    describe('cacheStats()', () => {
        it('returns accurate stats', async () => {
            const fetcher = vi.fn().mockResolvedValue('data');
            await cached('stat1', fetcher, 60_000);
            await cached('stat2', fetcher, 60_000);

            const stats = cacheStats();
            expect(stats.size).toBe(2);
            expect(stats.keys).toContain('stat1');
            expect(stats.keys).toContain('stat2');
        });

        it('cleans expired entries during stats call', async () => {
            const fetcher = vi.fn().mockResolvedValue('data');
            await cached('expired', fetcher, 1); // 1ms TTL

            await new Promise(resolve => setTimeout(resolve, 10));

            const stats = cacheStats();
            expect(stats.size).toBe(0);
        });
    });
});
