// ═══════════════════════════════════════════════════════════════════
// Sync Engine — Orchestrates data fetching across all data sources
// Supports 3 modes: INCREMENTAL, FULL, DELTA
// ═══════════════════════════════════════════════════════════════════

import { prisma } from '@/lib/db';
import { connectorRegistry } from './connector-registry';
import { normalizationService } from './normalization-service';
import { ecomNormalizationService } from './ecommerce-normalization-service';
import { command } from '@/lib/clickhouse';
import '@/lib/data-integration/connectors'; // Auto-registers all connectors
import { decrypt } from '@/lib/encryption';
import type { SyncJobStatus } from '@/types/data-integration';

export type SyncMode = 'INCREMENTAL' | 'FULL' | 'DELTA';

interface SyncOptions {
    dataSourceId: string;
    mode?: SyncMode;
    level?: string;
    dateFrom?: Date;
    dateTo?: Date;
    force?: boolean;
}

interface SyncResult {
    jobId: string;
    mode: SyncMode;
    fetched: number;
    stored: number;
    newRows: number;
    updatedRows: number;
    deletedRows: number;
    skippedRows: number;
    errors: string[];
}

/**
 * The Sync Engine orchestrates data fetching from platform connectors.
 * It creates sync jobs, manages their lifecycle, and delegates to the
 * normalization service for data storage.
 *
 * Modes:
 * - INCREMENTAL: Only fetch data since last sync (+ attribution window)
 * - FULL: Delete all existing data and re-fetch everything
 * - DELTA: Fetch recent data and compare row-by-row, skip unchanged
 */
export class SyncEngine {

