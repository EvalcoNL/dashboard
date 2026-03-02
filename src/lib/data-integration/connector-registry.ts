// ═══════════════════════════════════════════════════════════════════
// Connector Registry — Central registry for all data connectors
// ═══════════════════════════════════════════════════════════════════

import type { IDataConnector, ConnectorCategory } from '@/types/data-integration';

/**
 * Central registry for all platform connectors.
 * Connectors register themselves here, and the rest of the system
 * (sync engine, UI, etc.) discovers connectors through this registry.
 */
class ConnectorRegistry {
    private connectors = new Map<string, IDataConnector>();

    /**
     * Register a connector implementation
     */
    register(connector: IDataConnector): void {
        if (this.connectors.has(connector.slug)) {
            throw new Error(`Connector with slug "${connector.slug}" is already registered`);
        }
        this.connectors.set(connector.slug, connector);
    }

    /**
     * Get a connector by slug
     */
    get(slug: string): IDataConnector | undefined {
        return this.connectors.get(slug);
    }

    /**
     * Get a connector by slug, throw if not found
     */
    getOrThrow(slug: string): IDataConnector {
        const connector = this.connectors.get(slug);
        if (!connector) {
            throw new Error(`Connector "${slug}" not found in registry`);
        }
        return connector;
    }

    /**
     * Get all registered connectors
     */
    getAll(): IDataConnector[] {
        return Array.from(this.connectors.values());
    }

    /**
     * Get connectors by category
     */
    getByCategory(category: ConnectorCategory): IDataConnector[] {
        return this.getAll().filter(c => c.category === category);
    }

    /**
     * Check if a connector is registered
     */
    has(slug: string): boolean {
        return this.connectors.has(slug);
    }

    /**
     * Get all connector slugs
     */
    getSlugs(): string[] {
        return Array.from(this.connectors.keys());
    }

    /**
     * Get grouped connectors by category (for UI display)
     */
    getGroupedByCategory(): Record<ConnectorCategory, IDataConnector[]> {
        const grouped: Partial<Record<ConnectorCategory, IDataConnector[]>> = {};
        for (const connector of this.getAll()) {
            if (!grouped[connector.category]) {
                grouped[connector.category] = [];
            }
            grouped[connector.category]!.push(connector);
        }
        return grouped as Record<ConnectorCategory, IDataConnector[]>;
    }
}

// Singleton instance
export const connectorRegistry = new ConnectorRegistry();
