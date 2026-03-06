"use client";

import React, { useState, useEffect } from "react";
import {
    X,
    ChevronRight,
    ChevronLeft,
    BarChart3,
    Globe,
    Bell,
    Settings,
    Search,
    Activity,
    Sparkles,
} from "lucide-react";

interface TourStep {
    title: string;
    description: string;
    icon: React.ReactNode;
}

const TOUR_STEPS: TourStep[] = [
    {
        title: "Welkom bij Evalco!",
        description: "Evalco is jouw AI-dashboard voor marketing data analytics en monitoring. Laat ons je rondleiden door de belangrijkste functies.",
        icon: <Sparkles size={28} color="var(--color-brand)" />,
    },
    {
        title: "Projecten Beheren",
        description: "Maak projecten aan voor elk van je klanten. Koppel data bronnen zoals Google Ads, Analytics, Meta en meer om al je data samen te brengen.",
        icon: <BarChart3 size={28} color="var(--color-brand)" />,
    },
    {
        title: "Monitoring & Tracking",
        description: "Houd de uptime van websites in de gaten en controleer of tracking pixels correct zijn geïnstalleerd. Ontvang meldingen bij problemen.",
        icon: <Globe size={28} color="var(--color-brand)" />,
    },
    {
        title: "Notificaties",
        description: "Ontvang real-time meldingen bij incidenten, downtime, of ontbrekende pixels. Bekijk je notificaties via het bel-icoon rechtsboven.",
        icon: <Bell size={28} color="var(--color-brand)" />,
    },
    {
        title: "Snelzoeken (⌘K)",
        description: "Gebruik ⌘K (of Ctrl+K) om snel te navigeren naar projecten, pagina's en acties. Dit bespaart je veel klikken!",
        icon: <Search size={28} color="var(--color-brand)" />,
    },
    {
        title: "Instellingen",
        description: "Pas je profiel aan, schakel dark/light mode in, stel 2FA in voor extra beveiliging, en beheer je notificatievoorkeuren.",
        icon: <Settings size={28} color="var(--color-brand)" />,
    },
];

const TOUR_STORAGE_KEY = "evalco_tour_completed";

export default function OnboardingTour() {
    const [isVisible, setIsVisible] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);

    useEffect(() => {
        const completed = localStorage.getItem(TOUR_STORAGE_KEY);
        if (!completed) {
            // Show tour after a short delay for first-time users
            const timer = setTimeout(() => setIsVisible(true), 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleNext = () => {
        if (currentStep < TOUR_STEPS.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            handleComplete();
        }
    };

    const handlePrev = () => {
        if (currentStep > 0) setCurrentStep(prev => prev - 1);
    };

    const handleComplete = () => {
        localStorage.setItem(TOUR_STORAGE_KEY, "true");
        setIsVisible(false);
    };

    const handleSkip = () => {
        localStorage.setItem(TOUR_STORAGE_KEY, "true");
        setIsVisible(false);
    };

    if (!isVisible) return null;

    const step = TOUR_STEPS[currentStep];
    const isLast = currentStep === TOUR_STEPS.length - 1;

    return (
        <>
            {/* Backdrop */}
            <div style={{
                position: "fixed", inset: 0,
                background: "rgba(0,0,0,0.6)",
                backdropFilter: "blur(4px)",
                zIndex: 10000,
                animation: "fadeIn 0.3s ease",
            }} />

            {/* Tour Modal */}
            <div style={{
                position: "fixed",
                top: "50%", left: "50%",
                transform: "translate(-50%, -50%)",
                width: "calc(100% - 32px)",
                maxWidth: "480px",
                background: "var(--color-surface-elevated)",
                border: "1px solid var(--color-border)",
                borderRadius: "20px",
                padding: "36px",
                zIndex: 10001,
                boxShadow: "0 24px 80px -20px rgba(0,0,0,0.5)",
                animation: "slideUp 0.3s ease",
            }}>
                {/* Skip button */}
                <button
                    onClick={handleSkip}
                    style={{
                        position: "absolute", top: "16px", right: "16px",
                        background: "none", border: "none", cursor: "pointer",
                        color: "var(--color-text-muted)", padding: "4px",
                    }}
                >
                    <X size={20} />
                </button>

                {/* Icon */}
                <div style={{
                    width: "64px", height: "64px", borderRadius: "16px",
                    background: "rgba(99, 102, 241, 0.1)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    marginBottom: "20px",
                }}>
                    {step.icon}
                </div>

                {/* Content */}
                <h2 style={{
                    fontSize: "1.3rem", fontWeight: 700,
                    color: "var(--color-text-primary)",
                    margin: "0 0 8px 0",
                }}>
                    {step.title}
                </h2>
                <p style={{
                    fontSize: "0.9rem", lineHeight: 1.6,
                    color: "var(--color-text-secondary)",
                    margin: "0 0 28px 0",
                }}>
                    {step.description}
                </p>

                {/* Progress dots */}
                <div style={{
                    display: "flex", gap: "6px",
                    justifyContent: "center", marginBottom: "24px",
                }}>
                    {TOUR_STEPS.map((_, i) => (
                        <div key={i} style={{
                            width: i === currentStep ? "24px" : "8px",
                            height: "8px",
                            borderRadius: "4px",
                            background: i === currentStep ? "var(--color-brand)" : "var(--color-border)",
                            transition: "all 0.3s ease",
                        }} />
                    ))}
                </div>

                {/* Navigation buttons */}
                <div style={{
                    display: "flex", gap: "12px",
                    justifyContent: "space-between",
                }}>
                    <button
                        onClick={handlePrev}
                        disabled={currentStep === 0}
                        style={{
                            display: "flex", alignItems: "center", gap: "6px",
                            padding: "10px 20px", borderRadius: "10px",
                            border: "1px solid var(--color-border)",
                            background: "none",
                            color: currentStep === 0 ? "var(--color-text-muted)" : "var(--color-text-primary)",
                            fontSize: "0.875rem", fontWeight: 500,
                            cursor: currentStep === 0 ? "not-allowed" : "pointer",
                            opacity: currentStep === 0 ? 0.4 : 1,
                        }}
                    >
                        <ChevronLeft size={16} />
                        Vorige
                    </button>
                    <button
                        onClick={handleNext}
                        style={{
                            display: "flex", alignItems: "center", gap: "6px",
                            padding: "10px 24px", borderRadius: "10px",
                            border: "none",
                            background: "var(--color-brand)",
                            color: "white",
                            fontSize: "0.875rem", fontWeight: 600,
                            cursor: "pointer",
                        }}
                    >
                        {isLast ? "Aan de slag!" : "Volgende"}
                        {!isLast && <ChevronRight size={16} />}
                    </button>
                </div>
            </div>

            <style jsx global>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp {
                    from { opacity: 0; transform: translate(-50%, -45%); }
                    to { opacity: 1; transform: translate(-50%, -50%); }
                }
            `}</style>
        </>
    );
}
