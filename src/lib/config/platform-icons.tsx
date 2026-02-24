"use client";

import React from "react";

// ─── Centralized Platform Icons ──────────────────────────────────────
// Maps platform type keys to their official brand SVG icons at any size.

export function PlatformIcon({ type, size = 24 }: { type: string; size?: number }) {
    const icon = PLATFORM_ICONS[type];
    if (!icon) {
        // Fallback: colored circle with first letter
        return (
            <div style={{
                width: size, height: size, borderRadius: "50%",
                background: "rgba(99,102,241,0.15)", display: "flex",
                alignItems: "center", justifyContent: "center",
                fontSize: size * 0.45, fontWeight: 700, color: "#6366f1",
            }}>
                {type.charAt(0)}
            </div>
        );
    }
    return icon(size);
}

// ─── Platform metadata ───────────────────────────────────────────────

export interface PlatformMeta {
    key: string;
    name: string;
    color: string;
    abbr: string;
    category: "google" | "social" | "ecommerce" | "analytics";
    authType: "oauth_google" | "oauth_third" | "api_key" | "login";
    description: string;
}

export const PLATFORMS: PlatformMeta[] = [
    // Google Stack
    { key: "GOOGLE_ADS", name: "Google Ads", color: "#4285F4", abbr: "GA", category: "google", authType: "oauth_google", description: "Koppel Google Ads campagnes voor performance tracking" },
    { key: "GOOGLE_ANALYTICS", name: "Google Analytics", color: "#E37400", abbr: "GA4", category: "google", authType: "oauth_google", description: "Koppel Google Analytics properties voor websitestatistieken" },
    { key: "GOOGLE_MERCHANT", name: "Google Merchant Center", color: "#34A853", abbr: "GMC", category: "google", authType: "oauth_google", description: "Koppel Merchant Center accounts voor product feeds" },
    { key: "GOOGLE_TAG_MANAGER", name: "Google Tag Manager", color: "#4285F4", abbr: "GTM", category: "google", authType: "oauth_google", description: "Beheer tags, triggers en variabelen voor tracking" },
    { key: "GOOGLE_BUSINESS", name: "Google Business Profile", color: "#4285F4", abbr: "GBP", category: "google", authType: "oauth_google", description: "Beheer bedrijfsvermelding, reviews en lokale zichtbaarheid" },
    { key: "YOUTUBE", name: "YouTube Studio", color: "#FF0000", abbr: "YT", category: "google", authType: "oauth_google", description: "Monitor YouTube kanaalstatistieken en video performance" },
    // Social & Advertising
    { key: "INSTAGRAM", name: "Instagram", color: "#E4405F", abbr: "IG", category: "social", authType: "login", description: "Koppel Instagram accounts voor social media inzichten" },
    { key: "META", name: "Meta Business Suite", color: "#1877F2", abbr: "META", category: "social", authType: "oauth_third", description: "Beheer het volledige Meta Business Portfolio" },
    { key: "LINKEDIN", name: "LinkedIn", color: "#0A66C2", abbr: "LI", category: "social", authType: "oauth_third", description: "Koppel LinkedIn bedrijfspagina's voor B2B marketing" },
    { key: "PINTEREST", name: "Pinterest", color: "#E60023", abbr: "PIN", category: "social", authType: "oauth_third", description: "Monitor Pinterest pins, borden en advertentie performance" },
    { key: "MICROSOFT_ADS", name: "Microsoft Ads", color: "#0078D4", abbr: "MA", category: "social", authType: "oauth_third", description: "Importeer Bing Ads campagnedata en performance" },
    // E-commerce & CMS
    { key: "SHOPIFY", name: "Shopify", color: "#95BF47", abbr: "SH", category: "ecommerce", authType: "api_key", description: "Koppel Shopify webshops voor omzet en besteldata" },
    { key: "WORDPRESS", name: "WordPress", color: "#21759B", abbr: "WP", category: "ecommerce", authType: "api_key", description: "Monitor WordPress-sites, plugins en content performance" },
    { key: "LIGHTSPEED", name: "Lightspeed", color: "#EF4B22", abbr: "LS", category: "ecommerce", authType: "api_key", description: "Koppel Lightspeed POS en e-commerce voor verkoopdata" },
    { key: "CHANNABLE", name: "Channable", color: "#0047FF", abbr: "CH", category: "ecommerce", authType: "api_key", description: "Beheer product feeds en marketplace integraties" },
    { key: "MAGENTO", name: "Magento", color: "#EE672F", abbr: "MG", category: "ecommerce", authType: "api_key", description: "Koppel Magento webshops voor omzet, product- en projectdata" },
    // Analytics & Tools
    { key: "MICROSOFT_CLARITY", name: "Microsoft Clarity", color: "#3B5998", abbr: "MC", category: "analytics", authType: "api_key", description: "Heatmaps, sessie-opnames en gebruikersgedrag analyse" },
    { key: "KLAVIYO", name: "Klaviyo", color: "#000000", abbr: "KL", category: "analytics", authType: "api_key", description: "E-mail marketing automation, flows en campagne statistieken" },
    { key: "COOKIEBOT", name: "Cookiebot", color: "#1769FF", abbr: "CB", category: "analytics", authType: "api_key", description: "Cookie consent management en GDPR/AVG compliance" },
    { key: "STAPE", name: "Stape", color: "#6C47FF", abbr: "ST", category: "analytics", authType: "api_key", description: "Server-side tagging en tracking proxy" },
];

