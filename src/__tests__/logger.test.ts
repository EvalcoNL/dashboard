import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Tests for the logger module.
 * We test that the logger is configured correctly and child loggers work.
 */

// Mock pino before importing the module
vi.mock('pino', () => {
    const mockChild = vi.fn().mockReturnValue({
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
        fatal: vi.fn(),
        child: vi.fn(),
    });

    const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
        fatal: vi.fn(),
        child: mockChild,
    };

    return {
        default: vi.fn(() => mockLogger),
    };
});

describe('logger', () => {
    beforeEach(() => {
        vi.resetModules();
    });

    it('exports a root logger', async () => {
        const { logger } = await import('@/lib/logger');
        expect(logger).toBeDefined();
        expect(logger.info).toBeDefined();
        expect(logger.error).toBeDefined();
    });

    it('exports pre-configured child loggers', async () => {
        const { syncLogger, workerLogger, clickhouseLogger, apiLogger } = await import('@/lib/logger');

        expect(syncLogger).toBeDefined();
        expect(workerLogger).toBeDefined();
        expect(clickhouseLogger).toBeDefined();
        expect(apiLogger).toBeDefined();
    });

    it('creates child loggers with correct component names', async () => {
        const { logger } = await import('@/lib/logger');

        // The logger.child should have been called with the correct component names
        expect(logger.child).toHaveBeenCalledWith({ component: 'sync-engine' });
        expect(logger.child).toHaveBeenCalledWith({ component: 'worker' });
        expect(logger.child).toHaveBeenCalledWith({ component: 'clickhouse' });
        expect(logger.child).toHaveBeenCalledWith({ component: 'api' });
    });
});
