"use client";

import React, { useState } from "react";
import {
    Activity,
    CheckCircle2,
    AlertTriangle,
    RefreshCw,
    Globe,
    ShieldCheck,
    Clock,
    Scan,
    XCircle,
} from "lucide-react";
import { useNotification } from "@/components/NotificationProvider";
import { useRouter } from "next/navigation";

interface TrackingMonitoringClientProps {
    projectId: string;
    clientName: string;
    domains: any[];
}

export default function TrackingMonitoringClient({
    projectId,
    clientName,
    domains
}: TrackingMonitoringClientProps) {
    const { showToast } = useNotification();
    const router = useRouter();
    const [isSaving, setIsSaving] = useState<string | null>(null);
    const [isScanning, setIsScanning] = useState<string | null>(null);

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

    const handleScan = async (domainId: string) => {
        setIsScanning(domainId);
        try {
            const res = await fetch(`/api/projects/${projectId}/tracking-scan`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ domainId }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Scan mislukt");
            }

            const data = await res.json();
            showToast("success", `Scan voltooid voor ${data.domain}`);
            router.refresh();
        } catch (error: any) {
            showToast("error", error.message || "Scan mislukt");
        } finally {
            setIsScanning(null);
        }
    };

    // Summary stats
    const activeDomains = domains.filter(d => d.config?.pixelMonitoring);
    const domainsWithAudit = domains.filter(d => d.config?.lastPixelAudit);
    const missingPixels = domainsWithAudit.filter(d => {
        const a = d.config?.lastPixelAudit;
        const pc = d.config?.pixelConfig || { gtm: true, ga4: true, meta: false };
        return (pc.gtm && !a?.gtm) || (pc.ga4 && !a?.ga4) || (pc.meta && !a?.meta);
    });

    return (
        <div style={{ padding: "32px", maxWidth: "1200px", margin: "0 auto" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "32px", flexWrap: "wrap", gap: "16px" }}>
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
                        {activeDomains.length} Domeinen onder toezicht
                    </span>
                </div>
            </div>

            {/* Summary Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "32px" }}>
                <div className="glass-card" style={{ padding: "20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                        <Globe size={18} color="var(--color-brand)" />
                        <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", fontWeight: 600 }}>Totaal Domeinen</span>
                    </div>
                    <span style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--color-text-primary)" }}>{domains.length}</span>
                </div>

                <div className="glass-card" style={{ padding: "20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                        <CheckCircle2 size={18} color="#10b981" />
                        <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", fontWeight: 600 }}>Pixels Gevonden</span>
                    </div>
                    <span style={{ fontSize: "1.8rem", fontWeight: 700, color: "#10b981" }}>
                        {domainsWithAudit.filter(d => {
                            const a = d.config?.lastPixelAudit;
                            const pc = d.config?.pixelConfig || { gtm: true, ga4: true, meta: false };
                            return (!pc.gtm || a?.gtm) && (!pc.ga4 || a?.ga4) && (!pc.meta || a?.meta);
                        }).length}
                    </span>
                </div>

                <div className="glass-card" style={{ padding: "20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                        <AlertTriangle size={18} color="#f59e0b" />
                        <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", fontWeight: 600 }}>Ontbrekende Pixels</span>
                    </div>
                    <span style={{ fontSize: "1.8rem", fontWeight: 700, color: "#f59e0b" }}>{missingPixels.length}</span>
                </div>

                <div className="glass-card" style={{ padding: "20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                        <Activity size={18} color="var(--color-text-secondary)" />
                        <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", fontWeight: 600 }}>Gescand</span>
                    </div>
                    <span style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--color-text-primary)" }}>{domainsWithAudit.length}</span>
                </div>
            </div>

            {/* Domains List */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {domains.map((domain) => {
                    const audit = domain.config?.lastPixelAudit;
                    const isActive = domain.config?.pixelMonitoring;
                    const pCfg = domain.config?.pixelConfig || { gtm: true, ga4: true, meta: false };
                    const scanHistory = domain.config?.scanHistory || [];

                    return (
                        <div key={domain.id} className="glass-card" style={{ padding: "24px", border: isActive ? "1px solid var(--color-brand-alpha, rgba(99,102,241,0.2))" : "1px solid var(--color-border)" }}>
                            {/* Domain Header */}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "16px", alignItems: "center", marginBottom: audit ? "20px" : "0" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                                    <div style={{
                                        width: "48px", height: "48px", borderRadius: "12px",
                                        background: "var(--color-surface)", display: "flex",
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

                                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                    {/* Pixel toggles */}
                                    <div style={{ display: "flex", gap: "6px" }}>
                                        {[
                                            { key: 'gtm', label: 'GTM' },
                                            { key: 'ga4', label: 'GA4' },
                                            { key: 'meta', label: 'Meta' }
                                        ].map(p => (
                                            <button
                                                key={p.key}
                                                onClick={() => updatePixelConfig(domain.id, p.key, !(pCfg as any)[p.key])}
                                                style={{
                                                    padding: "6px 12px",
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

                                    {/* Scan button */}
                                    <button
                                        onClick={() => handleScan(domain.id)}
                                        disabled={isScanning === domain.id}
                                        style={{
                                            display: "flex", alignItems: "center", gap: "6px",
                                            padding: "8px 16px", borderRadius: "8px",
                                            background: "rgba(99, 102, 241, 0.1)",
                                            border: "1px solid rgba(99, 102, 241, 0.3)",
                                            color: "var(--color-brand)",
                                            fontSize: "0.8rem", fontWeight: 600,
                                            cursor: isScanning === domain.id ? "not-allowed" : "pointer",
                                            transition: "all 0.2s",
                                            opacity: isScanning === domain.id ? 0.6 : 1
                                        }}
                                    >
                                        {isScanning === domain.id ? (
                                            <RefreshCw size={14} className="animate-spin" />
                                        ) : (
                                            <Scan size={14} />
                                        )}
                                        {isScanning === domain.id ? "Scannen..." : "Nu Scannen"}
                                    </button>

                                    {/* Active toggle */}
                                    <button
                                        onClick={() => updatePixelConfig(domain.id, 'active', !isActive)}
                                        disabled={isSaving === domain.id}
                                        style={{
                                            padding: "8px 16px", borderRadius: "8px",
                                            background: isActive ? "rgba(239, 68, 68, 0.1)" : "var(--color-brand)",
                                            border: isActive ? "1px solid #ef4444" : "none",
                                            color: isActive ? "#ef4444" : "white",
                                            fontSize: "0.8rem", fontWeight: 700,
                                            cursor: "pointer", minWidth: "100px"
                                        }}
                                    >
                                        {isSaving === domain.id ? "..." : (isActive ? "Uitzetten" : "Aanzetten")}
                                    </button>
                                </div>
                            </div>

                            {/* Scan Results */}
                            {audit && (
                                <div style={{
                                    padding: "16px", borderRadius: "12px",
                                    background: "var(--color-surface)",
                                    border: "1px solid var(--color-border)"
                                }}>
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                                        <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>
                                            Laatste Scan Resultaten
                                        </span>
                                        {audit.scannedAt && (
                                            <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                                                <Clock size={12} />
                                                {new Date(audit.scannedAt).toLocaleString("nl-NL")}
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                                        <PixelStatusItem label="Google Tag Manager" active={audit.gtm} tracked={pCfg.gtm} />
                                        <PixelStatusItem label="Google Analytics 4" active={audit.ga4} tracked={pCfg.ga4} />
                                        <PixelStatusItem label="Meta Pixel" active={audit.meta} tracked={pCfg.meta} />
                                    </div>
                                    {audit.error && (
                                        <div style={{
                                            marginTop: "12px", padding: "8px 12px",
                                            background: "rgba(239, 68, 68, 0.08)",
                                            borderRadius: "8px", border: "1px solid rgba(239, 68, 68, 0.15)",
                                            fontSize: "0.75rem", color: "#f87171",
                                            display: "flex", alignItems: "center", gap: "6px"
                                        }}>
                                            <XCircle size={14} />
                                            {audit.error}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Scan History */}
                            {scanHistory.length > 1 && (
                                <div style={{ marginTop: "12px" }}>
                                    <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-muted)", display: "block", marginBottom: "8px" }}>
                                        Scan Historie (laatste {Math.min(scanHistory.length, 5)})
                                    </span>
                                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                                        {scanHistory.slice(0, 5).map((scan: any, idx: number) => {
                                            const allOk = (!pCfg.gtm || scan.gtm) && (!pCfg.ga4 || scan.ga4) && (!pCfg.meta || scan.meta);
                                            return (
                                                <div key={idx} title={`${new Date(scan.timestamp).toLocaleString("nl-NL")} — ${allOk ? "Alles OK" : "Ontbrekend"}`} style={{
                                                    width: "28px", height: "28px", borderRadius: "6px",
                                                    background: scan.error ? "rgba(239, 68, 68, 0.15)" : allOk ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
                                                    display: "flex", alignItems: "center", justifyContent: "center",
                                                    border: `1px solid ${scan.error ? "rgba(239,68,68,0.3)" : allOk ? "rgba(16,185,129,0.3)" : "rgba(245,158,11,0.3)"}`
                                                }}>
                                                    {scan.error ? (
                                                        <XCircle size={12} color="#ef4444" />
                                                    ) : allOk ? (
                                                        <CheckCircle2 size={12} color="#10b981" />
                                                    ) : (
                                                        <AlertTriangle size={12} color="#f59e0b" />
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function PixelStatusItem({ label, active, tracked }: { label: string; active: boolean; tracked: boolean }) {
    if (!tracked) return null;

    return (
        <div style={{
            display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px",
            background: active ? "rgba(16, 185, 129, 0.08)" : "rgba(239, 68, 68, 0.08)",
            borderRadius: "8px",
            border: `1px solid ${active ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)"}`,
            flex: "1", minWidth: "180px"
        }}>
            {active ? (
                <CheckCircle2 size={16} color="#10b981" />
            ) : (
                <AlertTriangle size={16} color="#ef4444" />
            )}
            <span style={{ fontSize: "0.8rem", fontWeight: 600, color: active ? "#10b981" : "#ef4444" }}>
                {label}
            </span>
            <span style={{
                marginLeft: "auto", fontSize: "0.7rem", fontWeight: 700,
                padding: "2px 8px", borderRadius: "4px",
                background: active ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                color: active ? "#10b981" : "#ef4444"
            }}>
                {active ? "Gevonden" : "Ontbreekt"}
            </span>
        </div>
    );
}
