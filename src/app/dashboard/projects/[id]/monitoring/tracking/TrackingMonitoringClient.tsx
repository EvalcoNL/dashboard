"use client";

import React, { useState } from "react";
import {
    Activity,
    Search,
    CheckCircle2,
    AlertTriangle,
    RefreshCw,
    Globe,
    ShieldCheck,
    Settings,
    ChevronRight,
    ExternalLink
} from "lucide-react";
import { useNotification } from "@/components/NotificationProvider";
import { useRouter } from "next/navigation";

interface TrackingMonitoringClientProps {
    clientId: string;
    clientName: string;
    domains: any[];
}

export default function TrackingMonitoringClient({
    clientId,
    clientName,
    domains
}: TrackingMonitoringClientProps) {
    const { showToast } = useNotification();
    const router = useRouter();
    const [isSaving, setIsSaving] = useState<string | null>(null);

    const updatePixelConfig = async (domainId: string, key: string, val: any) => {
        setIsSaving(domainId);
        try {
            const domain = domains.find(d => d.id === domainId);
            const currentConfig = domain.config || {};
            const pixelConfig = currentConfig.pixelConfig || { gtm: true, ga4: true, meta: false };

            const newConfig = {
                ...currentConfig,
                pixelConfig: { ...pixelConfig, [key]: val }
            };

            if (key === 'active') {
                newConfig.pixelMonitoring = val;
            }

            const res = await fetch(`/api/data-sources/${domainId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ config: newConfig }),
            });

            if (!res.ok) throw new Error("Failed to update settings");
            showToast("success", "Instellingen bijgewerkt");
            router.refresh();
        } catch (error) {
            console.error(error);
            showToast("error", "Fout bij opslaan");
        } finally {
            setIsSaving(null);
        }
    };

    return (
        <div style={{ padding: "32px", maxWidth: "1200px", margin: "0 auto" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "32px" }}>
                <div>
                    <h1 style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--color-text-primary)", margin: 0 }}>
                        Data Tracking & Monitoring
                    </h1>
                    <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem", margin: "4px 0 0 0" }}>
                        Beheer en monitor de aanwezigheid van conversie pixels op je domeinen
                    </p>
                </div>
                <div style={{
                    display: "flex", alignItems: "center", gap: "12px", padding: "8px 16px",
                    background: "rgba(99, 102, 241, 0.1)", borderRadius: "8px", border: "1px solid rgba(99, 102, 241, 0.2)"
                }}>
                    <ShieldCheck size={18} color="var(--color-brand)" />
                    <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--color-text-primary)" }}>
                        {domains.filter(d => d.config?.pixelMonitoring).length} Domeinen onder toezicht
                    </span>
                </div>
            </div>

            {/* Domains List */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {domains.map((domain) => {
                    const audit = domain.config?.lastPixelAudit;
                    const isActive = domain.config?.pixelMonitoring;
                    const pCfg = domain.config?.pixelConfig || { gtm: true, ga4: true, meta: false };

                    return (
                        <div key={domain.id} className="glass-card" style={{
                            padding: "24px",
                            display: "grid",
                            gridTemplateColumns: "1fr 300px 200px",
                            gap: "32px",
                            alignItems: "center",
                            border: isActive ? "1px solid var(--color-brand-alpha)" : "1px solid var(--color-border)",
                        }}>
                            {/* Domain Info */}
                            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                                <div style={{
                                    width: "48px", height: "48px", borderRadius: "12px",
                                    background: "var(--color-surface-elevated)", display: "flex",
                                    alignItems: "center", justifyContent: "center", border: "1px solid var(--color-border)"
                                }}>
                                    <Globe size={24} color={isActive ? "var(--color-brand)" : "var(--color-text-muted)"} />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--color-text-primary)", margin: 0 }}>
                                        {domain.name || domain.externalId}
                                    </h3>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                                        <a href={`https://${domain.externalId}`} target="_blank" style={{
                                            fontSize: "0.8rem", color: "var(--color-text-muted)", textDecoration: "none"
                                        }}>
                                            {domain.externalId}
                                        </a>
                                        <div style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--color-text-muted)" }} />
                                        <span style={{ fontSize: "0.8rem", color: isActive ? "#10b981" : "var(--color-text-muted)", fontWeight: 600 }}>
                                            {isActive ? "Monitoring Actief" : "Monitoring Uit"}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Pixel Selection Toggles */}
                            <div style={{ display: "flex", gap: "8px" }}>
                                {[
                                    { key: 'gtm', label: 'GTM' },
                                    { key: 'ga4', label: 'GA4' },
                                    { key: 'meta', label: 'Meta' }
                                ].map(p => (
                                    <button
                                        key={p.key}
                                        onClick={() => updatePixelConfig(domain.id, p.key, !(pCfg as any)[p.key])}
                                        style={{
                                            flex: 1,
                                            padding: "8px",
                                            borderRadius: "8px",
                                            background: (pCfg as any)[p.key] ? "rgba(99, 102, 241, 0.1)" : "rgba(255,255,255,0.02)",
                                            border: (pCfg as any)[p.key] ? "1px solid var(--color-brand)" : "1px solid var(--color-border)",
                                            color: (pCfg as any)[p.key] ? "var(--color-brand)" : "var(--color-text-muted)",
                                            fontSize: "0.75rem",
                                            fontWeight: 700,
                                            cursor: "pointer",
                                            transition: "all 0.2s"
                                        }}
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>

                            {/* Action / Quick Status */}
                            <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "16px" }}>
                                {isActive && audit && (
                                    <div style={{ display: "flex", gap: "6px" }}>
                                        <div title="GTM Status" style={{ width: 10, height: 10, borderRadius: "50%", background: audit.gtm ? "#10b981" : "#ef4444" }} />
                                        <div title="GA4 Status" style={{ width: 10, height: 10, borderRadius: "50%", background: audit.ga4 ? "#10b981" : "#ef4444" }} />
                                        <div title="Meta Status" style={{ width: 10, height: 10, borderRadius: "50%", background: audit.meta ? "#10b981" : "#ef4444" }} />
                                    </div>
                                )}

                                <button
                                    onClick={() => updatePixelConfig(domain.id, 'active', !isActive)}
                                    disabled={isSaving === domain.id}
                                    style={{
                                        padding: "10px 20px",
                                        borderRadius: "10px",
                                        background: isActive ? "rgba(239, 68, 68, 0.1)" : "var(--color-brand)",
                                        border: isActive ? "1px solid #ef4444" : "none",
                                        color: isActive ? "#ef4444" : "white",
                                        fontSize: "0.85rem",
                                        fontWeight: 700,
                                        cursor: "pointer",
                                        minWidth: "120px"
                                    }}
                                >
                                    {isSaving === domain.id ? "..." : (isActive ? "Uitzetten" : "Aanzetten")}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function PixelStatusItem({ label, active }: { label: string; active: boolean }) {
    return (
        <div style={{
            display: "flex", alignItems: "center", gap: "10px", padding: "8px 12px",
            background: "rgba(255,255,255,0.03)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)"
        }}>
            {active ? (
                <CheckCircle2 size={14} color="#10b981" />
            ) : (
                <AlertTriangle size={14} color="#ef4444" />
            )}
            <span style={{ fontSize: "0.8rem", fontWeight: 600, color: active ? "var(--color-text-primary)" : "#ef4444" }}>
                {label}
            </span>
        </div>
    );
}
