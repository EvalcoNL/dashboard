import { describe, it, expect } from 'vitest';

/**
 * Tests for the sync engine date range calculation logic.
 * 
 * These are pure logic tests that verify how the sync engine
 * determines date ranges for different sync modes.
 */

// ─── Replicate the date logic from SyncEngine ───

function calculateDateRange(params: {
    mode: 'INCREMENTAL' | 'FULL' | 'DELTA';
    lastSyncedAt: Date | null;
    lookbackDays: number;
    attributionWindowDays: number;
    maxLookbackDays: number;
    dateFrom?: Date;
    dateTo?: Date;
}): { dateFrom: Date; dateTo: Date } {
    const { mode, lastSyncedAt, lookbackDays, attributionWindowDays, maxLookbackDays, dateFrom: overrideDateFrom, dateTo: overrideDateTo } = params;

    const dateTo = overrideDateTo || new Date();
    let dateFrom: Date;

    switch (mode) {
        case 'FULL':
            dateFrom = overrideDateFrom || (() => {
                const d = new Date();
                d.setDate(d.getDate() - maxLookbackDays);
                return d;
            })();
            break;

        case 'DELTA':
            dateFrom = overrideDateFrom || (() => {
                const d = new Date();
                d.setDate(d.getDate() - attributionWindowDays);
                return d;
            })();
            break;

        case 'INCREMENTAL':
        default:
            if (lastSyncedAt) {
                dateFrom = overrideDateFrom || (() => {
                    const d = new Date(lastSyncedAt);
                    d.setDate(d.getDate() - attributionWindowDays);
                    return d;
                })();
            } else {
                dateFrom = overrideDateFrom || (() => {
                    const d = new Date();
                    d.setDate(d.getDate() - lookbackDays);
                    return d;
                })();
            }
            break;
    }

    return { dateFrom, dateTo };
}

describe('SyncEngine date range calculation', () => {
    const today = new Date('2026-03-11T12:00:00Z');
    const defaultParams = {
        lastSyncedAt: null,
        lookbackDays: 30,
        attributionWindowDays: 7,
        maxLookbackDays: 365,
        dateTo: today,
    };

    describe('INCREMENTAL mode', () => {
        it('uses lookbackDays for first-ever sync', () => {
            const { dateFrom } = calculateDateRange({
                ...defaultParams,
                mode: 'INCREMENTAL',
            });
            const expectedDays = 30;
            const diffDays = Math.round((today.getTime() - dateFrom.getTime()) / (1000 * 60 * 60 * 24));
            expect(diffDays).toBe(expectedDays);
        });

        it('uses lastSyncedAt minus attribution window for subsequent syncs', () => {
            const lastSynced = new Date('2026-03-09T12:00:00Z');
            const { dateFrom } = calculateDateRange({
                ...defaultParams,
                mode: 'INCREMENTAL',
                lastSyncedAt: lastSynced,
            });
            const expected = new Date('2026-03-02T12:00:00Z'); // 9 - 7 = 2 maart
            expect(dateFrom.toISOString().slice(0, 10)).toBe(expected.toISOString().slice(0, 10));
        });

        it('respects explicit dateFrom override', () => {
            const override = new Date('2026-01-01');
            const { dateFrom } = calculateDateRange({
                ...defaultParams,
                mode: 'INCREMENTAL',
                dateFrom: override,
            });
            expect(dateFrom).toBe(override);
        });
    });

    describe('FULL mode', () => {
        it('uses maxLookbackDays', () => {
            const { dateFrom } = calculateDateRange({
                ...defaultParams,
                mode: 'FULL',
            });
            const diffDays = Math.round((today.getTime() - dateFrom.getTime()) / (1000 * 60 * 60 * 24));
            expect(diffDays).toBe(365);
        });

        it('ignores lastSyncedAt', () => {
            const { dateFrom } = calculateDateRange({
                ...defaultParams,
                mode: 'FULL',
                lastSyncedAt: new Date('2026-03-10'),
            });
            const diffDays = Math.round((today.getTime() - dateFrom.getTime()) / (1000 * 60 * 60 * 24));
            expect(diffDays).toBe(365);
        });
    });

    describe('DELTA mode', () => {
        it('uses attribution window days', () => {
            const { dateFrom } = calculateDateRange({
                ...defaultParams,
                mode: 'DELTA',
            });
            const diffDays = Math.round((today.getTime() - dateFrom.getTime()) / (1000 * 60 * 60 * 24));
            expect(diffDays).toBe(7);
        });
    });

    describe('dateTo', () => {
        it('defaults to now when not specified', () => {
            const { dateTo } = calculateDateRange({
                ...defaultParams,
                dateTo: undefined,
                mode: 'INCREMENTAL',
            });
            // Should be approximately now (within 1 second)
            expect(Math.abs(dateTo.getTime() - Date.now())).toBeLessThan(1000);
        });

        it('uses explicit dateTo when specified', () => {
            const explicit = new Date('2026-02-28');
            const { dateTo } = calculateDateRange({
                ...defaultParams,
                dateTo: explicit,
                mode: 'INCREMENTAL',
            });
            expect(dateTo).toBe(explicit);
        });
    });
});
