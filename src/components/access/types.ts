// Shared types and utilities used across access management components

export interface AccessItem {
    dataSourceId: string;
    dataSourceName: string;
    dataSourceType: string;
    accountId: string;
    accountRole: string | null;
    accountStatus: string;
    accountKind?: string;
}

export interface Person {
    name: string;
    email: string;
    accesses: AccessItem[];
}

export interface UserRoleData {
    id: string;
    name: string;
    description: string | null;
    color: string;
    roleMapping: Record<string, string>;
    isDefault: boolean;
    sortOrder: number;
}

export interface AppInfo {
    id: string;
    name: string;
    type: string;
}

export function getAppColor(type: string): string {
    const colors: Record<string, string> = {
        GOOGLE_ADS: "#4285F4",
        GOOGLE_ANALYTICS: "#E37400",
        GOOGLE_MERCHANT: "#34A853",
        GOOGLE_TAG_MANAGER: "#4285F4",
        GOOGLE_BUSINESS: "#4285F4",
        YOUTUBE: "#FF0000",
        INSTAGRAM: "#E4405F",
        META: "#1877F2",
        LINKEDIN: "#0A66C2",
        PINTEREST: "#E60023",
        MICROSOFT_ADS: "#0078D4",
        MICROSOFT_CLARITY: "#3B5998",
        SHOPIFY: "#95BF47",
        WORDPRESS: "#464342",
        KLAVIYO: "#2ED47A",
        CHANNABLE: "#0047FF",
        MAGENTO: "#EE672F",
        LIGHTSPEED: "#EF4B22",
        COOKIEBOT: "#1769FF",
        STAPE: "#6C47FF",
        WEBSITE: "#6366f1",
    };
    return colors[type] || "#6366f1";
}

export function getAppIcon(type: string): string {
    const icons: Record<string, string> = {
        GOOGLE_ADS: "G",
        GOOGLE_ANALYTICS: "GA",
        GOOGLE_MERCHANT: "GM",
        GOOGLE_TAG_MANAGER: "GTM",
        GOOGLE_BUSINESS: "GB",
        YOUTUBE: "YT",
        INSTAGRAM: "IG",
        META: "M",
        LINKEDIN: "LI",
        PINTEREST: "P",
        MICROSOFT_ADS: "MA",
        MICROSOFT_CLARITY: "MC",
        SHOPIFY: "S",
        WORDPRESS: "WP",
        KLAVIYO: "K",
        CHANNABLE: "CH",
        MAGENTO: "MG",
        LIGHTSPEED: "LS",
        COOKIEBOT: "CB",
        STAPE: "ST",
        WEBSITE: "W",
    };
    return icons[type] || type.charAt(0);
}

export function getPersonStatus(person: Person): { label: string; color: string; bg: string } {
    const statuses = person.accesses.map((a) => a.accountStatus);
    if (statuses.some((s) => s === "PENDING")) {
        return { label: "Uitgenodigd", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.1)" };
    }
    if (statuses.some((s) => s === "REVOKED")) {
        return { label: "Ingetrokken", color: "#ef4444", bg: "rgba(239, 68, 68, 0.1)" };
    }
    return { label: "Actief", color: "#10b981", bg: "rgba(16, 185, 129, 0.1)" };
}

export const PLATFORM_EXTRA_FIELDS: Record<string, { label: string; fields: { key: string; label: string; type: string; placeholder: string }[] }> = {
    MAGENTO: {
        label: "Magento",
        fields: [
            { key: "username", label: "Gebruikersnaam", type: "text", placeholder: "admin_user" },
            { key: "password", label: "Wachtwoord", type: "password", placeholder: "Sterk wachtwoord" },
        ],
    },
    WORDPRESS: {
        label: "WordPress",
        fields: [
            { key: "username", label: "Gebruikersnaam", type: "text", placeholder: "wp_user" },
            { key: "password", label: "Wachtwoord", type: "password", placeholder: "Sterk wachtwoord" },
        ],
    },
    SHOPIFY: {
        label: "Shopify",
        fields: [
            { key: "store_url", label: "Store URL", type: "url", placeholder: "https://winkel.myshopify.com" },
        ],
    },
    LIGHTSPEED: {
        label: "Lightspeed",
        fields: [
            { key: "api_key", label: "API Key", type: "text", placeholder: "API sleutel" },
        ],
    },
};
