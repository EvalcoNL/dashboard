"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    Building2,
    Target,
    Globe,
    CheckCircle2,
    ArrowRight,
    ArrowLeft,
    Loader2,
    Sparkles,
    SkipForward,
} from "lucide-react";

interface WizardData {
    // Step 1: Bedrijfsgegevens
    name: string;
    industryType: string;
    // Step 2: Targets
    targetType: string;
    targetValue: string;
    tolerancePct: string;
    evaluationWindowDays: string;
    profitMarginPct: string;
    currency: string;
    // Step 3: Website
    domain: string;
}

const STEPS = [
    { id: 1, label: "Bedrijfsgegevens", icon: Building2 },
    { id: 2, label: "Targets & KPI's", icon: Target },
    { id: 3, label: "Website", icon: Globe },
    { id: 4, label: "Bevestiging", icon: CheckCircle2 },
];

export default function ProjectOnboardingWizard() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [data, setData] = useState<WizardData>({
        name: "",
        industryType: "LEADGEN",
        targetType: "CPA",
        targetValue: "",
        tolerancePct: "15",
        evaluationWindowDays: "7",
        profitMarginPct: "",
        currency: "EUR",
        domain: "",
    });

    const update = (fields: Partial<WizardData>) =>
        setData((prev) => ({ ...prev, ...fields }));

    const canNext = () => {
        switch (step) {
            case 1:
                return data.name.trim().length >= 2;
            case 2:
                return (
                    data.targetValue !== "" &&
                    parseFloat(data.targetValue) > 0 &&
                    (data.targetType !== "POAS" || data.profitMarginPct !== "")
                );
            case 3:
                return true; // optional
            case 4:
                return true;
            default:
                return false;
        }
    };

    const handleNext = () => {
        if (step < 4) setStep(step + 1);
    };
    const handleBack = () => {
        if (step > 1) setStep(step - 1);
    };

    const handleSubmit = async () => {
        setLoading(true);
        setError("");

        try {
            const res = await fetch("/api/projects", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: data.name.trim(),
                    industryType: data.industryType,
                    targetType: data.targetType,
                    targetValue: parseFloat(data.targetValue),
                    tolerancePct: parseInt(data.tolerancePct),
                    evaluationWindowDays: parseInt(data.evaluationWindowDays),
                    profitMarginPct: data.profitMarginPct
                        ? parseFloat(data.profitMarginPct)
                        : null,
                    currency: data.currency,
                    domain: data.domain.trim() || null,
                }),
            });

            if (!res.ok) {
                const json = await res.json();
                throw new Error(json.error || "Fout bij aanmaken");
            }

            const project = await res.json();
            router.push(`/projects/${project.id}/data/sources?onboarding=complete`);
            router.refresh();
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Er is een fout opgetreden"
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="animate-fade-in"
            style={{
                maxWidth: "720px",
                margin: "0 auto",
                padding: "40px 20px",
            }}
        >
            {/* Header */}
            <div style={{ textAlign: "center", marginBottom: "48px" }}>
                <div
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "8px 16px",
                        background: "rgba(99, 102, 241, 0.1)",
                        borderRadius: "24px",
                        color: "var(--color-brand-light)",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        marginBottom: "16px",
                    }}
                >
                    <Sparkles size={14} />
                    Nieuw Project
                </div>
                <h1
                    style={{
                        fontSize: "1.75rem",
                        fontWeight: 700,
                        marginBottom: "8px",
                    }}
                >
                    Project Instellen
                </h1>
                <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem" }}>
                    Doorloop de stappen om je project te configureren
                </p>
            </div>

            {/* Progress Steps */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "center",
                    gap: "8px",
                    marginBottom: "48px",
                    position: "relative",
                }}
            >
                {STEPS.map((s, i) => {
                    const isActive = s.id === step;
                    const isCompleted = s.id < step;
                    const Icon = s.icon;

                    return (
                        <div
                            key={s.id}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                            }}
                        >
                            <button
                                onClick={() => s.id < step && setStep(s.id)}
                                disabled={s.id > step}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    padding: "10px 16px",
                                    borderRadius: "12px",
                                    border: isActive
                                        ? "1px solid var(--color-brand)"
                                        : "1px solid transparent",
                                    background: isActive
                                        ? "rgba(99, 102, 241, 0.15)"
                                        : isCompleted
                                            ? "rgba(16, 185, 129, 0.1)"
                                            : "rgba(51, 65, 85, 0.3)",
                                    color: isActive
                                        ? "var(--color-brand-light)"
                                        : isCompleted
                                            ? "#10b981"
                                            : "var(--color-text-muted)",
                                    cursor: s.id < step ? "pointer" : "default",
                                    fontWeight: isActive ? 600 : 400,
                                    fontSize: "0.8rem",
                                    transition: "all 0.2s ease",
                                    opacity: s.id > step ? 0.5 : 1,
                                }}
                            >
                                {isCompleted ? (
                                    <CheckCircle2 size={16} />
                                ) : (
                                    <Icon size={16} />
                                )}
                                <span className="hide-mobile">{s.label}</span>
                            </button>
                            {i < STEPS.length - 1 && (
                                <div
                                    style={{
                                        width: "24px",
                                        height: "2px",
                                        background:
                                            s.id < step
                                                ? "#10b981"
                                                : "rgba(51, 65, 85, 0.3)",
                                        borderRadius: "1px",
                                        transition: "background 0.3s ease",
                                    }}
                                />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Step Content */}
            <div
                className="glass-card"
                style={{
                    padding: "32px",
                    marginBottom: "24px",
                    minHeight: "280px",
                }}
            >
                {step === 1 && (
                    <StepBedrijf data={data} update={update} />
                )}
                {step === 2 && (
                    <StepTargets data={data} update={update} />
                )}
                {step === 3 && (
                    <StepWebsite data={data} update={update} />
                )}
                {step === 4 && (
                    <StepBevestiging data={data} />
                )}
            </div>

            {/* Error */}
            {error && (
                <div
                    style={{
                        padding: "12px 16px",
                        background: "rgba(239, 68, 68, 0.1)",
                        border: "1px solid rgba(239, 68, 68, 0.2)",
                        borderRadius: "10px",
                        marginBottom: "16px",
                        color: "#f87171",
                        fontSize: "0.85rem",
                    }}
                >
                    {error}
                </div>
            )}

            {/* Navigation Buttons */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "12px",
                }}
            >
                <button
                    onClick={handleBack}
                    disabled={step === 1}
                    className="btn btn-secondary"
                    style={{
                        opacity: step === 1 ? 0.3 : 1,
                        cursor: step === 1 ? "not-allowed" : "pointer",
                    }}
                >
                    <ArrowLeft size={16} />
                    Vorige
                </button>

                {step < 4 ? (
                    <button
                        onClick={handleNext}
                        disabled={!canNext()}
                        className="btn btn-primary"
                        style={{
                            opacity: canNext() ? 1 : 0.5,
                        }}
                    >
                        Volgende
                        <ArrowRight size={16} />
                    </button>
                ) : (
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="btn btn-primary"
                        style={{ opacity: loading ? 0.7 : 1 }}
                    >
                        {loading ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <Sparkles size={16} />
                        )}
                        Project Aanmaken
                    </button>
                )}
            </div>

            <style>{`
                @media (max-width: 768px) {
                    .hide-mobile { display: none; }
                }
            `}</style>
        </div>
    );
}

