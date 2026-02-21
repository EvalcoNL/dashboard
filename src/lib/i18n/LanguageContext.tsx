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
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        const storedLang = localStorage.getItem("app-language") as Language;
        if (storedLang && (storedLang === "nl" || storedLang === "en")) {
            setLanguageState(storedLang);
        } else {
            // Default check browser lang if needed, or stick to nl
            const browserLang = navigator.language.startsWith("en") ? "en" : "nl";
            setLanguageState(browserLang);
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
        // Fallback to key if not found
        return key;
    };

    // Render the provider unconditionally so that useLanguage doesn't throw on initial render.
    // If strict consistency is needed to prevent hydration mismatch flashes, 
    // it's better to handle it at the component level or by rendering the provider but keeping content hidden.

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
