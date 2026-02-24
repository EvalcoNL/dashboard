"use client";

import { useState } from "react";
import { ArrowLeft, Globe } from "lucide-react";
import Link from "next/link";
import SourceCard from "@/components/data-sources/SourceCard";
import ApiKeyLinkModal from "@/components/data-sources/ApiKeyLinkModal";
import LoginCredentialsModal from "@/components/data-sources/LoginCredentialsModal";
import { PlatformIcon, PLATFORMS, getPlatformMeta } from "@/lib/config/platform-icons";

// ─── Field configs per API-key platform ──────────────────────────────
const API_KEY_FIELDS: Record<string, { key: string; label: string; placeholder: string; required?: boolean; type?: string }[]> = {
    SHOPIFY: [
        { key: "storeUrl", label: "Shopify Store URL", placeholder: "jouw-winkel.myshopify.com", required: true },
        { key: "apiKey", label: "Admin API Access Token", placeholder: "shpat_...", required: true, type: "password" },
    ],
    WORDPRESS: [
        { key: "domain", label: "WordPress Site URL", placeholder: "https://jouw-site.nl", required: true },
        { key: "apiKey", label: "Application Password", placeholder: "xxxx xxxx xxxx xxxx", required: true, type: "password" },
    ],
    KLAVIYO: [
        { key: "apiKey", label: "Klaviyo Private API Key", placeholder: "pk_...", required: true, type: "password" },
    ],
    CHANNABLE: [
        { key: "apiKey", label: "Channable API Token", placeholder: "Voer je API token in...", required: true, type: "password" },
        { key: "projectId", label: "Project ID", placeholder: "12345", required: true },
    ],
    MAGENTO: [
        { key: "domain", label: "Magento Store URL", placeholder: "https://jouw-webshop.nl", required: true },
        { key: "apiKey", label: "Integration Access Token", placeholder: "Voer je access token in...", required: true, type: "password" },
    ],
    LIGHTSPEED: [
        { key: "apiKey", label: "API Key", placeholder: "Voer je API key in...", required: true, type: "password" },
        { key: "apiSecret", label: "API Secret", placeholder: "Voer je API secret in...", required: true, type: "password" },
        { key: "cluster", label: "Cluster URL", placeholder: "https://api.webshopapp.com", required: true },
    ],
    MICROSOFT_CLARITY: [
        { key: "apiKey", label: "Clarity Project ID", placeholder: "abc123xyz", required: true },
    ],
    COOKIEBOT: [
        { key: "apiKey", label: "Cookiebot Group ID (CBID)", placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", required: true },
    ],
    STAPE: [
        { key: "apiKey", label: "Stape API Token", placeholder: "Voer je API token in...", required: true, type: "password" },
        { key: "domain", label: "Server Container URL", placeholder: "https://gtm.jouw-domein.nl", required: true },
    ],
};

interface NewDataSourceClientProps {
    clientId: string;
    clientName: string;
}

export default function NewDataSourceClient({ clientId, clientName }: NewDataSourceClientProps) {
    const [apiKeyModal, setApiKeyModal] = useState<string | null>(null);
    const [loginModal, setLoginModal] = useState<string | null>(null);

    const openApiKeyPlatform = apiKeyModal ? getPlatformMeta(apiKeyModal) : null;
    const openLoginPlatform = loginModal ? getPlatformMeta(loginModal) : null;

    // ─ Helper to determine href or onClick ─
    const getAction = (platformKey: string) => {
        const meta = getPlatformMeta(platformKey);
        if (!meta) return {};

        switch (meta.authType) {
            case "oauth_google": {
                const slugMap: Record<string, string> = {
                    GOOGLE_ADS: "google-ads",
                    GOOGLE_ANALYTICS: "google-analytics",
                    GOOGLE_MERCHANT: "google-merchant",
                    GOOGLE_TAG_MANAGER: "google-tagmanager",
                    GOOGLE_BUSINESS: "google-business",
                    YOUTUBE: "youtube",
                };
                return { href: `/api/auth/${slugMap[platformKey]}/link?clientId=${clientId}` };
            }
            case "oauth_third": {
                const slugMap: Record<string, string> = {
                    META: "meta",
                    LINKEDIN: "linkedin",
                    PINTEREST: "pinterest",
                    MICROSOFT_ADS: "microsoft-ads",
                };
                return { href: `/api/auth/${slugMap[platformKey]}/link?clientId=${clientId}` };
            }
            case "api_key":
                return { onClick: () => setApiKeyModal(platformKey) };
            case "login":
                return { onClick: () => setLoginModal(platformKey) };
            default:
                return {};
        }
    };

    const renderCard = (platformKey: string) => {
        const meta = getPlatformMeta(platformKey);
        if (!meta) return null;
        const action = getAction(platformKey);

        // Special case for Website/Domain
        if (platformKey === "WEBSITE") {
            return (
                <SourceCard
                    key={platformKey}
                    href={`/dashboard/projects/${clientId}/data/sources/new/domain`}
                    icon={<PlatformIcon type="WEBSITE" size={48} />}
                    title="Domein (Website)"
                    description="Monitor uptime, SSL en page speed voor een website of applicatie"
                />
            );
        }

        return (
            <SourceCard
                key={platformKey}
                href={action.href}
                onClick={action.onClick}
                icon={<PlatformIcon type={platformKey} size={48} />}
                title={meta.name}
                description={meta.description}
            />
        );
    };

    const google = PLATFORMS.filter(p => p.category === "google");
    const social = PLATFORMS.filter(p => p.category === "social");
    const ecommerce = PLATFORMS.filter(p => p.category === "ecommerce");
    const analytics = PLATFORMS.filter(p => p.category === "analytics");

    return (
        <>
            <div style={{ padding: "32px", maxWidth: "1200px", margin: "0 auto" }}>
                <Link
                    href={`/dashboard/projects/${clientId}/data/sources`}
                    style={{
                        display: "inline-flex", alignItems: "center", gap: "6px",
                        color: "var(--color-text-muted)", textDecoration: "none",
                        fontSize: "0.85rem", marginBottom: "24px",
                    }}
                >
                    <ArrowLeft size={16} /> Terug naar bronnen
                </Link>

                <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "8px" }}>
                    Nieuwe Bron Toevoegen
                </h1>
                <p style={{ color: "var(--color-text-secondary)", marginBottom: "40px" }}>
                    Selecteer een platform om te koppelen aan {clientName}
                </p>

                {/* Google Stack */}
                <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--color-text-primary)", marginBottom: "16px" }}>
                    Google Stack
                </h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "24px" }}>
                    {google.map(p => renderCard(p.key))}
                </div>

                {/* Social & Advertising */}
                <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--color-text-primary)", marginBottom: "16px", marginTop: "40px" }}>
                    Social &amp; Advertising
                </h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "24px" }}>
                    {social.map(p => renderCard(p.key))}
                </div>

                {/* E-commerce & CMS */}
                <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--color-text-primary)", marginBottom: "16px", marginTop: "40px" }}>
                    E-commerce &amp; CMS
                </h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "24px" }}>
                    {ecommerce.map(p => renderCard(p.key))}
                </div>

                {/* Analytics & Tools */}
                <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--color-text-primary)", marginBottom: "16px", marginTop: "40px" }}>
                    Analytics &amp; Tools
                </h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "24px" }}>
                    {analytics.map(p => renderCard(p.key))}
                    {renderCard("WEBSITE")}
                </div>
            </div>

            {/* API Key Modal */}
            {openApiKeyPlatform && (
                <ApiKeyLinkModal
                    open={!!apiKeyModal}
                    onClose={() => setApiKeyModal(null)}
                    clientId={clientId}
                    platformType={openApiKeyPlatform.key}
                    platformName={openApiKeyPlatform.name}
                    platformColor={openApiKeyPlatform.color}
                    fields={API_KEY_FIELDS[openApiKeyPlatform.key]}
                />
            )}

            {/* Login Credentials Modal */}
            {openLoginPlatform && (
                <LoginCredentialsModal
                    open={!!loginModal}
                    onClose={() => setLoginModal(null)}
                    clientId={clientId}
                    platformType={openLoginPlatform.key}
                    platformName={openLoginPlatform.name}
                    platformColor={openLoginPlatform.color}
                />
            )}
        </>
    );
}
