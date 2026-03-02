// ═══════════════════════════════════════════════════════════════════
// Base Connector — Abstract implementation with common functionality
// ═══════════════════════════════════════════════════════════════════

import type {
    IDataConnector,
    ConnectorCategory,
    AuthType,
    AuthResult,
    DiscoveredAccount,
    DataLevel,
    FetchConfig,
    FetchResponse,
    DimensionMapping,
    MetricMapping,
} from '@/types/data-integration';

/**
 * Abstract base class for all data connectors.
 * Provides common functionality like rate limiting, retry logic, and error handling.
 * Each platform connector extends this class to implement platform-specific logic.
 */
export abstract class BaseConnector implements IDataConnector {
    abstract readonly slug: string;
    abstract readonly name: string;
    abstract readonly category: ConnectorCategory;
    abstract readonly authType: AuthType;

    // Rate limiting configuration
    protected rateLimitPerMinute = 60;
    private requestTimestamps: number[] = [];

    // ─── Authentication ───

    async getAuthUrl?(redirectUri: string, state?: string): Promise<string>;

    abstract authenticate(params: Record<string, string>): Promise<AuthResult>;

    abstract testConnection(credentials: string): Promise<boolean>;

    async refreshAccessToken?(credentials: string): Promise<AuthResult>;

    // ─── Discovery ───

    abstract getAvailableAccounts(credentials: string): Promise<DiscoveredAccount[]>;

    // ─── Levels & Defaults ───

    abstract getSupportedLevels(): DataLevel[];

    getDefaultDimensions(level: string): string[] {
        const lvl = this.getSupportedLevels().find(l => l.slug === level);
        return lvl?.defaultDimensions ?? [];
    }

    getOptionalDimensions(level: string): string[] {
        const lvl = this.getSupportedLevels().find(l => l.slug === level);
        return lvl?.optionalDimensions ?? [];
    }

    getDefaultMetrics(level: string): string[] {
        const lvl = this.getSupportedLevels().find(l => l.slug === level);
        return lvl?.defaultMetrics ?? [];
    }

    getOptionalMetrics(level: string): string[] {
        const lvl = this.getSupportedLevels().find(l => l.slug === level);
        return lvl?.optionalMetrics ?? [];
    }

    /** Convenience: get all dimensions (default + optional) for a level */
    getAllDimensions(level: string): string[] {
        return [...this.getDefaultDimensions(level), ...this.getOptionalDimensions(level)];
    }

    /** Convenience: get all metrics (default + optional) for a level */
    getAllMetrics(level: string): string[] {
        return [...this.getDefaultMetrics(level), ...this.getOptionalMetrics(level)];
    }

    /**
     * Days to re-fetch during incremental sync for attribution changes.
     * Override in connectors where conversions arrive late (e.g., Google Ads).
     */
    getAttributionWindowDays(): number {
        return 3; // Conservative default
    }

    /**
     * Maximum lookback days for full resync.
     */
    getMaxLookbackDays(): number {
        return 90;
    }

    // ─── Data Fetching ───

    abstract fetchData(credentials: string, config: FetchConfig): Promise<FetchResponse>;

    // ─── Field Mapping ───

    abstract getDimensionMappings(): DimensionMapping[];

    abstract getMetricMappings(): MetricMapping[];

    // ─── Common Utilities ───

    /**
     * Simple rate limiter — waits if we've exceeded the rate limit
     */
    protected async rateLimit(): Promise<void> {
        const now = Date.now();
        const windowStart = now - 60_000;

        // Remove timestamps older than 1 minute
        this.requestTimestamps = this.requestTimestamps.filter(t => t > windowStart);

        if (this.requestTimestamps.length >= this.rateLimitPerMinute) {
            const oldestInWindow = this.requestTimestamps[0];
            const waitMs = oldestInWindow + 60_000 - now;
            if (waitMs > 0) {
                await new Promise(resolve => setTimeout(resolve, waitMs));
            }
        }

        this.requestTimestamps.push(Date.now());
    }

    /**
     * Retry with exponential backoff
     */
    protected async retryWithBackoff<T>(
        fn: () => Promise<T>,
        maxRetries = 3,
        baseDelayMs = 1000
    ): Promise<T> {
        let lastError: Error | undefined;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                await this.rateLimit();
                return await fn();
            } catch (error) {
                lastError = error as Error;

                if (attempt < maxRetries) {
                    const delay = baseDelayMs * Math.pow(2, attempt);
                    const jitter = Math.random() * delay * 0.1;
                    await new Promise(resolve => setTimeout(resolve, delay + jitter));
                }
            }
        }

        throw lastError;
    }

    /**
     * Parse encrypted credentials JSON
     */
    protected parseCredentials<T>(credentials: string): T {
        try {
            return JSON.parse(credentials) as T;
        } catch {
            throw new Error(`Failed to parse credentials for ${this.name} connector`);
        }
    }

    /**
     * Format a date to YYYY-MM-DD string
     */
    protected formatDate(date: Date): string {
        return date.toISOString().split('T')[0];
    }

    /**
     * Generate date ranges for chunked fetching
     */
    protected generateDateChunks(
        dateFrom: Date,
        dateTo: Date,
        chunkSizeDays = 30
    ): Array<{ from: Date; to: Date }> {
        const chunks: Array<{ from: Date; to: Date }> = [];
        let current = new Date(dateFrom);

        while (current <= dateTo) {
            const chunkEnd = new Date(current);
            chunkEnd.setDate(chunkEnd.getDate() + chunkSizeDays - 1);

            chunks.push({
                from: new Date(current),
                to: chunkEnd > dateTo ? new Date(dateTo) : chunkEnd,
            });

            current = new Date(chunkEnd);
            current.setDate(current.getDate() + 1);
        }

        return chunks;
    }
}
