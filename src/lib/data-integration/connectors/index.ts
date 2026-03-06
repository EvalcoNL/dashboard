import { connectorRegistry } from '@/lib/data-integration/connector-registry';
import { GoogleAdsConnector } from './google-ads-connector';
import { GoogleAnalyticsConnector } from './google-analytics-connector';
import { MetaAdsConnector } from './meta-ads-connector';
import { MicrosoftAdsConnector } from './microsoft-ads-connector';
import { LinkedInAdsConnector } from './linkedin-ads-connector';
import { TikTokAdsConnector } from './tiktok-ads-connector';
import { MagentoConnector } from './magento-connector';
import { ShopwareConnector } from './shopware-connector';

/**
 * Register all available connectors.
 * Call this once at application startup.
 */
export function registerAllConnectors(): void {
    const connectors = [
        new GoogleAdsConnector(),
        new GoogleAnalyticsConnector(),
        new MetaAdsConnector(),
        new MicrosoftAdsConnector(),
        new LinkedInAdsConnector(),
        new TikTokAdsConnector(),
        new MagentoConnector(),
        new ShopwareConnector(),
    ];

    for (const connector of connectors) {
        if (!connectorRegistry.has(connector.slug)) {
            connectorRegistry.register(connector);
        }
    }
}

// Auto-register on import
registerAllConnectors();

// Export individual connectors for direct use
export { GoogleAdsConnector } from './google-ads-connector';
export { GoogleAnalyticsConnector } from './google-analytics-connector';
export { MetaAdsConnector } from './meta-ads-connector';
export { MicrosoftAdsConnector } from './microsoft-ads-connector';
export { LinkedInAdsConnector } from './linkedin-ads-connector';
export { TikTokAdsConnector } from './tiktok-ads-connector';
export { MagentoConnector } from './magento-connector';
export { ShopwareConnector } from './shopware-connector';
