"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, SkipForward, X, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { ONBOARDING_STEPS } from "@/lib/onboarding-steps";

interface StepProgress {
    id: string;
    title: string;
    description: string;
    checkDescription: string;
    completed: boolean;
    skipped: boolean;
    completedAt: string | null;
}

export default function OnboardingChecklist() {
    const router = useRouter();
    const [steps, setSteps] = useState<StepProgress[]>([]);
    const [loading, setLoading] = useState(true);
    const [collapsed, setCollapsed] = useState(false);
    const [hidden, setHidden] = useState(false);
    const [allDone, setAllDone] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);

    useEffect(() => {
        // Check if user has dismissed the checklist
        const dismissed = localStorage.getItem("onboarding-dismissed");
        if (dismissed === "true") {
            setHidden(true);
            setLoading(false);
            return;
        }

        fetch("/api/user/onboarding")
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    setSteps(data.steps);
                    setAllDone(data.allDone);
                    if (data.allDone) {
                        setShowConfetti(true);
                        setTimeout(() => setShowConfetti(false), 3000);
                    }
                }
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    const handleAction = async (stepId: string, action: "complete" | "skip") => {
        try {
            await fetch("/api/user/onboarding", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ step: stepId, action }),
            });
            setSteps(prev =>
                prev.map(s =>
                    s.id === stepId
                        ? { ...s, completed: action === "complete", skipped: action === "skip", completedAt: new Date().toISOString() }
                        : s
                )
            );
            // Check if all done now
            const updatedSteps = steps.map(s =>
                s.id === stepId ? { ...s, completed: action === "complete", skipped: action === "skip" } : s
            );
            if (updatedSteps.every(s => s.completed || s.skipped)) {
                setAllDone(true);
                setShowConfetti(true);
                setTimeout(() => setShowConfetti(false), 3000);
            }
        } catch { }
    };

    const handleDismiss = () => {
        localStorage.setItem("onboarding-dismissed", "true");
        setHidden(true);
    };

    const handleNavigate = (stepId: string) => {
        const stepDef = ONBOARDING_STEPS.find(s => s.id === stepId);
        if (stepDef?.href) {
            router.push(stepDef.href);
        }
    };

    if (loading || hidden) return null;

    const completedCount = steps.filter(s => s.completed || s.skipped).length;
    const progressPct = steps.length > 0 ? (completedCount / steps.length) * 100 : 0;

    return (
        <div style={{
            background: "var(--color-surface-elevated)",
            border: "1px solid var(--color-border)",
            borderRadius: "16px",
            overflow: "hidden",
            marginBottom: "24px",
            position: "relative",
        }}>
            {/* Confetti overlay */}
            {showConfetti && (
                <div style={{
                    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: "rgba(99, 102, 241, 0.05)", zIndex: 10,
                    borderRadius: "16px", pointerEvents: "none",
                }}>
                    <div style={{ textAlign: "center" }}>
                        <Sparkles size={48} style={{ color: "#6366f1", marginBottom: "12px" }} />
                        <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--color-text-primary)" }}>
                            🎉 Onboarding voltooid!
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div
                style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "16px 20px", cursor: "pointer",
                    borderBottom: collapsed ? "none" : "1px solid var(--color-border)",
                }}
                onClick={() => setCollapsed(!collapsed)}
            >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{
                        width: "36px", height: "36px", borderRadius: "10px",
                        background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "white",
                    }}>
                        <Sparkles size={18} />
                    </div>
                    <div>
                        <div style={{ fontSize: "0.9375rem", fontWeight: 600, color: "var(--color-text-primary)" }}>
                            Aan de slag met Evalco
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                            {completedCount} van {steps.length} stappen voltooid
                        </div>
                    </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {/* Progress ring */}
                    <svg width="32" height="32" viewBox="0 0 32 32">
                        <circle cx="16" cy="16" r="13" fill="none" stroke="var(--color-border)" strokeWidth="3" />
                        <circle
                            cx="16" cy="16" r="13" fill="none"
                            stroke="#6366f1" strokeWidth="3"
                            strokeDasharray={`${progressPct * 0.817} 100`}
                            strokeLinecap="round"
                            transform="rotate(-90 16 16)"
                            style={{ transition: "stroke-dasharray 0.3s ease" }}
                        />
                        <text x="16" y="16" textAnchor="middle" dominantBaseline="central"
                            style={{ fontSize: "9px", fontWeight: 700, fill: "var(--color-text-primary)" }}>
                            {completedCount}/{steps.length}
                        </text>
                    </svg>
                    {collapsed ? <ChevronDown size={16} style={{ color: "var(--color-text-muted)" }} />
                        : <ChevronUp size={16} style={{ color: "var(--color-text-muted)" }} />}
                </div>
            </div>

            {/* Steps */}
            {!collapsed && (
                <div style={{ padding: "8px 0" }}>
                    {steps.map((step, i) => {
                        const stepDef = ONBOARDING_STEPS.find(s => s.id === step.id);
                        const StepIcon = stepDef?.icon || Sparkles;
                        const isDone = step.completed || step.skipped;
                        return (
                            <div
                                key={step.id}
                                style={{
                                    display: "flex", alignItems: "center", gap: "12px",
                                    padding: "12px 20px",
                                    opacity: isDone ? 0.5 : 1,
                                    transition: "opacity 0.2s",
                                }}
                            >
                                {/* Step indicator */}
                                <div style={{
                                    width: "32px", height: "32px", borderRadius: "50%", flexShrink: 0,
                                    background: isDone ? "#22c55e" : "rgba(99, 102, 241, 0.1)",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    color: isDone ? "white" : "#6366f1",
                                    transition: "all 0.2s",
                                }}>
                                    {isDone ? <Check size={16} /> : <StepIcon size={16} />}
                                </div>

                                {/* Content */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                        fontSize: "0.875rem", fontWeight: 500,
                                        color: isDone ? "var(--color-text-muted)" : "var(--color-text-primary)",
                                        textDecoration: isDone ? "line-through" : "none",
                                    }}>
                                        {step.title}
                                    </div>
                                    <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                                        {step.description}
                                    </div>
                                </div>

                                {/* Actions */}
                                {!isDone && (
                                    <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                                        <button
                                            onClick={() => handleNavigate(step.id)}
                                            style={{
                                                padding: "6px 14px", borderRadius: "8px",
                                                background: "var(--color-brand)", color: "white",
                                                border: "none", fontSize: "0.75rem", fontWeight: 600,
                                                cursor: "pointer",
                                            }}
                                        >
                                            Start
                                        </button>
                                        <button
                                            onClick={() => handleAction(step.id, "skip")}
                                            title="Overslaan"
                                            style={{
                                                padding: "6px 8px", borderRadius: "8px",
                                                background: "transparent", color: "var(--color-text-muted)",
                                                border: "1px solid var(--color-border)", cursor: "pointer",
                                            }}
                                        >
                                            <SkipForward size={12} />
                                        </button>
                                    </div>
                                )}
                                {step.completed && (
                                    <span style={{ fontSize: "0.7rem", color: "#22c55e", fontWeight: 600 }}>Voltooid</span>
                                )}
                                {step.skipped && (
                                    <span style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>Overgeslagen</span>
                                )}
                            </div>
                        );
                    })}

                    {/* Dismiss button */}
                    {allDone && (
                        <div style={{ padding: "12px 20px", textAlign: "center" }}>
                            <button
                                onClick={handleDismiss}
                                style={{
                                    padding: "8px 16px", borderRadius: "8px",
                                    background: "transparent", color: "var(--color-text-muted)",
                                    border: "1px solid var(--color-border)",
                                    fontSize: "0.75rem", cursor: "pointer",
                                }}
                            >
                                Verbergen
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
