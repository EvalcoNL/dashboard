// src/lib/i18n/dictionaries.ts

export type Language = "nl" | "en";

export const dictionaries = {
    nl: {
        common: {
            search: "Zoeken",
            logout: "Uitloggen",
            settings: "Instellingen",
            account: "Account:",
            allClients: "Alle Klanten",
            noAccountsFound: "Geen accounts gevonden",
            recent: "Recent",
        },
        navigation: {
            home: "Home",
            accounts: "Accounts",
            data: "Data",
            dataSources: "Data sources",
            report: "Rapport",
        },
    },
    en: {
        common: {
            search: "Search",
            logout: "Log out",
            settings: "Settings",
            account: "Account:",
            allClients: "All Clients",
            noAccountsFound: "No accounts found",
            recent: "Recent",
        },
        navigation: {
            home: "Home",
            accounts: "Accounts",
            data: "Data",
            dataSources: "Data sources",
            report: "Report",
        },
    },
};

export type Dictionary = typeof dictionaries.nl; 