    /**
     * Run a sync for a specific data source
     */
    async syncDataSource(options: SyncOptions): Promise<SyncResult> {
        const mode = options.mode || 'INCREMENTAL';

        const dataSource = await prisma.dataSource.findUnique({
            where: { id: options.dataSourceId },
            include: {
                connector: true,
                syncAccounts: { where: { isActive: true } },
            },
        });

        if (!dataSource) throw new Error(`DataSource ${options.dataSourceId} not found`);
        if (dataSource.syncStatus !== 'ACTIVE') throw new Error(`DataSource ${options.dataSourceId} sync is not active (status: ${dataSource.syncStatus})`);
        if (!dataSource.connector) throw new Error(`DataSource ${options.dataSourceId} has no connector linked`);

        const connector = connectorRegistry.getOrThrow(dataSource.connector.slug);
        const isEcommerce = connector.category === 'ECOMMERCE';
        const supportedLevels = connector.getSupportedLevels();

        const levelsToSync = options.level
            ? [supportedLevels.find(l => l.slug === options.level)!].filter(Boolean)
            : supportedLevels;

        // ─── Determine date range based on mode ───
        const dateTo = options.dateTo || new Date();
        let dateFrom: Date;

        switch (mode) {
            case 'FULL':
                // Full resync: use max lookback
                dateFrom = options.dateFrom || (() => {
                    const d = new Date();
                    d.setDate(d.getDate() - connector.getMaxLookbackDays());
                    return d;
                })();
                break;

            case 'DELTA':
                // Delta: only last few days (attribution window)
                dateFrom = options.dateFrom || (() => {
                    const d = new Date();
                    d.setDate(d.getDate() - connector.getAttributionWindowDays());
                    return d;
                })();
                break;

            case 'INCREMENTAL':
            default:
                // Incremental: from last sync minus attribution window
                if (dataSource.lastSyncedAt) {
                    dateFrom = options.dateFrom || (() => {
                        const d = new Date(dataSource.lastSyncedAt!);
                        d.setDate(d.getDate() - connector.getAttributionWindowDays());
                        return d;
                    })();
                } else {
                    // First sync ever: use lookback days from data source config
                    dateFrom = options.dateFrom || (() => {
                        const d = new Date();
                        d.setDate(d.getDate() - dataSource.lookbackDays);
                        return d;
                    })();
                }
                break;
        }

        // Create sync job
        const syncJob = await prisma.syncJob.create({
            data: {
                dataSourceId: dataSource.id,
                syncMode: mode,
                level: levelsToSync.map(l => l.slug).join(','),
                dateFrom,
                dateTo,
                status: 'RUNNING' as SyncJobStatus,
                startedAt: new Date(),
            },
        });

        try {
            // ─── FULL mode: delete all existing data first ───
            if (mode === 'FULL') {
                const targetTable = isEcommerce ? 'order_data' : 'metrics_data';
                await this.log(syncJob.id, 'INFO', `FULL RESYNC: Deleting all data in ${targetTable} for data source ${dataSource.id}`);
                await command(`
                    ALTER TABLE ${targetTable} DELETE
                    WHERE data_source_id = '${dataSource.id}'
                `);
                // Wait for mutation to complete
                await this.waitForMutations();
                await this.log(syncJob.id, 'INFO', 'Existing data deleted, starting fresh fetch');
            }

            let totalFetched = 0;
            let totalStored = 0;
            let totalNew = 0;
            let totalUpdated = 0;
            let totalDeleted = 0;
            let totalSkipped = 0;
            const levelErrors: string[] = [];

            for (const level of levelsToSync) {
                if (!level) continue;

                // Only use default dimensions for sync — optional dimensions cause data
                // fragmentation with non-additive metrics (e.g., active_users is unique count
                // and cannot be summed across dimension breakdowns)
                const dimensions = [...level.defaultDimensions];
                const metrics = [...level.defaultMetrics];

                await this.log(syncJob.id, 'INFO',
                    `[${mode}] Syncing level: ${level.name} (${dimensions.length} dims, ${metrics.length} metrics, ` +
                    `${dateFrom.toISOString().split('T')[0]} → ${dateTo.toISOString().split('T')[0]})`
                );

                for (const account of dataSource.syncAccounts) {
                    await this.log(syncJob.id, 'INFO', `Fetching data for account: ${account.name || account.externalId}`);

                    try {
                        // Decrypt the token (backward compatible with unencrypted tokens)
                        const decryptedToken = decrypt(dataSource.token);
                        let credentials = decryptedToken;
                        try {
                            JSON.parse(credentials);
                        } catch {
                            const configObj = (dataSource.config as Record<string, unknown>) || {};
                            credentials = JSON.stringify({
                                refreshToken: decryptedToken,
                                loginCustomerId: configObj.loginCustomerId || undefined,
                            });
                        }

                        const response = await connector.fetchData(credentials, {
                            accountId: account.externalId,
                            level: level.slug,
                            dateFrom,
                            dateTo,
                            dimensions,
                            metrics,
                        });

                        totalFetched += response.totalRows;

                        if (isEcommerce) {
                            // ─── E-commerce flow: store directly via ecomNormalizationService ───
                            // Convert FetchResponse rows → EcomRawOrder[]
                            const orders = response.rows.map(row => ({
                                recordType: (String(row.dimensions?._record_type || 'order') as 'order' | 'line_item'),
                                dimensions: row.dimensions || {},
                                metrics: row.metrics || {},
                            }));

                            const result = await ecomNormalizationService.normalizeAndStore({
                                dataSourceId: dataSource.id,
                                projectId: dataSource.projectId,
                                connectorSlug: dataSource.connector!.slug,
                                piiEnabled: (dataSource as any).piiEnabled || false,
                                orders,
                            });

                            totalStored += result.storedCount;
                            totalNew += result.storedCount;
                        } else {
                            // ─── Ads/analytics flow: group by date, store via normalizationService ───
                            const rowsByDate = new Map<string, typeof response.rows>();
                            for (const row of response.rows) {
                                const d = row.dimensions;
                                const rawDate = String(
                                    d?.date || d?.Date ||                    // canonical / Google Ads
                                    d?.date_start ||                         // Meta
                                    d?.TimePeriod ||                         // Microsoft Ads
                                    d?.['dateRange.start'] ||                // LinkedIn
                                    d?.created_at || d?.orderDateTime ||     // E-commerce fallback
                                    ''
                                );
                                const dateKey = rawDate.length === 8
                                    ? `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`
                                    : rawDate.slice(0, 10);
                                if (!rowsByDate.has(dateKey)) rowsByDate.set(dateKey, []);
                                rowsByDate.get(dateKey)!.push(row);
                            }

                            const sortedDates = [...rowsByDate.entries()].sort(([a], [b]) => b.localeCompare(a));

                            for (const [dateKey, dayRows] of sortedDates) {
                                const date = dateKey ? new Date(dateKey + 'T00:00:00Z') : dateFrom;
                                if (dayRows.length === 0) continue;

                                const result = await normalizationService.normalizeAndStore({
                                    dataSourceId: dataSource.id,
                                    accountId: account.id,
                                    projectId: dataSource.projectId,
                                    connectorSlug: dataSource.connector!.slug,
                                    level: level.slug,
                                    date,
                                    response: { rows: dayRows, totalRows: dayRows.length },
                                    enableChecksumComparison: mode === 'DELTA',
                                    skipHashComparison: mode === 'FULL',
                                });

                                totalStored += result.storedCount;
                                totalNew += result.newRows || 0;
                                totalUpdated += result.updatedRows || 0;
                                totalDeleted += result.deletedRows || 0;
                                totalSkipped += result.skippedRows || 0;
                            }
                        }

                        await this.log(syncJob.id, 'INFO',
                            `Account ${account.externalId}: fetched ${response.totalRows} rows`
                        );
                    } catch (error) {
                        // Extract readable error message from various error formats
                        let errorMsg = 'Unknown error';
                        if (error instanceof Error) {
                            errorMsg = error.message;
                        } else if (error && typeof error === 'object') {
                            // Google Ads API errors have { errors: [{ message: '...' }] }
                            const errObj = error as Record<string, unknown>;
                            if (Array.isArray(errObj.errors) && errObj.errors.length > 0) {
                                errorMsg = (errObj.errors as Array<{ message?: string }>)
                                    .map(e => e.message || JSON.stringify(e))
                                    .join('; ');
                            } else if (errObj.message) {
                                errorMsg = String(errObj.message);
                            } else {
                                errorMsg = JSON.stringify(error).substring(0, 500);
                            }
                        } else if (error) {
                            errorMsg = String(error);
                        }
                        const shortMsg = `[${level.name}] Account ${account.name || account.externalId}: ${errorMsg}`;
                        levelErrors.push(shortMsg);
                        await this.log(syncJob.id, 'ERROR', shortMsg);
                        console.error(`[SyncEngine] [ERROR] Full error for ${level.name}:`, error);
                    }
                }
            }

            // Store level errors in the job if any occurred
            const hasErrors = levelErrors.length > 0;
            const errorSummary = hasErrors ? levelErrors.join(' | ') : null;

            await prisma.syncJob.update({
                where: { id: syncJob.id },
                data: {
                    status: (hasErrors ? 'COMPLETED_WITH_ERRORS' : 'COMPLETED') as SyncJobStatus,
                    recordsFetched: totalFetched,
                    recordsStored: totalStored,
                    recordsNew: totalNew,
                    recordsUpdated: totalUpdated,
                    recordsDeleted: totalDeleted,
                    recordsSkipped: totalSkipped,
                    errorMessage: errorSummary,
                    completedAt: new Date(),
                },
            });

            // Update data source last sync time
            await prisma.dataSource.update({
                where: { id: dataSource.id },
                data: { lastSyncedAt: new Date() },
            });

            await this.log(syncJob.id, 'INFO',
                `[${mode}] Sync completed: ${totalFetched} fetched, ${totalNew} new, ` +
                `${totalUpdated} updated, ${totalSkipped} skipped, ${totalDeleted} deleted` +
                (hasErrors ? ` (${levelErrors.length} errors)` : '')
            );

            return {
                jobId: syncJob.id,
                mode,
                fetched: totalFetched,
                stored: totalStored,
                newRows: totalNew,
                updatedRows: totalUpdated,
                deletedRows: totalDeleted,
                skippedRows: totalSkipped,
                errors: levelErrors,
            };
        } catch (error) {
            let message = 'Unknown error';
            if (error instanceof Error) {
                message = error.message || error.toString();
                if ((error as any).cause) message += ` (cause: ${(error as any).cause})`;
            } else if (error && typeof error === 'object') {
                message = JSON.stringify(error).substring(0, 500);
            } else if (error) {
                message = String(error);
            }

            await prisma.syncJob.update({
                where: { id: syncJob.id },
                data: {
                    status: 'FAILED' as SyncJobStatus,
                    errorMessage: message,
                    completedAt: new Date(),
                },
            });

            await prisma.dataSource.update({
                where: { id: dataSource.id },
                data: {
                    syncStatus: 'ERROR',
                    syncError: message,
                },
            });

            await this.log(syncJob.id, 'ERROR', `Sync failed: ${message}`);

            return {
                jobId: syncJob.id,
                mode,
                fetched: 0,
                stored: 0,
                newRows: 0,
                updatedRows: 0,
                deletedRows: 0,
                skippedRows: 0,
                errors: [message],
            };
        }
    }

