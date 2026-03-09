"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Tag, Globe, RefreshCw, CheckCircle2, XCircle,
    AlertTriangle, Clock, ExternalLink, Code2,
} from "lucide-react";

interface Domain {
    id: string;
    name: string;
    value: string;
    createdAt: string | null;
}

interface GtmContainer {
    containerId: string;
    domain: string;
    status: "active" | "inactive" | "not_found";
    lastChecked: string;
    tagCount: number;
    tags: GtmTag[];
}

interface GtmTag {
    id: string;
    name: string;
    type: string; // e.g. "Google Analytics", "Facebook Pixel", "Google Ads"
    status: "firing" | "not_firing" | "paused";
    lastFired: string | null;
}

interface Props {
    projectId: string;
    clientName: string;
    domains: Domain[];
}

export default function GtmMonitoringClient({ projectId, clientName, domains }: Props) {
    const [containers, setContainers] = useState<GtmContainer[]>([]);
    const [loading, setLoading] = useState(true);
    const [checking, setChecking] = useState(false);
    const [selectedDomain, setSelectedDomain] = useState<string | null>(null);

    const fetchContainers = useCallback(async () => {
        try {
            const res = await fetch(`/api/projects/${projectId}/gtm-containers`);
            const data = await res.json();
            if (data.success) {
                setContainers(data.containers || []);
            }
        } catch {
            // Silent fail
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        fetchContainers();
    }, [fetchContainers]);

    const runCheck = async () => {
        setChecking(true);
        try {
            const res = await fetch(`/api/projects/${projectId}/gtm-containers`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ domains: domains.map(d => d.value) }),
            });
            const data = await res.json();
            if (data.success) {
                setContainers(data.containers || []);
            }
        } catch {
            // Silent fail
        } finally {
            setChecking(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const map: Record<string, { color: string; bg: string; label: string; icon: React.ReactNode }> = {
            active: { color: "#10b981", bg: "rgba(16, 185, 129, 0.1)", label: "Actief", icon: <CheckCircle2 size={14} /> },
            firing: { color: "#10b981", bg: "rgba(16, 185, 129, 0.1)", label: "Firing", icon: <CheckCircle2 size={14} /> },
            inactive: { color: "#f59e0b", bg: "rgba(245, 158, 11, 0.1)", label: "Inactief", icon: <AlertTriangle size={14} /> },
            not_firing: { color: "#ef4444", bg: "rgba(239, 68, 68, 0.1)", label: "Niet actief", icon: <XCircle size={14} /> },
            not_found: { color: "#6b7280", bg: "rgba(107, 114, 128, 0.1)", label: "Niet gevonden", icon: <XCircle size={14} /> },
            paused: { color: "#6b7280", bg: "rgba(107, 114, 128, 0.1)", label: "Gepauzeerd", icon: <Clock size={14} /> },
        };
        const s = map[status] || map.not_found;
        return (
            <span style={{
                display: "inline-flex", alignItems: "center", gap: "6px",
                padding: "4px 10px", borderRadius: "6px", fontSize: "0.75rem",
                fontWeight: 600, color: s.color, background: s.bg,
            }}>
                {s.icon} {s.label}
            </span>
        );
    };

    const activeContainer = containers.find(c => c.domain === selectedDomain);

    return (
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
            {/* Header */}
            <div style={{ marginBottom: "32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <div style={{
                        padding: "12px", background: "rgba(99, 102, 241, 0.1)",
                        borderRadius: "12px", color: "#6366f1"
                    }}>
                        <Tag size={24} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--color-text-primary)", margin: 0 }}>
                            GTM Monitoring
                        </h1>
                        <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem", margin: 0 }}>
                            {clientName} — Google Tag Manager containers & tags
                        </p>
                    </div>
                </div>
                <button
                    onClick={runCheck}
                    disabled={checking || domains.length === 0}
                    style={{
                        display: "flex", alignItems: "center", gap: "8px",
                        padding: "10px 20px", borderRadius: "10px", border: "none",
                        background: checking ? "var(--color-surface-elevated)" : "#6366f1",
                        color: "white", fontWeight: 600, cursor: checking ? "wait" : "pointer",
                        fontSize: "0.875rem", transition: "all 0.2s ease",
                    }}
                >
                    <RefreshCw size={16} className={checking ? "spin" : ""} />
                    {checking ? "Controleren..." : "Check Containers"}
                </button>
            </div>

            {/* Stats Row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}>
                {[
                    { label: "Domeinen", value: domains.length, icon: <Globe size={18} />, color: "#6366f1" },
                    { label: "Containers", value: containers.length, icon: <Code2 size={18} />, color: "#0ea5e9" },
                    { label: "Actief", value: containers.filter(c => c.status === "active").length, icon: <CheckCircle2 size={18} />, color: "#10b981" },
                    { label: "Tags", value: containers.reduce((sum, c) => sum + c.tagCount, 0), icon: <Tag size={18} />, color: "#f59e0b" },
                ].map((stat, i) => (
                    <div key={i} style={{
                        padding: "20px", borderRadius: "12px",
                        background: "var(--color-surface-elevated)",
                        border: "1px solid var(--color-border)",
                    }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                            <div style={{ color: stat.color }}>{stat.icon}</div>
                            <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", fontWeight: 600, textTransform: "uppercase" }}>
                                {stat.label}
                            </span>
                        </div>
                        <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--color-text-primary)" }}>
                            {stat.value}
                        </div>
                    </div>
                ))}
            </div>

            {/* Domains List */}
            {loading ? (
                <div style={{ textAlign: "center", padding: "64px", color: "var(--color-text-muted)" }}>
                    Laden...
                </div>
            ) : domains.length === 0 ? (
                <div style={{
                    textAlign: "center", padding: "64px",
                    background: "var(--color-surface-elevated)",
                    borderRadius: "12px", border: "1px solid var(--color-border)",
                }}>
                    <Globe size={48} style={{ color: "var(--color-text-muted)", marginBottom: "16px" }} />
                    <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}>
                        Geen domeinen gevonden. Voeg eerst een website toe onder Data &gt; Bronnen.
                    </p>
                </div>
            ) : (
                <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: "16px" }}>
                    {/* Sidebar: Domain List */}
                    <div style={{
                        background: "var(--color-surface-elevated)",
                        borderRadius: "12px", border: "1px solid var(--color-border)",
                        overflow: "hidden",
                    }}>
                        <div style={{
                            padding: "16px", borderBottom: "1px solid var(--color-border)",
                            fontSize: "0.75rem", fontWeight: 700, color: "var(--color-text-muted)",
                            textTransform: "uppercase", letterSpacing: "0.05em",
                        }}>
                            Domeinen
                        </div>
                        {domains.map(domain => {
                            const container = containers.find(c => c.domain === domain.value);
                            const active = selectedDomain === domain.value;
                            return (
                                <button
                                    key={domain.id}
                                    onClick={() => setSelectedDomain(active ? null : domain.value)}
                                    style={{
                                        display: "flex", alignItems: "center", justifyContent: "space-between",
                                        width: "100%", padding: "14px 16px", border: "none",
                                        background: active ? "rgba(99, 102, 241, 0.08)" : "transparent",
                                        color: "var(--color-text-primary)", cursor: "pointer",
                                        borderBottom: "1px solid var(--color-border)",
                                        transition: "all 0.15s ease", textAlign: "left",
                                    }}
                                >
                                    <div>
                                        <div style={{ fontSize: "0.875rem", fontWeight: 500 }}>{domain.name || domain.value}</div>
                                        <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>{domain.value}</div>
                                    </div>
                                    {container && getStatusBadge(container.status)}
                                </button>
                            );
                        })}
                    </div>

                    {/* Main: Container Details */}
                    <div style={{
                        background: "var(--color-surface-elevated)",
                        borderRadius: "12px", border: "1px solid var(--color-border)",
                        padding: "24px",
                    }}>
                        {!selectedDomain ? (
                            <div style={{ textAlign: "center", padding: "64px", color: "var(--color-text-muted)" }}>
                                <Code2 size={48} style={{ marginBottom: "16px", opacity: 0.5 }} />
                                <p>Selecteer een domein om de container details te bekijken.</p>
                                {containers.length === 0 && (
                                    <p style={{ fontSize: "0.8125rem" }}>
                                        Klik op &ldquo;Check Containers&rdquo; om je GTM containers te detecteren.
                                    </p>
                                )}
                            </div>
                        ) : !activeContainer ? (
                            <div style={{ textAlign: "center", padding: "64px", color: "var(--color-text-muted)" }}>
                                <AlertTriangle size={48} style={{ marginBottom: "16px", color: "#f59e0b" }} />
                                <p>Geen GTM container gevonden voor dit domein.</p>
                                <p style={{ fontSize: "0.8125rem" }}>
                                    Klik op &ldquo;Check Containers&rdquo; om het domein te scannen.
                                </p>
                            </div>
                        ) : (
                            <>
                                {/* Container Info */}
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
                                    <div>
                                        <h2 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700, color: "var(--color-text-primary)" }}>
                                            Container: {activeContainer.containerId}
                                        </h2>
                                        <p style={{ margin: "4px 0 0", fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
                                            Laatst gecontroleerd: {new Date(activeContainer.lastChecked).toLocaleString("nl-NL")}
                                        </p>
                                    </div>
                                    {getStatusBadge(activeContainer.status)}
                                </div>

                                {/* Tags Table */}
                                {activeContainer.tags.length > 0 ? (
                                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                        <thead>
                                            <tr style={{ borderBottom: "2px solid var(--color-border)" }}>
                                                <th style={{ padding: "12px", textAlign: "left", fontSize: "0.75rem", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>Tag</th>
                                                <th style={{ padding: "12px", textAlign: "left", fontSize: "0.75rem", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>Type</th>
                                                <th style={{ padding: "12px", textAlign: "center", fontSize: "0.75rem", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>Status</th>
                                                <th style={{ padding: "12px", textAlign: "right", fontSize: "0.75rem", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>Laatst Fired</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {activeContainer.tags.map(tag => (
                                                <tr key={tag.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                                                    <td style={{ padding: "12px", fontSize: "0.875rem", fontWeight: 500, color: "var(--color-text-primary)" }}>{tag.name}</td>
                                                    <td style={{ padding: "12px", fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>{tag.type}</td>
                                                    <td style={{ padding: "12px", textAlign: "center" }}>{getStatusBadge(tag.status)}</td>
                                                    <td style={{ padding: "12px", textAlign: "right", fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
                                                        {tag.lastFired ? new Date(tag.lastFired).toLocaleString("nl-NL") : "—"}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div style={{ textAlign: "center", padding: "32px", color: "var(--color-text-muted)", fontSize: "0.875rem" }}>
                                        Geen tags gevonden in deze container.
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}

            <style jsx>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .spin {
                    animation: spin 1s linear infinite;
                }
                button:hover {
                    opacity: 0.9;
                }
            `}</style>
        </div>
    );
}
