"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Globe, Loader2, Server, Lock, RotateCcw } from "lucide-react";
import Link from "next/link";

interface DomainConfig {
    uptime?: boolean;
    uptimeInterval?: number;
    ssl?: boolean;
    speed?: boolean;
}

export default function EditDomainForm({
    clientId,
    sourceId,
    initialDomain,
    initialConfig
}: {
    clientId: string;
    sourceId: string;
    initialDomain: string;
    initialConfig?: DomainConfig;
}) {
    const router = useRouter();

    const [domain, setDomain] = useState(initialDomain);
    const [config, setConfig] = useState({
        uptime: initialConfig?.uptime ?? true,
        uptimeInterval: initialConfig?.uptimeInterval ?? 5,
        ssl: initialConfig?.ssl ?? true,
        speed: initialConfig?.speed ?? true,
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [or, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<boolean>(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(false);

        let normalizedDomain = domain.trim();
        if (!normalizedDomain) {
            setError("Voer een domeinnaam in.");
            return;
        }

        try {
            const urlString = normalizedDomain.startsWith('http') ? normalizedDomain : `https://${normalizedDomain}`;
            const url = new URL(urlString);
            normalizedDomain = url.hostname;
        } catch (error: any) {
            setError("Voer een geldige domeinnaam in (bijv. voorbeeld.nl).");
            return;
        }

        setIsSubmitting(true);

        try {
            const res = await fetch(`/api/data-sources/${sourceId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: normalizedDomain,
                    externalId: normalizedDomain,
                    config: config
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.or || "Er is een fout opgetreden bij het opslaan van wijzigingen.");
            }

            setSuccess(true);
            router.refresh(); // Refresh to update server components that might use this specific data
        } catch (error: any) {
            console.error("Submission failed:", error);
            setError(error.message || "Er is een fout opgetreden.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div style={{ padding: "32px", maxWidth: "800px", margin: "0 auto" }}>
            <Link
                href={`/dashboard/projects/${clientId}/data/sources`}
                style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    color: "var(--color-text-muted)",
                    textDecoration: "none",
                    fontSize: "0.85rem",
                    marginBottom: "24px",
                }}
            >
                <ArrowLeft size={16} /> Terug naar data sources
            </Link>

            <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "8px" }}>
                Domein Configuratie Bewerken
            </h1>
            <p style={{ color: "var(--color-text-secondary)", marginBottom: "40px" }}>
                Wijzig de eigenschappen of monitoring opties voor {initialDomain}.
            </p>

            <form onSubmit={handleSubmit} className="glass-card" style={{ padding: "32px" }}>
                {or && (
                    <div style={{
                        padding: "16px",
                        background: "rgba(239, 68, 68, 0.1)",
                        color: "#ef4444",
                        borderRadius: "8px",
                        marginBottom: "24px",
                        fontSize: "0.875rem",
                        fontWeight: 500
                    }}>
                        {or}
                    </div>
                )}

                {success && (
                    <div style={{
                        padding: "16px",
                        background: "rgba(16, 185, 129, 0.1)",
                        color: "#10b981",
                        borderRadius: "8px",
                        marginBottom: "24px",
                        fontSize: "0.875rem",
                        fontWeight: 500
                    }}>
                        Instellingen succesvol opgeslagen!
                    </div>
                )}

                <div style={{ marginBottom: "32px" }}>
                    <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, color: "var(--color-text-primary)", marginBottom: "8px" }}>
                        Domeinnaam
                    </label>
                    <div style={{ position: "relative" }}>
                        <div style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted)" }}>
                            <Globe size={20} />
                        </div>
                        <input
                            type="text"
                            value={domain}
                            onChange={(e) => setDomain(e.target.value)}
                            placeholder="website.nl"
                            style={{
                                width: "100%",
                                padding: "12px 16px 12px 48px",
                                borderRadius: "8px",
                                background: "rgba(255,255,255,0.03)",
                                border: "1px solid var(--color-border)",
                                color: "var(--color-text-primary)",
                                outline: "none",
                                fontSize: "1rem"
                            }}
                        />
                    </div>
                </div>

                <div style={{ marginBottom: "32px" }}>
                    <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, color: "var(--color-text-primary)", marginBottom: "8px" }}>
                        Globale Scan Interval (minuten)
                    </label>
                    <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", margin: "0 0 16px 0" }}>
                        Hoe vaak moet de data (zoals online status en certificaatgeldigheid) worden bijgewerkt?
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: "16px", background: "rgba(255,255,255,0.02)", padding: "16px", borderRadius: "8px", border: "1px solid var(--color-border)" }}>
                        <input
                            type="range"
                            min="1"
                            max="60"
                            value={config.uptimeInterval}
                            onChange={(e) => setConfig(prev => ({ ...prev, uptimeInterval: parseInt(e.target.value) }))}
                            style={{ flex: 1, cursor: "pointer" }}
                        />
                        <span style={{ fontSize: "0.875rem", color: "var(--color-brand)", fontWeight: 600, width: "60px", textAlign: "right" }}>
                            {config.uptimeInterval} min
                        </span>
                    </div>
                </div>

                <div style={{ marginBottom: "32px" }}>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--color-text-primary)", marginBottom: "16px" }}>
                        Monitoring Opties
                    </h3>

                    <div style={{ display: "grid", gap: "16px" }}>
                        {/* Option: Uptime */}
                        <div style={{
                            background: "rgba(255,255,255,0.02)",
                            border: "1px solid var(--color-border)",
                            borderRadius: "8px",
                            overflow: "hidden"
                        }}>
                            <div style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "16px",
                                cursor: "pointer"
                            }} onClick={() => setConfig(prev => ({ ...prev, uptime: !prev.uptime }))}>
                                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                                    <div style={{
                                        width: "40px",
                                        height: "40px",
                                        borderRadius: "8px",
                                        background: "rgba(99, 102, 241, 0.1)",
                                        color: "#6366f1",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center"
                                    }}>
                                        <Server size={20} />
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 600, color: "var(--color-text-primary)" }}>Uptime Monitoring</div>
                                        <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Controleer periodiek of de website online is</div>
                                    </div>
                                </div>
                                <Toggle checked={config.uptime} />
                            </div>

                        </div>

                        {/* Option: SSL */}
                        <div style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "16px",
                            background: "rgba(255,255,255,0.02)",
                            border: "1px solid var(--color-border)",
                            borderRadius: "8px",
                            cursor: "pointer"
                        }} onClick={() => setConfig(prev => ({ ...prev, ssl: !prev.ssl }))}>
                            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                                <div style={{
                                    width: "40px",
                                    height: "40px",
                                    borderRadius: "8px",
                                    background: "rgba(16, 185, 129, 0.1)",
                                    color: "#10b981",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center"
                                }}>
                                    <Lock size={20} />
                                </div>
                                <div>
                                    <div style={{ fontWeight: 600, color: "var(--color-text-primary)" }}>SSL & Domein Check</div>
                                    <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Krijg waarschuwingen voordat certificaten verlopen</div>
                                </div>
                            </div>
                            <Toggle checked={config.ssl} />
                        </div>

                        {/* Option: Page Speed */}
                        <div style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "16px",
                            background: "rgba(255,255,255,0.02)",
                            border: "1px solid var(--color-border)",
                            borderRadius: "8px",
                            cursor: "pointer"
                        }} onClick={() => setConfig(prev => ({ ...prev, speed: !prev.speed }))}>
                            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                                <div style={{
                                    width: "40px",
                                    height: "40px",
                                    borderRadius: "8px",
                                    background: "rgba(245, 158, 11, 0.1)",
                                    color: "#f59e0b",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center"
                                }}>
                                    <RotateCcw size={20} />
                                </div>
                                <div>
                                    <div style={{ fontWeight: 600, color: "var(--color-text-primary)" }}>Page Speed Monitoring</div>
                                    <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Dagelijkse performance metingen via Google Lighthouse</div>
                                </div>
                            </div>
                            <Toggle checked={config.speed} />
                        </div>
                    </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "12px 24px",
                            borderRadius: "8px",
                            border: "none",
                            background: "var(--color-brand)",
                            color: "white",
                            cursor: isSubmitting ? "not-allowed" : "pointer",
                            opacity: isSubmitting ? 0.7 : 1,
                            fontWeight: 600
                        }}
                    >
                        {isSubmitting && <Loader2 size={18} className="animate-spin" />}
                        Opslaan
                    </button>
                </div>
            </form>
        </div>
    );
}

function Toggle({ checked }: { checked: boolean }) {
    return (
        <div style={{
            width: "44px",
            height: "24px",
            background: checked ? "var(--color-brand)" : "rgba(255,255,255,0.1)",
            borderRadius: "24px",
            position: "relative",
            transition: "all 0.2s ease"
        }}>
            <div style={{
                position: "absolute",
                top: "2px",
                left: checked ? "22px" : "2px",
                width: "20px",
                height: "20px",
                background: "white",
                borderRadius: "50%",
                transition: "all 0.2s ease",
                boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
            }} />
        </div>
    );
}
