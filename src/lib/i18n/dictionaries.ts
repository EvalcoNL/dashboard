// src/lib/i18n/dictionaries.ts

export type Language = "nl" | "en";

export const dictionaries = {
    nl: {
        common: {
            search: "Zoeken",
            logout: "Uitloggen",
            settings: "Instellingen",
            account: "Account:",
            allClients: "Alle Projecten",
            noAccountsFound: "Geen accounts gevonden",
            recent: "Recent",
        },
        navigation: {
            home: "Home",
            accounts: "Projecten",
            data: "Data",
            dataSources: "Data sources",
            report: "Rapport",
            monitoring: "Monitoring",
            webMonitoring: "Web monitoring",
            dataTracking: "Data tracking",
            dataTrackingMonitoring: "Data tracking monitoring",
            dataTrackingMonitoringTitle: "Data Tracking Monitoring",
            incidents: "Incidenten",
            access: "Toegang",
        },
    },
    en: {
        common: {
            search: "Search",
            logout: "Log out",
            settings: "Settings",
            account: "Account:",
            allClients: "All Projects",
            noAccountsFound: "No accounts found",
            recent: "Recent",
        },
        navigation: {
            home: "Home",
            accounts: "Projects",
            data: "Data",
            dataSources: "Data sources",
            report: "Report",
            monitoring: "Monitoring",
            webMonitoring: "Web monitoring",
            dataTracking: "Data tracking",
            dataTrackingMonitoring: "Data tracking monitoring",
            dataTrackingMonitoringTitle: "Data Tracking Monitoring",
            incidents: "Incidents",
            access: "Access",
        },
        data: {
            title: "Connect Data & Apps",
            description: "Currently viewing",
            cards: {
                "google-ads": { title: "Google Ads", desc: "Connect campaigns" },
                "meta-ads": { title: "Meta Ads", desc: "Connect advertisements" },
                "ga4": { title: "Google Analytics 4", desc: "Connect website data" },
                "domain": { title: "Domain & Uptime", desc: "Monitor website availability" },
                "slack": { title: "Slack", desc: "Connect communication tool" },
                "zendesk": { title: "Zendesk", desc: "Connect customer support" },
                "google-workspace": { title: "Google Workspace", desc: "Connect workspace environment" },
            },
            appsTitle: "Apps Overview",
            appsDesc: "Connect external business applications.",
            accessTitle: "Access Management",
            accessDesc: "Manage who has access to connected applications."
        }
    },
};

export type Dictionary = typeof dictionaries.nl; 