    /**
     * Wait for ClickHouse mutations to complete (max 30s)
     */
    private async waitForMutations(): Promise<void> {
        const maxWait = 30_000;
        const startTime = Date.now();

        while (Date.now() - startTime < maxWait) {
            try {
                // Check if there are any pending mutations
                const result = await import('@/lib/clickhouse').then(m =>
                    m.query<{ count: string }>(
                        `SELECT count() as count FROM system.mutations WHERE is_done = 0 AND database = 'evalco'`
                    )
                );
                const pending = Number(result[0]?.count || 0);
                if (pending === 0) return;
            } catch {
                // Ignore errors during mutation check
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        console.warn('[SyncEngine] Mutation wait timeout (30s), proceeding');
    }

    /**
     * Log a sync event
     */
    private async log(jobId: string, level: string, message: string): Promise<void> {
        console.log(`[SyncEngine] [${level}] ${message}`);
        try {
            await prisma.syncLog.create({
                data: { jobId, level, message },
            });
        } catch {
            // Don't fail the sync if logging fails
        }
    }

    /**
     * Get status of a specific sync job
     */
    async getJobStatus(jobId: string) {
        return prisma.syncJob.findUnique({
            where: { id: jobId },
            include: { logs: { orderBy: { createdAt: 'desc' }, take: 50 } },
        });
    }

    /**
     * Get recent sync jobs for a data source
     */
    async getRecentJobs(dataSourceId: string, limit = 20) {
        return prisma.syncJob.findMany({
            where: { dataSourceId },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
    }
}

export const syncEngine = new SyncEngine();