export function getPlatformMeta(type: string): PlatformMeta | undefined {
    return PLATFORMS.find(p => p.key === type);
}

export function getPlatformColor(type: string): string {
    return getPlatformMeta(type)?.color || "#6366f1";
}

export function getPlatformAbbr(type: string): string {
    return getPlatformMeta(type)?.abbr || type.charAt(0);
}

// ─── SVG Icon Map ────────────────────────────────────────────────────

const PLATFORM_ICONS: Record<string, (size: number) => React.ReactNode> = {
    GOOGLE_ADS: (s) => (
        <svg viewBox="0 0 48 48" width={s} height={s}>
            {/* Yellow bar (left) */}
            <path d="M10.2 36.7L23.7 13.3c1.4-2.4 4.5-3.2 6.9-1.8 2.4 1.4 3.2 4.5 1.8 6.9L18.9 41.8c-1.4 2.4-4.5 3.2-6.9 1.8-2.4-1.4-3.2-4.5-1.8-6.9z" fill="#FBBC04" />
            {/* Blue bar (right) */}
            <path d="M37.8 36.7L24.3 13.3c-1.4-2.4-.6-5.5 1.8-6.9 2.4-1.4 5.5-.6 6.9 1.8l13.5 23.4" fill="none" />
            <path d="M29.1 6.2c2.4-1.4 5.5-.6 6.9 1.8l5.8 10c1.4 2.4.6 5.5-1.8 6.9L26.5 17.8c-1.4-2.4-.6-5.5 1.8-6.9l.8-.7z" fill="#4285F4" />
            <path d="M37.8 36.7c1.4 2.4.6 5.5-1.8 6.9-2.4 1.4-5.5.6-6.9-1.8L24.3 33" fill="none" />
            <path d="M37.8 36.7L24.3 13.3c-1.4-2.4-.6-5.5 1.8-6.9 2.4-1.4 5.5-.6 6.9 1.8l13.5 23.4c1.4 2.4.6 5.5-1.8 6.9-2.4 1.4-5.5.6-6.9-1.8z" fill="#4285F4" />
            {/* Green dot (bottom left) */}
            <circle cx="14.5" cy="38" r="5" fill="#34A853" />
        </svg>
    ),
    GOOGLE_ANALYTICS: (s) => (
        <svg viewBox="0 0 48 48" width={s} height={s}>
            {/* Three vertical bars forming the GA4 chart icon */}
            <rect x="31" y="6" width="8" height="36" rx="4" fill="#F9AB00" />
            <rect x="20" y="17" width="8" height="25" rx="4" fill="#E37400" />
            <rect x="9" y="28" width="8" height="14" rx="4" fill="#E37400" />
        </svg>
    ),
    GOOGLE_MERCHANT: (s) => (
        <svg viewBox="0 0 48 48" width={s} height={s}>
            {/* Shopping bag shape */}
            <path d="M8 16l2-6h28l2 6v24a2 2 0 01-2 2H10a2 2 0 01-2-2V16z" fill="#4285F4" />
            {/* Bag top bar */}
            <path d="M10 10h28l2 6H8l2-6z" fill="#5C6BC0" />
            {/* Handle */}
            <path d="M18 10V9a6 6 0 0112 0v1" stroke="#3367D6" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            {/* Colored triangles/panels on bag front */}
            <path d="M8 16h16v12L8 16z" fill="#34A853" />
            <path d="M24 16h16L24 28V16z" fill="#FBBC04" />
            <path d="M8 16l16 12H8V16z" fill="#0D652D" opacity="0.2" />
            <path d="M40 16L24 28h16V16z" fill="#EA8600" opacity="0.2" />
        </svg>
    ),
    GOOGLE_TAG_MANAGER: (s) => (
        <svg viewBox="0 0 256 256" width={s} height={s}>
            <path d="M150.7 38.2l-48 48 65.4 65.4 50-50a16 16 0 000-22.6L173.4 34.2a16 16 0 00-22.7 4z" fill="#8AB4F8" />
            <path d="M105.3 83.6L34.2 154.7a16 16 0 000 22.6l44.7 44.7a16 16 0 0022.6 0l71.1-71.1-67.3-67.3z" fill="#4285F4" />
            <circle cx="128" cy="216" r="20" fill="#1A73E8" />
            <path d="M217.8 82.6l-44.7-44.7c-.8-.8-1.6-1.4-2.5-2L105.3 83.6l67.3 67.3 47.7-45.7a16 16 0 00-2.5-22.6z" fill="#246FDB" />
        </svg>
    ),
    GOOGLE_BUSINESS: (s) => (
        <svg viewBox="0 0 48 48" width={s} height={s}>
            <path d="M24 4C12.95 4 4 12.95 4 24s8.95 20 20 20 20-8.95 20-20S35.05 4 24 4z" fill="#4285F4" />
            <path d="M24 14c-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4-1.8-4-4-4zm0 18c-4.42 0-8 1.79-8 4h16c0-2.21-3.58-4-8-4z" fill="white" />
        </svg>
    ),
    YOUTUBE: (s) => (
        <svg viewBox="0 0 48 48" width={s} height={s}>
            <path d="M43.2 12.5c-.5-1.9-2-3.4-3.9-3.9C36 7.7 24 7.7 24 7.7s-12 0-15.3.9c-1.9.5-3.4 2-3.9 3.9C4 15.8 4 24 4 24s0 8.2.8 11.5c.5 1.9 2 3.4 3.9 3.9 3.3.9 15.3.9 15.3.9s12 0 15.3-.9c1.9-.5 3.4-2 3.9-3.9.8-3.3.8-11.5.8-11.5s0-8.2-.8-11.5z" fill="#FF0000" />
            <path d="M19.5 30.2V17.8L31 24l-11.5 6.2z" fill="white" />
        </svg>
    ),
    INSTAGRAM: (s) => (
        <svg viewBox="0 0 48 48" width={s} height={s}>
            <defs>
                <linearGradient id="ig" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#FFDC80" />
                    <stop offset="25%" stopColor="#F77737" />
                    <stop offset="50%" stopColor="#F56040" />
                    <stop offset="75%" stopColor="#C13584" />
                    <stop offset="100%" stopColor="#833AB4" />
                </linearGradient>
            </defs>
            <rect x="4" y="4" width="40" height="40" rx="10" stroke="url(#ig)" strokeWidth="4" fill="none" />
            <circle cx="24" cy="24" r="9" stroke="url(#ig)" strokeWidth="3.5" fill="none" />
            <circle cx="35" cy="13" r="3" fill="url(#ig)" />
        </svg>
    ),
    META: (s) => (
        <svg viewBox="0 0 48 48" width={s} height={s}>
            <path d="M24 4C12.95 4 4 12.95 4 24c0 9.97 7.31 18.23 16.87 19.76v-13.98h-5.08V24h5.08v-4.41c0-5.01 2.99-7.78 7.55-7.78 2.19 0 4.48.39 4.48.39v4.92h-2.52c-2.49 0-3.26 1.54-3.26 3.12V24h5.55l-.89 5.78h-4.66v13.98C36.69 42.23 44 33.97 44 24 44 12.95 35.05 4 24 4z" fill="#1877F2" />
            <path d="M33.12 29.78l.89-5.78h-5.55v-3.76c0-1.58.77-3.12 3.26-3.12h2.52v-4.92s-2.29-.39-4.48-.39c-4.56 0-7.55 2.77-7.55 7.78V24h-5.08v5.78h5.08v13.98a20.14 20.14 0 006.24 0V29.78h4.67z" fill="white" />
        </svg>
    ),
    LINKEDIN: (s) => (
        <svg viewBox="0 0 48 48" width={s} height={s}>
            <path d="M44.45 0H3.55A3.5 3.5 0 000 3.46v41.08A3.5 3.5 0 003.55 48h40.9A3.51 3.51 0 0048 44.54V3.46A3.5 3.5 0 0044.45 0z" fill="#0A66C2" transform="scale(1)" />
            <path d="M7.12 17.92h7.1v22.82h-7.1V17.92zm3.55-11.34a4.12 4.12 0 110 8.24 4.12 4.12 0 010-8.24zm7.3 11.34h6.8v3.12h.1c.95-1.8 3.27-3.7 6.74-3.7 7.2 0 8.54 4.74 8.54 10.91v12.56h-7.1V29.7c0-2.65-.05-6.07-3.7-6.07-3.7 0-4.27 2.9-4.27 5.87v11.24h-7.1V17.92z" fill="white" />
        </svg>
    ),
    PINTEREST: (s) => (
        <svg viewBox="0 0 48 48" width={s} height={s}>
            <circle cx="24" cy="24" r="24" fill="#E60023" />
            <path d="M24 10c-7.73 0-14 6.27-14 14 0 5.93 3.68 10.99 8.88 13.04-.12-1.1-.23-2.78.05-3.98l2.04-8.6s-.52-1.03-.52-2.55c0-2.39 1.38-4.18 3.1-4.18 1.46 0 2.17 1.1 2.17 2.41 0 1.47-.94 3.66-1.42 5.7-.4 1.7.85 3.08 2.53 3.08 3.04 0 5.38-3.21 5.38-7.82 0-4.09-2.94-6.94-7.14-6.94-4.86 0-7.71 3.65-7.71 7.42 0 1.47.57 3.04 1.27 3.89.14.17.16.31.12.48l-.48 1.92c-.08.31-.25.38-.58.23-2.12-.99-3.44-4.09-3.44-6.58 0-5.36 3.89-10.28 11.22-10.28 5.89 0 10.47 4.2 10.47 9.81 0 5.85-3.69 10.56-8.82 10.56-1.72 0-3.34-.9-3.9-1.96l-1.06 4.04c-.38 1.48-1.42 3.34-2.12 4.47A14 14 0 0024 38c7.73 0 14-6.27 14-14s-6.27-14-14-14z" fill="white" />
        </svg>
    ),
    MICROSOFT_ADS: (s) => (
        <svg viewBox="0 0 48 48" width={s} height={s}>
            <rect width="48" height="48" rx="8" fill="#0078D4" />
            <path d="M12 12h10v10H12V12zm14 0h10v10H26V12zM12 26h10v10H12V26zm17 0l5 10 5-10H29z" fill="white" />
        </svg>
    ),
    SHOPIFY: (s) => (
        <svg viewBox="0 0 48 48" width={s} height={s}>
            <path d="M37.5 9.3c-.1-.4-.4-.7-.8-.7-.3 0-5-.4-5-.4s-3.3-3.3-3.7-3.7c-.4-.4-1.1-.3-1.4-.2 0 0-.7.2-1.9.6-.4-1.2-1.1-2.3-2-3.2C21.1.3 19 0 17.3 0c-5.6 0-8.2 7-9 10.6l-4.5 1.4c-1.4.4-1.4.5-1.6 1.8L0 31.3 27.2 36l14.7-3.2S37.6 9.7 37.5 9.3zm-12-2.5c-.9.3-1.9.6-3 .9V6.5c0-.6 0-1.1-.1-1.5 1.2.2 2 1.2 3.1 1.8zm-5-.6c.1.6.1 1.4.1 2.3 0 .1 0 .2 0 .3-1.9.6-4 1.2-6 1.9C16 7 18 4.4 20.5 6.2zm-3.6-3.7c.5 0 .9.2 1.3.5-2.8 1.3-5.8 4.6-7.1 11.2l-4.7 1.5c1.3-4.3 4.2-13.2 10.5-13.2z" fill="#95BF47" transform="translate(5, 4) scale(0.85)" />
            <path d="M36.7 8.6c-.3 0-5-.4-5-.4s-3.3-3.3-3.7-3.7c-.1-.1-.3-.2-.5-.2l-2.1 42.7 14.7-3.2L37.5 9.3c-.1-.4-.4-.7-.8-.7z" fill="#5E8E3E" transform="translate(5, 4) scale(0.85)" />
            <path d="M21.5 16.5l-2.4 7s-1-.5-2.2-.5c-3.5.4-3.5 2.4-3.5 3 .2 2.9 7.9 3.5 8.3 10.3.3 5.3-2.8 9-7.4 9.3-5.5.3-8.5-2.9-8.5-2.9l1.2-4.9s3 2.3 5.5 2.1c1.6-.1 2.2-1.4 2.2-2.4-.2-3.8-6.6-3.6-6.9-9.7-.3-5.2 3.1-10.4 10.6-10.9 2.8-.1 4.1.6 4.1.6z" fill="white" transform="translate(5, 4) scale(0.85)" />
        </svg>
    ),
    WORDPRESS: (s) => (
        <svg viewBox="0 0 48 48" width={s} height={s}>
            <circle cx="24" cy="24" r="22" fill="#21759B" />
            <path d="M4.31 24a19.7 19.7 0 0010.42 17.43L6.15 17.87A19.6 19.6 0 004.31 24zm33.01-1.8c0-2.1-.76-3.56-1.4-4.7-.87-1.4-1.68-2.6-1.68-4 0-1.57 1.19-3.03 2.87-3.03.08 0 .15 0 .22.01A19.65 19.65 0 0024 4.31C17.96 4.31 12.6 7.37 9.36 12h.85c1.38 0 3.52-.17 3.52-.17.71-.04.8 1 .08 1.09 0 0-.72.08-1.52.12l7.75 23.05 4.66-13.97-3.32-9.08c-.71-.04-1.39-.12-1.39-.12-.71-.04-.63-1.13.08-1.09 0 0 2.18.17 3.48.17 1.38 0 3.52-.17 3.52-.17.71-.04.8 1 .08 1.09 0 0-.72.08-1.52.12l7.7 22.88 2.12-7.1c.92-2.95 1.63-5.07 1.63-6.89z" fill="white" />
            <path d="M24.86 25.69l-6.39 18.57a19.77 19.77 0 0012.12-.31c-.1-.16-.19-.33-.27-.53L24.86 25.69zm17.33-12.13c.07.54.12 1.12.12 1.75 0 1.73-.32 3.67-1.3 6.1l-5.22 15.11A19.66 19.66 0 0043.69 24a19.6 19.6 0 00-1.5-10.44z" fill="white" />
        </svg>
    ),
    LIGHTSPEED: (s) => (
        <svg viewBox="0 0 48 48" width={s} height={s}>
            <rect width="48" height="48" rx="8" fill="#EF4B22" />
            <path d="M12 16h6v16h-6V16zm9 4h6v12h-6V20zm9-8h6v20h-6V12z" fill="white" />
        </svg>
    ),
    CHANNABLE: (s) => (
        <svg viewBox="0 0 48 48" width={s} height={s}>
            <rect width="48" height="48" rx="8" fill="#0047FF" />
            <path d="M14 24l6-8h8l6 8-6 8h-8l-6-8z" fill="white" fillOpacity="0.9" />
            <path d="M16 16l4 8-4 8M32 16l-4 8 4 8" stroke="white" strokeWidth="2" strokeLinecap="round" />
        </svg>
    ),
    MAGENTO: (s) => (
        <svg viewBox="0 0 48 48" width={s} height={s}>
            <rect width="48" height="48" rx="8" fill="#EE672F" />
            <path d="M24 8l14 8v16l-5 3V18l-9-5-9 5v17l-5-3V16l14-8z" fill="white" />
            <path d="M24 26l-4-2.3V35l4 2.3 4-2.3V23.7L24 26z" fill="white" />
        </svg>
    ),
    MICROSOFT_CLARITY: (s) => (
        <svg viewBox="0 0 48 48" width={s} height={s}>
            <rect width="48" height="48" rx="8" fill="#3B5998" />
            <path d="M12 36V18h6v18h-6zm9 0V12h6v24h-6zM30 36V24h6v12h-6z" fill="white" />
            <circle cx="36" cy="12" r="4" fill="#FF6F61" />
        </svg>
    ),
    KLAVIYO: (s) => (
        <svg viewBox="0 0 48 48" width={s} height={s}>
            <rect width="48" height="48" rx="8" fill="#000000" />
            <path d="M14 14l8 10-8 10h6l5-6.26L30 34h6l-8-10 8-10h-6l-5 6.26L20 14h-6z" fill="#2ED47A" />
        </svg>
    ),
    COOKIEBOT: (s) => (
        <svg viewBox="0 0 48 48" width={s} height={s}>
            <rect width="48" height="48" rx="8" fill="#1769FF" />
            <circle cx="24" cy="24" r="12" stroke="white" strokeWidth="3" fill="none" />
            <path d="M24 16v8l5 5" stroke="white" strokeWidth="3" strokeLinecap="round" />
        </svg>
    ),
    STAPE: (s) => (
        <svg viewBox="0 0 48 48" width={s} height={s}>
            <rect width="48" height="48" rx="8" fill="#6C47FF" />
            <path d="M16 12v24M24 20v16M32 16v20" stroke="white" strokeWidth="5" strokeLinecap="round" />
            <circle cx="16" cy="12" r="3" fill="white" />
            <circle cx="24" cy="20" r="3" fill="white" />
            <circle cx="32" cy="16" r="3" fill="white" />
        </svg>
    ),
    WEBSITE: (s) => (
        <svg viewBox="0 0 48 48" width={s} height={s} fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="24" cy="24" r="18" />
            <path d="M6 24h36" />
            <path d="M24 6c-6 8-6 28 0 36" />
            <path d="M24 6c6 8 6 28 0 36" />
        </svg>
    ),
};
