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
    Sparkles,
    CheckCircle2,
} from "lucide-react";

interface TourStep {
    title: string;
    description: string;
    icon: React.ReactNode;
}

const TOUR_STEPS: TourStep[] = [
    {
        title: "Welkom bij Evalco!",
        description: "Evalco is jouw AI-dashboard voor marketing data analytics en monitoring. Doorloop de stappen om het meeste uit je project te halen.",
        icon: <Sparkles size={24} color="var(--color-brand)" />,
    },
    {
        title: "Projecten Beheren",
        description: "Koppel data bronnen zoals Google Ads, Analytics, Meta en meer om al je data samen te brengen.",
        icon: <BarChart3 size={24} color="var(--color-brand)" />,
    },
    {
        title: "Monitoring & Tracking",
        description: "Houd de uptime van websites in de gaten en controleer of tracking pixels correct zijn geïnstalleerd.",
        icon: <Globe size={24} color="var(--color-brand)" />,
    },
    {
        title: "Notificaties",
        description: "Ontvang meldingen bij incidenten, downtime, of ontbrekende pixels via het bel-icoon.",
        icon: <Bell size={24} color="var(--color-brand)" />,
    },
    {
        title: "Snelzoeken (⌘K)",
        description: "Gebruik ⌘K om snel te navigeren naar projecten, pagina's en acties.",
        icon: <Search size={24} color="var(--color-brand)" />,
    },
    {
        title: "Instellingen",
        description: "Pas je profiel aan, schakel dark/light mode in, en stel 2FA in voor extra beveiliging.",
        icon: <Settings size={24} color="var(--color-brand)" />,
    },
];

const TOUR_STORAGE_PREFIX = "evalco_tour_dismissed_";

interface ProjectOnboardingProps {
    projectId: string;
}

export default function ProjectOnboarding({ projectId }: ProjectOnboardingProps) {
    const [isDismissed, setIsDismissed] = useState(true); // Start hidden to avoid flash
    const [currentStep, setCurrentStep] = useState(0);
    const [isClosing, setIsClosing] = useState(false);

    const storageKey = `${TOUR_STORAGE_PREFIX}${projectId}`;

    useEffect(() => {
        const dismissed = localStorage.getItem(storageKey);
        setIsDismissed(!!dismissed);
    }, [storageKey]);

    const handleDismiss = () => {
        setIsClosing(true);
        setTimeout(() => {
            localStorage.setItem(storageKey, "true");
            setIsDismissed(true);
        }, 300);
    };

    const handleNext = () => {
        if (currentStep < TOUR_STEPS.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            handleDismiss();
        }
    };

    const handlePrev = () => {
        if (currentStep > 0) setCurrentStep(prev => prev - 1);
    };

    if (isDismissed) return null;

    const step = TOUR_STEPS[currentStep];
    const isLast = currentStep === TOUR_STEPS.length - 1;
    const progress = ((currentStep + 1) / TOUR_STEPS.length) * 100;

    return (
        <div
            style={{
                background: "var(--color-surface-elevated)",
                border: "1px solid var(--color-border)",
                borderRadius: "16px",
                padding: "24px",
                marginBottom: "24px",
                position: "relative",
                overflow: "hidden",
                opacity: isClosing ? 0 : 1,
                transform: isClosing ? "translateY(-10px)" : "translateY(0)",
                transition: "opacity 0.3s ease, transform 0.3s ease",
            }}
        >
            {/* Progress bar at top */}
            <div style={{
                position: "absolute", top: 0, left: 0,
                height: "3px", width: `${progress}%`,
                background: "var(--color-brand)",
                borderRadius: "0 2px 2px 0",
                transition: "width 0.3s ease",
            }} />

            {/* Close button */}
            <button
                onClick={handleDismiss}
                title="Sluiten"
                style={{
                    position: "absolute", top: "12px", right: "12px",
                    background: "none", border: "none", cursor: "pointer",
                    color: "var(--color-text-muted)", padding: "4px",
                    borderRadius: "6px",
                    transition: "color 0.15s ease, background 0.15s ease",
                }}
                onMouseEnter={e => {
                    e.currentTarget.style.color = "var(--color-text-primary)";
                    e.currentTarget.style.background = "var(--color-border)";
                }}
                onMouseLeave={e => {
                    e.currentTarget.style.color = "var(--color-text-muted)";
                    e.currentTarget.style.background = "none";
                }}
            >
                <X size={18} />
            </button>

            <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                {/* Icon */}
                <div style={{
                    width: "48px", height: "48px", borderRadius: "12px",
                    background: "rgba(99, 102, 241, 0.1)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                }}>
                    {step.icon}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                        fontSize: "0.75rem", fontWeight: 600,
                        color: "var(--color-brand)",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        marginBottom: "4px",
                    }}>
                        Aan de slag • Stap {currentStep + 1}/{TOUR_STEPS.length}
                    </div>
                    <h3 style={{
                        fontSize: "1.05rem", fontWeight: 700,
                        color: "var(--color-text-primary)",
                        margin: "0 0 4px 0",
                    }}>
                        {step.title}
                    </h3>
                    <p style={{
                        fontSize: "0.85rem", lineHeight: 1.5,
                        color: "var(--color-text-secondary)",
                        margin: "0",
                    }}>
                        {step.description}
                    </p>

                    {/* Navigation */}
                    <div style={{
                        display: "flex", gap: "8px",
                        marginTop: "16px", alignItems: "center",
                    }}>
                        <button
                            onClick={handlePrev}
                            disabled={currentStep === 0}
                            style={{
                                display: "flex", alignItems: "center", gap: "4px",
                                padding: "6px 14px", borderRadius: "8px",
                                border: "1px solid var(--color-border)",
                                background: "none",
                                color: currentStep === 0 ? "var(--color-text-muted)" : "var(--color-text-primary)",
                                fontSize: "0.8rem", fontWeight: 500,
                                cursor: currentStep === 0 ? "not-allowed" : "pointer",
                                opacity: currentStep === 0 ? 0.4 : 1,
                            }}
                        >
                            <ChevronLeft size={14} />
                            Vorige
                        </button>
                        <button
                            onClick={handleNext}
                            style={{
                                display: "flex", alignItems: "center", gap: "4px",
                                padding: "6px 16px", borderRadius: "8px",
                                border: "none",
                                background: "var(--color-brand)",
                                color: "white",
                                fontSize: "0.8rem", fontWeight: 600,
                                cursor: "pointer",
                            }}
                        >
                            {isLast ? (
                                <>
                                    <CheckCircle2 size={14} />
                                    Voltooien
                                </>
                            ) : (
                                <>
                                    Volgende
                                    <ChevronRight size={14} />
                                </>
                            )}
                        </button>

                        {/* Step dots */}
                        <div style={{ display: "flex", gap: "4px", marginLeft: "auto" }}>
                            {TOUR_STEPS.map((_, i) => (
                                <div key={i} style={{
                                    width: i === currentStep ? "16px" : "6px",
                                    height: "6px",
                                    borderRadius: "3px",
                                    background: i === currentStep ? "var(--color-brand)" : "var(--color-border)",
                                    transition: "all 0.2s ease",
                                }} />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