/* ========================
   STEP 1: Bedrijfsgegevens
   ======================== */
function StepBedrijf({
    data,
    update,
}: {
    data: WizardData;
    update: (fields: Partial<WizardData>) => void;
}) {
    return (
        <div className="animate-fade-in">
            <h2
                style={{
                    fontSize: "1.2rem",
                    fontWeight: 600,
                    marginBottom: "8px",
                }}
            >
                Bedrijfsgegevens
            </h2>
            <p
                style={{
                    color: "var(--color-text-muted)",
                    fontSize: "0.85rem",
                    marginBottom: "28px",
                }}
            >
                De basisinformatie over het project
            </p>

            <div style={{ marginBottom: "24px" }}>
                <label className="label" htmlFor="w-name">
                    Projectnaam *
                </label>
                <input
                    id="w-name"
                    className="input"
                    value={data.name}
                    onChange={(e) => update({ name: e.target.value })}
                    placeholder="Bijv. Acme BV, Fashion Store NL"
                    autoFocus
                />
            </div>

            <div>
                <label className="label">Branche *</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    {[
                        {
                            value: "LEADGEN",
                            label: "Leadgen",
                            desc: "B2B, dienstverlening, leads",
                            emoji: "🎯",
                        },
                        {
                            value: "ECOMMERCE",
                            label: "E-commerce",
                            desc: "Webshop, online verkoop",
                            emoji: "🛒",
                        },
                    ].map((opt) => (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => update({
                                industryType: opt.value,
                                targetType: opt.value === "ECOMMERCE" ? "ROAS" : "CPA",
                            })}
                            style={{
                                padding: "20px",
                                borderRadius: "12px",
                                border:
                                    data.industryType === opt.value
                                        ? "2px solid var(--color-brand)"
                                        : "1px solid var(--color-border)",
                                background:
                                    data.industryType === opt.value
                                        ? "rgba(99, 102, 241, 0.1)"
                                        : "transparent",
                                cursor: "pointer",
                                textAlign: "left",
                                transition: "all 0.2s ease",
                            }}
                        >
                            <div style={{ fontSize: "1.5rem", marginBottom: "8px" }}>
                                {opt.emoji}
                            </div>
                            <div
                                style={{
                                    fontWeight: 600,
                                    marginBottom: "4px",
                                    color: "var(--color-text-primary)",
                                }}
                            >
                                {opt.label}
                            </div>
                            <div
                                style={{
                                    fontSize: "0.75rem",
                                    color: "var(--color-text-muted)",
                                }}
                            >
                                {opt.desc}
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

/* =====================
   STEP 2: Targets & KPI
   ===================== */
function StepTargets({
    data,
    update,
}: {
    data: WizardData;
    update: (fields: Partial<WizardData>) => void;
}) {
    return (
        <div className="animate-fade-in">
            <h2
                style={{
                    fontSize: "1.2rem",
                    fontWeight: 600,
                    marginBottom: "8px",
                }}
            >
                Targets & KPI&#39;s
            </h2>
            <p
                style={{
                    color: "var(--color-text-muted)",
                    fontSize: "0.85rem",
                    marginBottom: "28px",
                }}
            >
                Stel de KPI&#39;s en targets in voor performance tracking
            </p>

            {/* Target Type */}
            <div style={{ marginBottom: "20px" }}>
                <label className="label">Target Metric *</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
                    {[
                        { value: "CPA", label: "CPA", desc: "Cost per Acquisitie" },
                        { value: "ROAS", label: "ROAS", desc: "Return on Ad Spend" },
                        { value: "POAS", label: "POAS", desc: "Profit on Ad Spend" },
                    ].map((opt) => (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => update({ targetType: opt.value })}
                            style={{
                                padding: "14px 12px",
                                borderRadius: "10px",
                                border:
                                    data.targetType === opt.value
                                        ? "2px solid var(--color-brand)"
                                        : "1px solid var(--color-border)",
                                background:
                                    data.targetType === opt.value
                                        ? "rgba(99, 102, 241, 0.1)"
                                        : "transparent",
                                cursor: "pointer",
                                textAlign: "center",
                                transition: "all 0.2s ease",
                            }}
                        >
                            <div
                                style={{
                                    fontWeight: 600,
                                    color: "var(--color-text-primary)",
                                    marginBottom: "2px",
                                }}
                            >
                                {opt.label}
                            </div>
                            <div
                                style={{
                                    fontSize: "0.7rem",
                                    color: "var(--color-text-muted)",
                                }}
                            >
                                {opt.desc}
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Target Value + Currency */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 1fr",
                    gap: "12px",
                    marginBottom: "20px",
                }}
            >
                <div>
                    <label className="label" htmlFor="w-target">
                        Target Waarde *
                    </label>
                    <input
                        id="w-target"
                        className="input"
                        type="number"
                        step="0.01"
                        min="0"
                        value={data.targetValue}
                        onChange={(e) => update({ targetValue: e.target.value })}
                        placeholder={data.targetType === "CPA" ? "25.00" : "5.00"}
                    />
                </div>
                <div>
                    <label className="label" htmlFor="w-currency">
                        Valuta
                    </label>
                    <select
                        id="w-currency"
                        className="select"
                        value={data.currency}
                        onChange={(e) => update({ currency: e.target.value })}
                    >
                        <option value="EUR">EUR (€)</option>
                        <option value="USD">USD ($)</option>
                        <option value="GBP">GBP (£)</option>
                    </select>
                </div>
            </div>

            {/* Tolerance + Window */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "12px",
                    marginBottom: "20px",
                }}
            >
                <div>
                    <label className="label" htmlFor="w-tolerance">
                        Tolerantie (%)
                    </label>
                    <input
                        id="w-tolerance"
                        className="input"
                        type="number"
                        min="1"
                        max="100"
                        value={data.tolerancePct}
                        onChange={(e) =>
                            update({ tolerancePct: e.target.value })
                        }
                    />
                    <p
                        style={{
                            fontSize: "0.7rem",
                            color: "var(--color-text-muted)",
                            marginTop: "4px",
                        }}
                    >
                        Toegestane afwijking van target
                    </p>
                </div>
                <div>
                    <label className="label" htmlFor="w-window">
                        Evaluatie Window
                    </label>
                    <input
                        id="w-window"
                        className="input"
                        type="number"
                        min="1"
                        max="90"
                        value={data.evaluationWindowDays}
                        onChange={(e) =>
                            update({ evaluationWindowDays: e.target.value })
                        }
                    />
                    <p
                        style={{
                            fontSize: "0.7rem",
                            color: "var(--color-text-muted)",
                            marginTop: "4px",
                        }}
                    >
                        Aantal dagen voor analyse
                    </p>
                </div>
            </div>

            {/* POAS Margin */}
            {data.targetType === "POAS" && (
                <div>
                    <label className="label" htmlFor="w-margin">
                        Winstmarge (%) *
                    </label>
                    <input
                        id="w-margin"
                        className="input"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={data.profitMarginPct}
                        onChange={(e) =>
                            update({ profitMarginPct: e.target.value })
                        }
                        placeholder="35.00"
                    />
                    <p
                        style={{
                            fontSize: "0.7rem",
                            color: "var(--color-text-muted)",
                            marginTop: "4px",
                        }}
                    >
                        Gebruikt voor POAS: (omzet × marge - spend) / spend
                    </p>
                </div>
            )}
        </div>
    );
}

/* =================
   STEP 3: Website
   ================= */
function StepWebsite({
    data,
    update,
}: {
    data: WizardData;
    update: (fields: Partial<WizardData>) => void;
}) {
    return (
        <div className="animate-fade-in">
            <h2
                style={{
                    fontSize: "1.2rem",
                    fontWeight: 600,
                    marginBottom: "8px",
                }}
            >
                Website
            </h2>
            <p
                style={{
                    color: "var(--color-text-muted)",
                    fontSize: "0.85rem",
                    marginBottom: "28px",
                }}
            >
                Voeg optioneel een website toe voor monitoring
            </p>

            <div
                style={{
                    padding: "20px",
                    borderRadius: "12px",
                    background: "rgba(99, 102, 241, 0.05)",
                    border: "1px solid rgba(99, 102, 241, 0.15)",
                    marginBottom: "24px",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        marginBottom: "8px",
                    }}
                >
                    <Globe size={18} color="var(--color-brand-light)" />
                    <span
                        style={{
                            fontWeight: 600,
                            fontSize: "0.9rem",
                            color: "var(--color-text-primary)",
                        }}
                    >
                        Website Monitoring
                    </span>
                </div>
                <p
                    style={{
                        fontSize: "0.8rem",
                        color: "var(--color-text-muted)",
                        lineHeight: 1.5,
                    }}
                >
                    Als je een domein toevoegt, wordt er automatisch uptime monitoring
                    ingeschakeld. Je kunt later ook meer websites toevoegen.
                </p>
            </div>

            <div style={{ marginBottom: "24px" }}>
                <label className="label" htmlFor="w-domain">
                    Domein
                </label>
                <input
                    id="w-domain"
                    className="input"
                    value={data.domain}
                    onChange={(e) => update({ domain: e.target.value })}
                    placeholder="https://www.voorbeeld.nl"
                />
                <p
                    style={{
                        fontSize: "0.7rem",
                        color: "var(--color-text-muted)",
                        marginTop: "6px",
                    }}
                >
                    Optioneel — je kunt dit ook later instellen
                </p>
            </div>

            {!data.domain && (
                <button
                    type="button"
                    onClick={() => { }}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "10px 16px",
                        background: "transparent",
                        border: "1px dashed var(--color-border)",
                        borderRadius: "10px",
                        color: "var(--color-text-muted)",
                        cursor: "pointer",
                        fontSize: "0.8rem",
                        width: "100%",
                        justifyContent: "center",
                    }}
                >
                    <SkipForward size={14} />
                    Overslaan — later instellen
                </button>
            )}
        </div>
    );
}

/* ====================
   STEP 4: Bevestiging
   ==================== */
function StepBevestiging({ data }: { data: WizardData }) {
    const targetLabels: Record<string, string> = {
        CPA: "Cost per Acquisitie",
        ROAS: "Return on Ad Spend",
        POAS: "Profit on Ad Spend",
    };

    return (
        <div className="animate-fade-in">
            <h2
                style={{
                    fontSize: "1.2rem",
                    fontWeight: 600,
                    marginBottom: "8px",
                }}
            >
                Bevestiging
            </h2>
            <p
                style={{
                    color: "var(--color-text-muted)",
                    fontSize: "0.85rem",
                    marginBottom: "28px",
                }}
            >
                Controleer de gegevens en maak het project aan
            </p>

            {/* Summary Cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <SummarySection title="Bedrijfsgegevens" icon="🏢">
                    <SummaryRow label="Projectnaam" value={data.name} />
                    <SummaryRow
                        label="Branche"
                        value={data.industryType === "ECOMMERCE" ? "E-commerce" : "Leadgen"}
                    />
                </SummarySection>

                <SummarySection title="Targets" icon="🎯">
                    <SummaryRow
                        label="Target"
                        value={`${data.targetType} — ${targetLabels[data.targetType]}`}
                    />
                    <SummaryRow
                        label="Waarde"
                        value={`${data.targetValue} ${data.currency}`}
                    />
                    <SummaryRow label="Tolerantie" value={`±${data.tolerancePct}%`} />
                    <SummaryRow
                        label="Evaluatie Window"
                        value={`${data.evaluationWindowDays} dagen`}
                    />
                    {data.targetType === "POAS" && data.profitMarginPct && (
                        <SummaryRow
                            label="Winstmarge"
                            value={`${data.profitMarginPct}%`}
                        />
                    )}
                </SummarySection>

                <SummarySection title="Website" icon="🌐">
                    {data.domain ? (
                        <SummaryRow
                            label="Domein"
                            value={data.domain.startsWith('http') ? data.domain : `https://${data.domain}`}
                        />
                    ) : (
                        <p
                            style={{
                                fontSize: "0.8rem",
                                color: "var(--color-text-muted)",
                                fontStyle: "italic",
                            }}
                        >
                            Geen website ingesteld — kan later worden toegevoegd
                        </p>
                    )}
                </SummarySection>
            </div>
        </div>
    );
}

/* ================
   Helper Components
   ================ */
function SummarySection({
    title,
    icon,
    children,
}: {
    title: string;
    icon: string;
    children: React.ReactNode;
}) {
    return (
        <div
            style={{
                padding: "16px 20px",
                borderRadius: "10px",
                background: "rgba(51, 65, 85, 0.2)",
                border: "1px solid var(--color-border)",
            }}
        >
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "12px",
                }}
            >
                <span>{icon}</span>
                <span
                    style={{
                        fontWeight: 600,
                        fontSize: "0.85rem",
                        color: "var(--color-text-primary)",
                    }}
                >
                    {title}
                </span>
            </div>
            {children}
        </div>
    );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
    return (
        <div
            style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "6px 0",
                borderBottom: "1px solid rgba(51, 65, 85, 0.15)",
                fontSize: "0.8rem",
            }}
        >
            <span style={{ color: "var(--color-text-muted)" }}>{label}</span>
            <span style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>
                {value}
            </span>
        </div>
    );
}
