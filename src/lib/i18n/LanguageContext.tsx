"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { dictionaries, Language, Dictionary } from "./dictionaries";

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (namespace: keyof Dictionary, key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguageState] = useState<Language>("nl");

    // Hydrate from localStorage on mount (client-only)
    useEffect(() => {
        const storedLang = localStorage.getItem("app-language") as Language;
        if (storedLang && (storedLang === "nl" || storedLang === "en")) {
            setLanguageState(storedLang);
        } else {
            const browserLang = navigator.language.startsWith("en") ? "en" : "nl";
            setLanguageState(browserLang);
            localStorage.setItem("app-language", browserLang);
        }
    }, []);

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem("app-language", lang);
    };

    const t = (namespace: keyof Dictionary, key: string): string => {
        const dict = dictionaries[language][namespace] as Record<string, string>;
        if (dict && typeof dict[key] === "string") {
            return dict[key];
        }
        return key;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error("useLanguage must be used within a LanguageProvider");
    }
    return context;
}
