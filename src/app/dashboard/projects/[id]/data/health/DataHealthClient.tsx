"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import {
    Activity, AlertTriangle, CheckCircle2, Clock, Database,
    RefreshCw, Loader2, XCircle, Pause, Play, BarChart3,
    AlertCircle, Wifi, WifiOff, ShieldCheck,
} from "lucide-react";

// ─── Types ───

interface ConnectionHealth {
    connectionId: string;
    connectorName: string;
    connectorSlug: string;
    status: "healthy" | "warning" | "error" | "stale" | "never_synced";
    lastSyncAt: string | null;
    lastSyncStatus: string | null;
    minutesSinceLastSync: number | null;
    syncInterval: number;
    recentFailures: number;
    totalRecords: number;
    errorMessage: string | null;
}

interface HealthSummary {
    total: number;
    healthy: number;
    warning: number;
    error: number;
    stale: number;
    neverSynced: number;
    connections: ConnectionHealth[];
}

interface SchedulerStatus {
    isRunning: boolean;
    totalConnections: number;
    activeConnections: number;
    pausedConnections: number;
    errorConnections: number;
    runningJobs: number;
    pendingJobs: number;
    dueForSync: number;
    recentFailures: number;
}

// ─── Component ───

export default function DataHealthClient() {
    const params = useParams();
    const projectId = params.id as string;

    const [healthData, setHealthData] = useState<HealthSummary | null>(null);
    const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"health" | "quality">("health");
    const [qualityFilter, setQualityFilter] = useState<string>("all");

    const loadData = useCallback(async () => {
        try {
            const [healthRes, syncRes] = await Promise.all([
                fetch(`/api/data-integration/health?clientId=${projectId}`),
                fetch("/api/data-integration/sync"),
            ]);

            const healthJson = await healthRes.json();
            const syncJson = await syncRes.json();

            if (healthJson.success) setHealthData(healthJson.summary);
            if (syncJson.success) setSchedulerStatus(syncJson.status);
        } catch (err) {
            console.error("Failed to load health data:", err);
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => { loadData(); }, [loadData]);

    const triggerSync = async (connectionId: string) => {
        setActionLoading(connectionId);
        try {
            await fetch("/api/data-integration/sync", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ connectionId }),
            });
            await loadData();
        } finally {
            setActionLoading(null);
        }
    };

    const togglePause = async (connectionId: string, isPaused: boolean) => {
        setActionLoading(connectionId);
        try {
            await fetch("/api/data-integration/sync", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ connectionId, action: isPaused ? "resume" : "pause" }),
            });
            await loadData();
        } finally {
            setActionLoading(null);
        }
    };

    // Quality rules data
    const qualityRules = [
        { id: 1, name: "Ontbrekende kosten", description: "Advertentie-impressies zonder bijbehorende cost data", severity: "warning", affected: 12, lastTriggered: "2 uur geleden", platforms: ["Meta Ads"] },
        { id: 2, name: "Negatieve ROAS", description: "ROAS waarden onder 0 (data-inconsistentie)", severity: "error", affected: 0, lastTriggered: "Nooit", platforms: ["Alle"] },
        { id: 3, name: "Dubbele records", description: "Exacte duplicate rijen in genormaliseerde data", severity: "error", affected: 0, lastTriggered: "5 dagen geleden", platforms: ["Alle"] },
        { id: 4, name: "Conversion lag check", description: "Conversiedata meer dan 72 uur vertraagd", severity: "info", affected: 3, lastTriggered: "1 dag geleden", platforms: ["Google Ads", "Meta Ads"] },
        { id: 5, name: "Valutamismatch", description: "Data in verkeerde valuta t.o.v. accountinstelling", severity: "warning", affected: 0, lastTriggered: "Nooit", platforms: ["Alle"] },
        { id: 6, name: "Spend spike alert", description: "Kosten >200% hoger dan 7-daags gemiddelde", severity: "warning", affected: 1, lastTriggered: "3 dagen geleden", platforms: ["Google Ads"] },
        { id: 7, name: "Nul-impressies campagne", description: "Actieve campagnes met 0 impressies (24u)", severity: "info", affected: 2, lastTriggered: "6 uur geleden", platforms: ["LinkedIn Ads"] },
        { id: 8, name: "Platform discrepantie", description: "Verschil >10% tussen platform en binnengehaalde data", severity: "error", affected: 0, lastTriggered: "Nooit", platforms: ["Alle"] },
    ];

    const filteredRules = qualityRules.filter(r => qualityFilter === "all" || r.severity === qualityFilter);
    const qualityScore = 95;
    const scoreHistory = [
        { date: "Ma", score: 94 }, { date: "Di", score: 92 }, { date: "Wo", score: 96 },
        { date: "Do", score: 91 }, { date: "Vr", score: 95 }, { date: "Za", score: 97 }, { date: "Zo", score: 96 },
    ];

    if (loading) {
        return (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" }}>
                <Loader2 size={32} style={{ color: "var(--color-brand)", animation: "spin 1s linear infinite" }} />
            </div>
        );
    }

    const severityBadge = (severity: string) => {
        const s: Record<string, { bg: string; color: string; label: string }> = {
            error: { bg: "rgba(239, 68, 68, 0.1)", color: "#ef4444", label: "Kritiek" },
            warning: { bg: "rgba(245, 158, 11, 0.1)", color: "#f59e0b", label: "Waarschuwing" },
            info: { bg: "rgba(99, 102, 241, 0.1)", color: "#818cf8", label: "Info" },
        };
        const style = s[severity] || s.info;
        return (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 10px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 600, background: style.bg, color: style.color }}>
                {severity === "error" ? <XCircle size={12} /> : severity === "warning" ? <AlertTriangle size={12} /> : <AlertCircle size={12} />}
                {style.label}
            </span>
        );
    };

    const scoreColor = qualityScore >= 90 ? "#10b981" : qualityScore >= 70 ? "#f59e0b" : "#ef4444";

    return (
        <div style={{ padding: "32px", maxWidth: "1200px", margin: "0 auto" }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                <div>
                    <h1 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "8px" }}>Data Health & Kwaliteit</h1>
                    <p style={{ color: "var(--color-text-secondary)", fontSize: "0.9rem" }}>
                        Monitor connectie-status en valideer datakwaliteit.
                    </p>
                </div>
                <button onClick={loadData} style={{
                    display: "flex", alignItems: "center", gap: "8px",
                    padding: "8px 16px", borderRadius: "8px", border: "1px solid var(--color-border)",
                    background: "var(--color-surface)", color: "var(--color-text-primary)",
                    cursor: "pointer", fontSize: "0.85rem", fontWeight: 500,
                }}>
                    <RefreshCw size={16} /> Vernieuwen
                </button>
            </div>

            {/* Tab switcher */}
            <div style={{ display: "flex", gap: "4px", marginBottom: "24px", padding: "4px", background: "rgba(255,255,255,0.03)", borderRadius: "10px", width: "fit-content" }}>
                {[
                    { key: "health" as const, label: "Connectie Health", icon: <Wifi size={14} /> },
                    { key: "quality" as const, label: "Data Kwaliteit", icon: <ShieldCheck size={14} /> },
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        style={{
                            display: "flex", alignItems: "center", gap: "6px",
                            padding: "8px 20px", borderRadius: "8px", border: "none", cursor: "pointer",
                            background: activeTab === tab.key ? "var(--color-brand)" : "transparent",
                            color: activeTab === tab.key ? "white" : "var(--color-text-secondary)",
                            fontWeight: 600, fontSize: "0.85rem", transition: "all 0.2s ease",
                        }}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === "health" && (
                <>
                    {/* Overview Cards */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", marginBottom: "32px" }}>
                        <StatusCard icon={<Database size={20} />} label="Totaal connecties" value={healthData?.total || 0} color="var(--color-text-primary)" />
                        <StatusCard icon={<CheckCircle2 size={20} />} label="Gezond" value={healthData?.healthy || 0} color="#10b981" />
                        <StatusCard icon={<AlertTriangle size={20} />} label="Waarschuwing" value={healthData?.warning || 0} color="#f59e0b" />
                        <StatusCard icon={<XCircle size={20} />} label="Fout" value={healthData?.error || 0} color="#ef4444" />
                        <StatusCard icon={<Clock size={20} />} label="Verouderd" value={healthData?.stale || 0} color="#8b5cf6" />
                        <StatusCard icon={<WifiOff size={20} />} label="Nooit gesynchroniseerd" value={healthData?.neverSynced || 0} color="var(--color-text-muted)" />
                    </div>

                    {/* Scheduler Status */}
                    {schedulerStatus && (
                        <div style={{ padding: "20px", borderRadius: "12px", marginBottom: "24px", background: "var(--color-surface-elevated)", border: "1px solid var(--color-border)" }}>
                            <h3 style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                                <Activity size={18} /> Scheduler Status
                            </h3>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px" }}>
                                <MiniStat label="Actieve jobs" value={schedulerStatus.runningJobs} />
                                <MiniStat label="In wachtrij" value={schedulerStatus.pendingJobs} />
                                <MiniStat label="Klaar voor sync" value={schedulerStatus.dueForSync} />
                                <MiniStat label="Recente fouten (24u)" value={schedulerStatus.recentFailures} highlight={schedulerStatus.recentFailures > 0} />
                            </div>
                        </div>
                    )}

                    {/* Connections List */}
                    <div style={{ borderRadius: "12px", overflow: "hidden", border: "1px solid var(--color-border)", background: "var(--color-surface-elevated)" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                            <thead>
                                <tr>
                                    <th style={thStyle}>Status</th>
                                    <th style={thStyle}>Connector</th>
                                    <th style={{ ...thStyle, textAlign: "right" }}>Records</th>
                                    <th style={{ ...thStyle, textAlign: "right" }}>Laatste sync</th>
                                    <th style={{ ...thStyle, textAlign: "right" }}>Interval</th>
                                    <th style={{ ...thStyle, textAlign: "right" }}>Fouten (24u)</th>
                                    <th style={{ ...thStyle, textAlign: "center" }}>Acties</th>
                                </tr>
                            </thead>
                            <tbody>
                                {healthData?.connections.map(conn => (
                                    <tr key={conn.connectionId} style={{ borderBottom: "1px solid var(--color-border)" }} className="data-row">
                                        <td style={{ padding: "14px 16px" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                <StatusDot status={conn.status} />
                                                <span style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "capitalize", color: statusColor(conn.status) }}>
                                                    {statusLabel(conn.status)}
                                                </span>
                                            </div>
                                        </td>
                                        <td style={{ padding: "14px 16px" }}>
                                            <div style={{ fontWeight: 600 }}>{conn.connectorName}</div>
                                            <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>{conn.connectorSlug}</div>
                                            {conn.errorMessage && (
                                                <div style={{ fontSize: "0.7rem", color: "#ef4444", marginTop: "4px", maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                    {conn.errorMessage}
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ padding: "14px 16px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{conn.totalRecords.toLocaleString()}</td>
                                        <td style={{ padding: "14px 16px", textAlign: "right", fontSize: "0.8rem" }}>
                                            {conn.lastSyncAt ? formatAgo(conn.minutesSinceLastSync) : <span style={{ color: "var(--color-text-muted)" }}>Nooit</span>}
                                        </td>
                                        <td style={{ padding: "14px 16px", textAlign: "right", fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>{formatInterval(conn.syncInterval)}</td>
                                        <td style={{ padding: "14px 16px", textAlign: "right" }}>
                                            {conn.recentFailures > 0 ? (
                                                <span style={{ padding: "2px 8px", borderRadius: "10px", fontSize: "0.75rem", fontWeight: 600, background: "rgba(239, 68, 68, 0.1)", color: "#ef4444" }}>{conn.recentFailures}</span>
                                            ) : (
                                                <span style={{ color: "var(--color-text-muted)" }}>0</span>
                                            )}
                                        </td>
                                        <td style={{ padding: "14px 16px", textAlign: "center" }}>
                                            <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                                                <button onClick={() => triggerSync(conn.connectionId)} disabled={actionLoading === conn.connectionId} title="Sync nu" style={actionBtnStyle}>
                                                    {actionLoading === conn.connectionId ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <RefreshCw size={14} />}
                                                </button>
                                                <button onClick={() => togglePause(conn.connectionId, conn.status === "error")} title={conn.status === "error" ? "Hervatten" : "Pauzeren"} style={actionBtnStyle}>
                                                    {conn.status === "error" ? <Play size={14} /> : <Pause size={14} />}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {(!healthData || healthData.connections.length === 0) && (
                                    <tr><td colSpan={7} style={{ padding: "40px", textAlign: "center", color: "var(--color-text-muted)" }}>Geen data connecties gevonden voor dit project.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {activeTab === "quality" && (
                <>
                    {/* Quality score overview */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "16px", marginBottom: "24px" }}>
                        <div style={{ padding: "24px", borderRadius: "12px", background: "var(--color-surface-elevated)", border: "1px solid var(--color-border)", display: "flex", flexDirection: "column", alignItems: "center" }}>
                            <div style={{ fontSize: "3rem", fontWeight: 800, color: scoreColor, lineHeight: 1 }}>{qualityScore}</div>
                            <div style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", marginTop: "4px" }}>Quality Score</div>
                            <div style={{ width: "80%", height: "4px", background: "rgba(255,255,255,0.1)", borderRadius: "2px", marginTop: "12px" }}>
                                <div style={{ width: `${qualityScore}%`, height: "100%", background: scoreColor, borderRadius: "2px" }} />
                            </div>
                        </div>
                        <StatusCard icon={<XCircle size={20} />} label="Kritieke issues" value={qualityRules.filter(r => r.severity === "error" && r.affected > 0).length} color="#ef4444" />
                        <StatusCard icon={<AlertTriangle size={20} />} label="Waarschuwingen" value={qualityRules.filter(r => r.severity === "warning" && r.affected > 0).length} color="#f59e0b" />
                        <StatusCard icon={<BarChart3 size={20} />} label="Getroffen records" value={qualityRules.reduce((sum, r) => sum + r.affected, 0)} color="#818cf8" />
                    </div>

                    {/* Trend chart */}
                    <div style={{ padding: "20px", borderRadius: "12px", marginBottom: "24px", background: "var(--color-surface-elevated)", border: "1px solid var(--color-border)" }}>
                        <h3 style={{ fontWeight: 600, marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px", fontSize: "0.95rem" }}>
                            Quality Score — Afgelopen 7 dagen
                        </h3>
                        <div style={{ display: "flex", alignItems: "flex-end", gap: "12px", height: "100px" }}>
                            {scoreHistory.map((d, i) => (
                                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                                    <span style={{ fontSize: "0.75rem", fontWeight: 600, color: d.score >= 95 ? "#10b981" : "#f59e0b" }}>{d.score}</span>
                                    <div style={{ width: "100%", height: `${d.score}%`, borderRadius: "4px 4px 0 0", background: `linear-gradient(to top, ${d.score >= 95 ? "rgba(16,185,129,0.3)" : "rgba(245,158,11,0.3)"}, transparent)` }} />
                                    <span style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>{d.date}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Severity filter */}
                    <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                        {[
                            { key: "all", label: "Alle regels" },
                            { key: "error", label: "Kritiek" },
                            { key: "warning", label: "Waarschuwingen" },
                            { key: "info", label: "Info" },
                        ].map(f => (
                            <button key={f.key} onClick={() => setQualityFilter(f.key)} style={{
                                padding: "8px 16px", borderRadius: "8px", border: "none", cursor: "pointer",
                                background: qualityFilter === f.key ? "var(--color-brand)" : "var(--color-surface)",
                                color: qualityFilter === f.key ? "white" : "var(--color-text-primary)",
                                fontWeight: 500, fontSize: "0.85rem", transition: "all 0.2s ease",
                            }}>
                                {f.label}
                            </button>
                        ))}
                    </div>

                    {/* Rules table */}
                    <div style={{ borderRadius: "12px", overflow: "hidden", border: "1px solid var(--color-border)", background: "var(--color-surface-elevated)" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                            <thead>
                                <tr>
                                    {["Regel", "Ernst", "Platforms", "Getroffen", "Laatst Getriggerd"].map(h => (
                                        <th key={h} style={thStyle}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRules.map(rule => (
                                    <tr key={rule.id} style={{ borderBottom: "1px solid var(--color-border)" }} className="data-row">
                                        <td style={{ padding: "12px 16px" }}>
                                            <div style={{ fontWeight: 500, marginBottom: "2px" }}>{rule.name}</div>
                                            <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>{rule.description}</div>
                                        </td>
                                        <td style={{ padding: "12px 16px" }}>{severityBadge(rule.severity)}</td>
                                        <td style={{ padding: "12px 16px" }}>
                                            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                                                {rule.platforms.map((p, i) => (
                                                    <span key={i} style={{ fontSize: "0.7rem", padding: "2px 6px", borderRadius: "4px", background: "var(--color-surface)", color: "var(--color-text-secondary)" }}>{p}</span>
                                                ))}
                                            </div>
                                        </td>
                                        <td style={{ padding: "12px 16px" }}>
                                            <span style={{ fontWeight: 600, color: rule.affected > 0 ? (rule.severity === "error" ? "#ef4444" : "#f59e0b") : "var(--color-text-muted)" }}>{rule.affected}</span>
                                        </td>
                                        <td style={{ padding: "12px 16px", fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>{rule.lastTriggered}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            <style jsx>{`
                .data-row:hover { background: var(--color-surface-hover); }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}

// ─── Sub-components ───

function StatusCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
    return (
        <div style={{
            padding: "20px", borderRadius: "12px",
            background: "var(--color-surface-elevated)", border: "1px solid var(--color-border)",
        }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                <div style={{ color }}>{icon}</div>
                <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    {label}
                </span>
            </div>
            <div style={{ fontSize: "1.75rem", fontWeight: 700, color, fontVariantNumeric: "tabular-nums" }}>
                {value}
            </div>
        </div>
    );
}

function MiniStat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
    return (
        <div style={{
            padding: "12px", borderRadius: "8px",
            background: highlight ? "rgba(239, 68, 68, 0.05)" : "var(--color-surface)",
        }}>
            <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", fontWeight: 600, marginBottom: "4px" }}>{label}</div>
            <div style={{
                fontSize: "1.25rem", fontWeight: 700,
                color: highlight ? "#ef4444" : "var(--color-text-primary)",
                fontVariantNumeric: "tabular-nums",
            }}>
                {value}
            </div>
        </div>
    );
}

function StatusDot({ status }: { status: string }) {
    return (
        <div style={{
            width: "10px", height: "10px", borderRadius: "50%",
            background: statusColor(status),
            boxShadow: `0 0 6px ${statusColor(status)}40`,
        }} />
    );
}

// ─── Helpers ───

function statusColor(status: string): string {
    switch (status) {
        case "healthy": return "#10b981";
        case "warning": return "#f59e0b";
        case "error": return "#ef4444";
        case "stale": return "#8b5cf6";
        case "never_synced": return "#6b7280";
        default: return "#6b7280";
    }
}

function statusLabel(status: string): string {
    switch (status) {
        case "healthy": return "Gezond";
        case "warning": return "Waarschuwing";
        case "error": return "Fout";
        case "stale": return "Verouderd";
        case "never_synced": return "Nooit gesynchroniseerd";
        default: return status;
    }
}

function formatAgo(minutes: number | null): string {
    if (minutes === null) return "Nooit";
    if (minutes < 1) return "Zojuist";
    if (minutes < 60) return `${Math.round(minutes)} min geleden`;
    if (minutes < 1440) return `${Math.round(minutes / 60)} uur geleden`;
    return `${Math.round(minutes / 1440)} dagen geleden`;
}

function formatInterval(minutes: number): string {
    if (minutes < 60) return `Elke ${minutes} min`;
    if (minutes < 1440) return `Elke ${Math.round(minutes / 60)} uur`;
    return `Elke ${Math.round(minutes / 1440)} dag(en)`;
}

const thStyle: React.CSSProperties = {
    padding: "12px 16px", fontSize: "0.7rem", fontWeight: 700,
    textTransform: "uppercase", letterSpacing: "0.04em",
    color: "var(--color-text-muted)", borderBottom: "2px solid var(--color-border)",
    background: "var(--color-surface)", textAlign: "left",
};

const actionBtnStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: "32px", height: "32px", borderRadius: "8px",
    border: "1px solid var(--color-border)", background: "var(--color-surface)",
    color: "var(--color-text-secondary)", cursor: "pointer",
    transition: "all 0.15s ease",
};
