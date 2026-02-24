// ─── Platform Role Definitions ───────────────────────────────────────
// Defines the available roles per platform type for user access management.

export interface PlatformRole {
    value: string;      // Internal value used in API calls / DB
    label: string;      // Display name (Dutch)
    description: string; // Short description
    numericValue?: number; // For platforms that use numeric enums (e.g. Google Ads)
}

export interface PlatformRoleConfig {
    platformType: string;
    platformName: string;
    roles: PlatformRole[];
    defaultRole: string; // Default role value
}

export const PLATFORM_ROLES: PlatformRoleConfig[] = [
    {
        platformType: "GOOGLE_ADS",
        platformName: "Google Ads",
        defaultRole: "READ_ONLY",
        roles: [
            { value: "ADMIN", label: "Admin", description: "Volledige toegang tot account en instellingen", numericValue: 2 },
            { value: "STANDARD", label: "Standaard", description: "Kan campagnes beheren en aanpassen", numericValue: 3 },
            { value: "READ_ONLY", label: "Alleen lezen", description: "Kan data en rapporten bekijken", numericValue: 4 },
            { value: "EMAIL_ONLY", label: "Alleen e-mail", description: "Ontvangt alleen e-mailnotificaties", numericValue: 5 },
        ],
    },
    {
        platformType: "GOOGLE_ANALYTICS",
        platformName: "Google Analytics",
        defaultRole: "VIEWER",
        roles: [
            { value: "ADMINISTRATOR", label: "Beheerder", description: "Volledige beheer- en rapportagetoegang" },
            { value: "EDITOR", label: "Bewerker", description: "Kan rapporten en dashboards aanpassen" },
            { value: "ANALYST", label: "Analist", description: "Kan aangepaste rapporten maken" },
            { value: "VIEWER", label: "Lezer", description: "Kan rapporten en dashboards bekijken" },
        ],
    },
    {
        platformType: "GOOGLE_MERCHANT",
        platformName: "Google Merchant Center",
        defaultRole: "STANDARD",
        roles: [
            { value: "ADMIN", label: "Admin", description: "Volledige toegang tot Merchant Center" },
            { value: "STANDARD", label: "Standaard", description: "Kan producten en feeds beheren" },
            { value: "EMAIL_CONTACTS", label: "E-mailcontact", description: "Ontvangt meldingen en updates" },
        ],
    },
    {
        platformType: "GOOGLE_TAG_MANAGER",
        platformName: "Google Tag Manager",
        defaultRole: "READ",
        roles: [
            { value: "ADMIN", label: "Admin", description: "Containers en accounts beheren" },
            { value: "EDIT", label: "Bewerken", description: "Tags, triggers en variabelen aanpassen" },
            { value: "APPROVE", label: "Goedkeuren", description: "Workspaces en versies publiceren" },
            { value: "READ", label: "Alleen lezen", description: "Container configuratie bekijken" },
        ],
    },
    {
        platformType: "GOOGLE_BUSINESS",
        platformName: "Google Business Profile",
        defaultRole: "MANAGER",
        roles: [
            { value: "OWNER", label: "Eigenaar", description: "Volledige eigenaarrechten" },
            { value: "MANAGER", label: "Beheerder", description: "Kan profiel en berichten beheren" },
            { value: "SITE_MANAGER", label: "Sitebeheerder", description: "Beperkte beheertoegang" },
        ],
    },
    {
        platformType: "YOUTUBE",
        platformName: "YouTube Studio",
        defaultRole: "VIEWER",
        roles: [
            { value: "OWNER", label: "Eigenaar", description: "Volledige kanaalcontrole" },
            { value: "MANAGER", label: "Beheerder", description: "Kan video's en analytics beheren" },
            { value: "EDITOR", label: "Bewerker", description: "Kan video's uploaden en bewerken" },
            { value: "VIEWER", label: "Kijker", description: "Kan analytics en statistieken bekijken" },
        ],
    },
    {
        platformType: "META",
        platformName: "Meta Business Suite",
        defaultRole: "ANALYST",
        roles: [
            { value: "ADMIN", label: "Admin", description: "Volledige beheerrechten voor Business Portfolio" },
            { value: "ADVERTISER", label: "Adverteerder", description: "Kan campagnes aanmaken en beheren" },
            { value: "ANALYST", label: "Analist", description: "Kan rapporten en inzichten bekijken" },
        ],
    },
    {
        platformType: "INSTAGRAM",
        platformName: "Instagram",
        defaultRole: "VIEWER",
        roles: [
            { value: "ADMIN", label: "Admin", description: "Volledige account toegang" },
            { value: "CONTENT_CREATOR", label: "Content creator", description: "Kan content plaatsen en beheren" },
            { value: "VIEWER", label: "Kijker", description: "Kan insights en statistieken bekijken" },
        ],
    },
    {
        platformType: "LINKEDIN",
        platformName: "LinkedIn",
        defaultRole: "ANALYST",
        roles: [
            { value: "ADMIN", label: "Admin", description: "Volledige pagina- en advertentiebeheer" },
            { value: "CONTENT_CREATOR", label: "Content creator", description: "Kan berichten en content publiceren" },
            { value: "ANALYST", label: "Analist", description: "Kan analytics en campagnedata bekijken" },
        ],
    },
    {
        platformType: "PINTEREST",
        platformName: "Pinterest",
        defaultRole: "COLLABORATOR",
        roles: [
            { value: "ADMIN", label: "Admin", description: "Volledige accounttoegang en -beheer" },
            { value: "COLLABORATOR", label: "Medewerker", description: "Kan pins en borden bijdragen" },
        ],
    },
    {
        platformType: "MICROSOFT_ADS",
        platformName: "Microsoft Ads",
        defaultRole: "VIEWER",
        roles: [
            { value: "SUPER_ADMIN", label: "Super Admin", description: "Volledige accounttoegang" },
            { value: "STANDARD", label: "Standaard", description: "Kan campagnes beheren" },
            { value: "VIEWER", label: "Alleen lezen", description: "Kan rapporten bekijken" },
        ],
    },
    {
        platformType: "SHOPIFY",
        platformName: "Shopify",
        defaultRole: "COLLABORATOR",
        roles: [
            { value: "STAFF", label: "Medewerker", description: "Toegang tot winkel en orders" },
            { value: "COLLABORATOR", label: "Partner", description: "Beperkte toegang via samenwerkingsverzoek" },
        ],
    },
    {
        platformType: "WORDPRESS",
        platformName: "WordPress",
        defaultRole: "EDITOR",
        roles: [
            { value: "ADMINISTRATOR", label: "Beheerder", description: "Volledige sitetoegang" },
            { value: "EDITOR", label: "Redacteur", description: "Kan alle content publiceren en beheren" },
            { value: "AUTHOR", label: "Auteur", description: "Kan eigen content publiceren" },
            { value: "SUBSCRIBER", label: "Abonnee", description: "Kan alleen profiel beheren" },
        ],
    },
    {
        platformType: "KLAVIYO",
        platformName: "Klaviyo",
        defaultRole: "ANALYST",
        roles: [
            { value: "ADMIN", label: "Admin", description: "Volledige toegang tot Klaviyo account" },
            { value: "MANAGER", label: "Manager", description: "Kan campagnes en flows beheren" },
            { value: "ANALYST", label: "Analist", description: "Kan rapporten en data bekijken" },
            { value: "READ_ONLY", label: "Alleen lezen", description: "Kan dashboards bekijken" },
        ],
    },
    {
        platformType: "CHANNABLE",
        platformName: "Channable",
        defaultRole: "FULL_ACCESS",
        roles: [
            { value: "FULL_ACCESS", label: "Volledige toegang", description: "Volledige API-toegang tot feeds en regels" },
        ],
    },
    {
        platformType: "MAGENTO",
        platformName: "Magento",
        defaultRole: "API_ACCESS",
        roles: [
            { value: "ADMIN", label: "Beheerder", description: "Volledige admin toegang tot de Magento backend" },
            { value: "MANAGER", label: "Manager", description: "Kan producten, orders en projecten beheren" },
            { value: "API_ACCESS", label: "API-toegang", description: "Alleen REST/GraphQL API-toegang voor data-integratie" },
        ],
    },
    {
        platformType: "LIGHTSPEED",
        platformName: "Lightspeed",
        defaultRole: "FULL_ACCESS",
        roles: [
            { value: "FULL_ACCESS", label: "Volledige toegang", description: "Volledige POS en e-commerce toegang" },
        ],
    },
    {
        platformType: "MICROSOFT_CLARITY",
        platformName: "Microsoft Clarity",
        defaultRole: "MEMBER",
        roles: [
            { value: "ADMIN", label: "Admin", description: "Volledige Clarity projecttoegang" },
            { value: "MEMBER", label: "Lid", description: "Kan heatmaps en opnames bekijken" },
        ],
    },
    {
        platformType: "COOKIEBOT",
        platformName: "Cookiebot",
        defaultRole: "FULL_ACCESS",
        roles: [
            { value: "FULL_ACCESS", label: "Volledige toegang", description: "Beheer consent en compliance instellingen" },
        ],
    },
    {
        platformType: "STAPE",
        platformName: "Stape",
        defaultRole: "FULL_ACCESS",
        roles: [
            { value: "FULL_ACCESS", label: "Volledige toegang", description: "Beheer server-side containers en tags" },
        ],
    },
];

export function getPlatformRoles(platformType: string): PlatformRoleConfig | undefined {
    return PLATFORM_ROLES.find(p => p.platformType === platformType);
}

export function getDefaultRole(platformType: string): string {
    return getPlatformRoles(platformType)?.defaultRole || "READ_ONLY";
}
