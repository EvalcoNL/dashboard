"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { useNotification } from "@/components/NotificationProvider";
import {
    RefreshCw, Clock, Play, Pause,
    CheckCircle, AlertTriangle, XCircle, Zap,
    RotateCcw, Loader2, Database, X,
    Calendar, History, Timer, ChevronRight, Settings, AlertOctagon,
} from "lucide-react";

interface SyncJob {
    id: string;
    status: string;
    syncMode: string | null;
    level: string | null;
    recordsFetched: number | null;
    recordsStored: number | null;
    recordsNew: number | null;
    recordsUpdated: number | null;
    recordsDeleted: number | null;
    recordsSkipped: number | null;
    startedAt: string | null;
    completedAt: string | null;
    errorMessage: string | null;
    createdAt: string;
}

interface DataSource {
    id: string;
    type: string;
    name: string | null;
    externalId: string;
    active: boolean;
    syncStatus: string;
    syncInterval: number;
    lookbackDays: number;
    syncError: string | null;
    lastSyncedAt: string | null;
    nextSyncAt: string | null;
    connector: { slug: string; name: string; category: string } | null;
    syncAccounts: { id: string; externalId: string; name: string; isActive: boolean }[];
    recentJobs: SyncJob[];
    recordCount: number;
    status: string;
    lastSyncAt: string | null;
    errorMessage: string | null;
    accounts: { id: string; externalId: string; name: string; isActive: boolean }[];
}

const SCHEDULE_PRESETS = [
    { label: "Elk uur", value: 60 },
    { label: "Elke 6 uur", value: 360 },
    { label: "Elke 12 uur", value: 720 },
    { label: "Dagelijks", value: 1440 },
    { label: "Elke 2 dagen", value: 2880 },
    { label: "Wekelijks", value: 10080 },
];

const CONNECTOR_NAMES: Record<string, string> = {
    'google-ads': 'Google Ads',
    'google-analytics': 'Google Analytics 4',
    'meta-ads': 'Meta Ads',
    'microsoft-ads': 'Microsoft Ads',
    'linkedin-ads': 'LinkedIn Ads',
    'tiktok-ads': 'TikTok Ads',
    'search-console': 'Search Console',
    'sample': 'Sample Data',
};

const MODE_LABELS: Record<string, string> = { INCREMENTAL: 'Incrementeel', FULL: 'Volledig', DELTA: 'Delta' };
const MODE_COLORS: Record<string, string> = { INCREMENTAL: '#818cf8', FULL: '#ef4444', DELTA: '#10b981' };

export default function SyncClient() {
    const params = useParams();
    const projectId = params.id as string;

    const [sources, setSources] = useState<DataSource[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState<Record<string, boolean>>({});
    const [syncingAll, setSyncingAll] = useState(false);
    const [selectedSource, setSelectedSource] = useState<string | null>(null);
    const [backfillFrom, setBackfillFrom] = useState("");
    const [expandedJobError, setExpandedJobError] = useState<string | null>(null);
    const { confirm, showToast } = useNotification();

    const fetchData = useCallback(async () => {
        try {
            const res = await fetch(`/api/data-integration/connections?clientId=${projectId}`);
            const data = await res.json();
            if (data.success) setSources(data.connections || []);
        } catch { /* ignore */ }
        setLoading(false);
    }, [projectId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Auto-refresh while any sync is running
    const hasRunningJobs = sources.some(s => s.recentJobs?.some(j => j.status === "RUNNING"));
    useEffect(() => {
        if (!hasRunningJobs) return;
        const interval = setInterval(fetchData, 3000);
        return () => clearInterval(interval);
    }, [hasRunningJobs, fetchData]);

    const triggerSync = async (sourceId: string, mode: string = 'INCREMENTAL') => {
        setSyncing(prev => ({ ...prev, [sourceId]: true }));
        try {
            const res = await fetch("/api/data-integration/sync", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ connectionId: sourceId, mode }),
            });
            const data = await res.json();
            if (data.errors && data.errors.length > 0) {
                showToast('warning', `Sync voltooid met ${data.errors.length} fout(en)`);
            } else if (data.success) {
                showToast('success', 'Sync succesvol voltooid');
            }
        } catch (err) {
            console.error("Sync failed:", err);
            showToast('error', 'Sync mislukt: onbekende fout');
        }
        setSyncing(prev => ({ ...prev, [sourceId]: false }));
        fetchData();
    };

    const triggerBackfill = async (sourceId: string) => {
        if (!backfillFrom) return;
        const today = new Date().toISOString().split('T')[0];
        setSyncing(prev => ({ ...prev, [sourceId]: true }));
        try {
            await fetch("/api/data-integration/sync", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ connectionId: sourceId, dateFrom: backfillFrom, dateTo: today }),
            });
        } catch (err) {
            console.error("Backfill failed:", err);
        }
        setSyncing(prev => ({ ...prev, [sourceId]: false }));
        setBackfillFrom("");
        fetchData();
    };

    const triggerSyncAll = async () => {
        setSyncingAll(true);
        await Promise.all(activeSources.map(source =>
            fetch("/api/data-integration/sync", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ connectionId: source.id }),
            }).catch(() => { })
        ));
        setSyncingAll(false);
        fetchData();
    };

    const togglePause = async (sourceId: string, currentStatus: string) => {
        try {
            await fetch("/api/data-integration/sync", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    connectionId: sourceId,
                    action: currentStatus === "PAUSED" ? "resume" : "pause",
                }),
            });
            fetchData();
        } catch { /* ignore */ }
    };

    const updateInterval = async (sourceId: string, interval: number) => {
        try {
            await fetch("/api/data-integration/sync", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ connectionId: sourceId, action: "update_interval", interval }),
            });
            fetchData();
        } catch { /* ignore */ }
    };

    // Split sources
    const activeSources = sources.filter(s => s.syncStatus === "ACTIVE");
    const pausedSources = sources.filter(s => s.syncStatus === "PAUSED");
    const errorSources = sources.filter(s => s.syncStatus === "ERROR");
    const allSyncSources = [...activeSources, ...pausedSources, ...errorSources];

    const totalRecords = sources.reduce((sum, s) => sum + (s.recordCount || 0), 0);
    const selected = sources.find(s => s.id === selectedSource) || null;

    const formatTimeAgo = (dateStr: string | null) => {
        if (!dateStr) return "Nooit";
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return "Zojuist";
        if (mins < 60) return `${mins} min geleden`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}u geleden`;
        return `${Math.floor(hours / 24)}d geleden`;
    };

    const getSourceName = (s: DataSource) => {
        if (s.name === "__sample__") return "Sample Data";
        return s.connector?.name || CONNECTOR_NAMES[s.type] || s.name || s.type;
    };

    const getSourceSubname = (s: DataSource) => {
        if (s.name && s.connector?.name && s.name !== s.connector.name) return s.name;
        return null;
    };

    const getIntervalLabel = (minutes: number) => {
        return SCHEDULE_PRESETS.find(p => p.value === minutes)?.label || `${minutes} min`;
    };

    const hasRecentError = (s: DataSource) => {
        if (s.syncStatus === "ERROR") return true;
        const lastJob = s.recentJobs?.[0];
        return lastJob && (lastJob.status === "FAILED" || lastJob.status === "COMPLETED_WITH_ERRORS");
    };

    const statusBadge = (status: string) => {
        const config: Record<string, { bg: string; color: string; icon: React.ReactNode; label: string }> = {
            ACTIVE: { bg: "rgba(16, 185, 129, 0.1)", color: "#10b981", icon: <CheckCircle size={12} />, label: "Actief" },
            PAUSED: { bg: "rgba(245, 158, 11, 0.1)", color: "#f59e0b", icon: <Pause size={12} />, label: "Gepauzeerd" },
            ERROR: { bg: "rgba(239, 68, 68, 0.1)", color: "#ef4444", icon: <XCircle size={12} />, label: "Fout" },
            NONE: { bg: "rgba(148, 163, 184, 0.1)", color: "#94a3b8", icon: <Clock size={12} />, label: "Niet actief" },
        };
        const s = config[status] || config.NONE;
        return (
            <span style={{
                display: "inline-flex", alignItems: "center", gap: "4px",
                padding: "3px 10px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 600,
                background: s.bg, color: s.color,
            }}>
                {s.icon} {s.label}
            </span>
        );
    };

    const jobStatusBadge = (status: string) => {
        const colors: Record<string, string> = {
            COMPLETED: "#10b981", COMPLETED_WITH_ERRORS: "#f59e0b", RUNNING: "#6366f1", FAILED: "#ef4444", PENDING: "#f59e0b",
        };
        const labels: Record<string, string> = {
            COMPLETED: "Voltooid", COMPLETED_WITH_ERRORS: "Deels voltooid", RUNNING: "Bezig…", FAILED: "Mislukt", PENDING: "Wachtend",
        };
        return (
            <span style={{
                fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase",
                color: colors[status] || "var(--color-text-muted)",
            }}>
                {labels[status] || status}
            </span>
        );
    };

    if (loading) {
        return (
            <div style={{ padding: "80px", textAlign: "center" }}>
                <Loader2 size={32} style={{ color: "var(--color-brand)", animation: "spin 1s linear infinite", marginBottom: "16px" }} />
                <p style={{ color: "var(--color-text-secondary)" }}>Laden...</p>
                <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return (
        <div className="animate-fade-in" style={{ maxWidth: "1200px", margin: "0 auto" }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                <div>
                    <h1 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "4px", display: "flex", alignItems: "center", gap: "12px" }}>
                        <RefreshCw size={28} />
                        Sync & Planning
                    </h1>
                    <p style={{ color: "var(--color-text-muted)", fontSize: "0.95rem" }}>
                        Synchroniseer data van gekoppelde bronnen naar de Data Explorer.
                    </p>
                </div>
                {activeSources.length > 0 && (
                    <button
                        onClick={triggerSyncAll}
                        disabled={syncingAll}
                        style={{
                            display: "flex", alignItems: "center", gap: "8px",
                            padding: "10px 20px", background: syncingAll ? "rgba(255,255,255,0.05)" : "var(--color-brand)",
                            border: "none", borderRadius: "8px",
                            color: "white", fontWeight: 600, cursor: syncingAll ? "wait" : "pointer",
                            opacity: syncingAll ? 0.7 : 1,
                        }}
                    >
                        {syncingAll ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <RotateCcw size={16} />}
                        {syncingAll ? "Bezig..." : "Alles Synchroniseren"}
                    </button>
                )}
            </div>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}>
                {[
                    { label: "Data Bronnen", value: sources.length, icon: <Database size={18} style={{ color: "#818cf8" }} /> },
                    { label: "Actieve Syncs", value: activeSources.length, icon: <Zap size={18} style={{ color: "#10b981" }} /> },
                    { label: "Fouten", value: errorSources.length, icon: <AlertTriangle size={18} style={{ color: errorSources.length > 0 ? "#ef4444" : "var(--color-text-muted)" }} /> },
                    { label: "Totaal Records", value: totalRecords.toLocaleString("nl-NL"), icon: <Database size={18} style={{ color: "#818cf8" }} /> },
                ].map((stat, i) => (
                    <div key={i} className="glass-card" style={{ padding: "20px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                            {stat.icon}
                            <span style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>{stat.label}</span>
                        </div>
                        <div style={{ fontSize: "1.75rem", fontWeight: 700, color: stat.label === "Fouten" && errorSources.length > 0 ? "#ef4444" : "inherit" }}>
                            {stat.value}
                        </div>
                    </div>
                ))}
            </div>

            {/* Simplified sync table */}
            {allSyncSources.length > 0 ? (
                <div className="glass-card" style={{ overflow: "hidden" }}>
                    <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <h3 style={{ fontWeight: 600 }}>Sync Connecties</h3>
                        <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
                            {allSyncSources.length} bron(nen)
                        </span>
                    </div>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                                {["Bron", "Status", "Interval", "Laatste Sync", "Records", ""].map(h => (
                                    <th key={h} style={{
                                        padding: "10px 16px", textAlign: "left", fontSize: "0.7rem", fontWeight: 600,
                                        color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em",
                                    }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {allSyncSources.map(source => {
                                const subname = getSourceSubname(source);
                                const isRunning = source.recentJobs?.some(j => j.status === "RUNNING");
                                const showError = hasRecentError(source);
                                return (
                                    <tr
                                        key={source.id}
                                        onClick={() => { setSelectedSource(source.id); setExpandedJobError(null); setBackfillFrom(""); }}
                                        style={{
                                            borderBottom: "1px solid rgba(255,255,255,0.04)",
                                            cursor: "pointer",
                                            background: selectedSource === source.id ? "rgba(99, 102, 241, 0.06)" : undefined,
                                            transition: "background 0.15s",
                                        }}
                                        onMouseEnter={e => { if (selectedSource !== source.id) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.02)"; }}
                                        onMouseLeave={e => { if (selectedSource !== source.id) (e.currentTarget as HTMLElement).style.background = ""; }}
                                    >
                                        <td style={{ padding: "12px 16px" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                                <div>
                                                    <div style={{ fontWeight: 600, fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "6px" }}>
                                                        {getSourceName(source)}
                                                        {isRunning && (
                                                            <Loader2 size={14} style={{ color: "#6366f1", animation: "spin 1s linear infinite" }} />
                                                        )}
                                                    </div>
                                                    {subname && <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>{subname}</div>}
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: "12px 16px" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                {statusBadge(source.syncStatus)}
                                                {showError && source.syncStatus !== "ERROR" && (
                                                    <span style={{
                                                        display: "inline-flex", alignItems: "center", gap: "3px",
                                                        padding: "2px 8px", borderRadius: "6px", fontSize: "0.7rem", fontWeight: 600,
                                                        background: "rgba(239, 68, 68, 0.1)", color: "#ef4444",
                                                    }}>
                                                        <AlertOctagon size={10} /> Fouten
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td style={{ padding: "12px 16px", fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
                                            {getIntervalLabel(source.syncInterval)}
                                        </td>
                                        <td style={{ padding: "12px 16px", fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
                                            {formatTimeAgo(source.lastSyncedAt || source.lastSyncAt)}
                                        </td>
                                        <td style={{ padding: "12px 16px", fontSize: "0.85rem", fontVariantNumeric: "tabular-nums" }}>
                                            {(source.recordCount || 0).toLocaleString("nl-NL")}
                                        </td>
                                        <td style={{ padding: "12px 16px", textAlign: "right" }}>
                                            <ChevronRight size={16} style={{ color: "var(--color-text-muted)", opacity: 0.5 }} />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="glass-card" style={{ padding: "64px", textAlign: "center" }}>
                    <Database size={48} style={{ color: "var(--color-text-muted)", marginBottom: "16px" }} />
                    <h3 style={{ fontWeight: 600, marginBottom: "8px" }}>Geen data bronnen</h3>
                    <p style={{ color: "var(--color-text-secondary)", maxWidth: "400px", margin: "0 auto" }}>
                        Ga naar Data Sources om bronnen te koppelen.
                    </p>
                </div>
            )}

            {/* ═══ SIDE PANEL (slide-out right) ═══ */}
            {selected && (
                <>
                    {/* Backdrop */}
                    <div
                        onClick={() => setSelectedSource(null)}
                        style={{
                            position: "fixed", inset: 0, zIndex: 998,
                            background: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)",
                            animation: "fadeIn 0.2s ease",
                        }}
                    />
                    {/* Panel */}
                    <div style={{
                        position: "fixed", top: 0, right: 0, bottom: 0,
                        width: "480px", maxWidth: "90vw", zIndex: 999,
                        background: "var(--color-surface-elevated, #1a1d2e)",
                        borderLeft: "1px solid rgba(255,255,255,0.08)",
                        overflowY: "auto",
                        animation: "slideInRight 0.25s ease",
                        display: "flex", flexDirection: "column",
                    }}>
                        {/* Panel Header */}
                        <div style={{
                            padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.08)",
                            display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                            position: "sticky", top: 0, zIndex: 1,
                            background: "var(--color-surface-elevated, #1a1d2e)",
                        }}>
                            <div>
                                <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "4px" }}>
                                    {getSourceName(selected)}
                                </h2>
                                {getSourceSubname(selected) && (
                                    <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginBottom: "8px" }}>
                                        {getSourceSubname(selected)}
                                    </div>
                                )}
                                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                    {statusBadge(selected.syncStatus)}
                                    {selected.syncAccounts.length > 0 && (
                                        <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                                            {selected.syncAccounts.map(a => a.name || a.externalId).join(", ")}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedSource(null)}
                                style={{
                                    padding: "6px", background: "rgba(255,255,255,0.05)", border: "none",
                                    borderRadius: "6px", color: "var(--color-text-muted)", cursor: "pointer",
                                }}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div style={{ padding: "20px 24px", flex: 1, display: "flex", flexDirection: "column", gap: "20px" }}>

                            {/* ─── Error Section (if applicable) ─── */}
                            {(selected.syncError || selected.errorMessage || hasRecentError(selected)) && (
                                <div style={{
                                    padding: "14px 16px", borderRadius: "10px",
                                    background: "rgba(239, 68, 68, 0.06)", border: "1px solid rgba(239, 68, 68, 0.2)",
                                }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                                        <AlertTriangle size={16} style={{ color: "#ef4444", flexShrink: 0 }} />
                                        <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "#ef4444" }}>Foutmelding</span>
                                    </div>
                                    <div style={{
                                        fontSize: "0.8rem", color: "#fca5a5", lineHeight: 1.5,
                                        maxHeight: "200px", overflowY: "auto",
                                        whiteSpace: "pre-wrap", wordBreak: "break-word",
                                        padding: "10px 12px", borderRadius: "6px",
                                        background: "rgba(0,0,0,0.2)",
                                        fontFamily: "var(--font-mono, monospace)",
                                    }}>
                                        {selected.syncError || selected.errorMessage || selected.recentJobs?.[0]?.errorMessage || "Onbekende fout"}
                                    </div>
                                </div>
                            )}

                            {/* ─── Sync Actions ─── */}
                            <div>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                                    <Zap size={16} style={{ color: "var(--color-brand)" }} />
                                    <h3 style={{ fontWeight: 600, fontSize: "0.9rem" }}>Synchroniseren</h3>
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                    {/* Incremental */}
                                    <button
                                        onClick={() => triggerSync(selected.id, 'INCREMENTAL')}
                                        disabled={syncing[selected.id]}
                                        style={actionBtnStyle("#6366f1", "rgba(99, 102, 241, 0.08)")}
                                    >
                                        <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1 }}>
                                            {syncing[selected.id]
                                                ? <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
                                                : <RefreshCw size={18} />
                                            }
                                            <div style={{ textAlign: "left" }}>
                                                <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>Incrementeel synchroniseren</div>
                                                <div style={{ fontSize: "0.72rem", opacity: 0.7, fontWeight: 400 }}>Alleen nieuwe data ophalen sinds laatste sync</div>
                                            </div>
                                        </div>
                                    </button>
                                    {/* Delta */}
                                    <button
                                        onClick={() => triggerSync(selected.id, 'DELTA')}
                                        disabled={syncing[selected.id]}
                                        style={actionBtnStyle("#10b981", "rgba(16, 185, 129, 0.08)")}
                                    >
                                        <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1 }}>
                                            <Zap size={18} />
                                            <div style={{ textAlign: "left" }}>
                                                <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>Delta sync</div>
                                                <div style={{ fontSize: "0.72rem", opacity: 0.7, fontWeight: 400 }}>Vergelijk data en werk alleen gewijzigde rijen bij</div>
                                            </div>
                                        </div>
                                    </button>
                                    {/* Full Resync */}
                                    <button
                                        onClick={async () => {
                                            const confirmed = await confirm({
                                                title: "Volledig opnieuw laden",
                                                message: "Weet je zeker dat je alle data wilt verwijderen en opnieuw wilt ophalen? Dit kan enkele minuten duren.",
                                                confirmLabel: "Ja, opnieuw laden",
                                                type: "danger",
                                            });
                                            if (confirmed) triggerSync(selected.id, 'FULL');
                                        }}
                                        disabled={syncing[selected.id]}
                                        style={actionBtnStyle("#ef4444", "rgba(239, 68, 68, 0.06)")}
                                    >
                                        <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1 }}>
                                            <RotateCcw size={18} />
                                            <div style={{ textAlign: "left" }}>
                                                <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>Volledig opnieuw laden</div>
                                                <div style={{ fontSize: "0.72rem", opacity: 0.7, fontWeight: 400 }}>Verwijder bestaande data en haal alles opnieuw op</div>
                                            </div>
                                        </div>
                                    </button>
                                    {/* Backfill */}
                                    <div style={{
                                        padding: "12px 14px", borderRadius: "10px",
                                        background: "rgba(245, 158, 11, 0.05)", border: "1px solid rgba(245, 158, 11, 0.12)",
                                    }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                                            <Calendar size={16} style={{ color: "#f59e0b" }} />
                                            <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "#f59e0b" }}>Backfill</span>
                                            <span style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>— Historische data aanvullen</span>
                                        </div>
                                        <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
                                            <div style={{ flex: 1 }}>
                                                <label style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", display: "block", marginBottom: "4px" }}>Vanaf datum</label>
                                                <input
                                                    type="date"
                                                    value={backfillFrom}
                                                    onChange={e => setBackfillFrom(e.target.value)}
                                                    max={new Date().toISOString().split('T')[0]}
                                                    style={dateInputStyle}
                                                />
                                            </div>
                                            <button
                                                onClick={() => triggerBackfill(selected.id)}
                                                disabled={!backfillFrom || syncing[selected.id]}
                                                style={{
                                                    padding: "8px 14px", borderRadius: "6px",
                                                    background: backfillFrom ? "#f59e0b" : "rgba(255,255,255,0.05)",
                                                    color: backfillFrom ? "#000" : "var(--color-text-muted)",
                                                    border: "none", fontWeight: 600, fontSize: "0.8rem",
                                                    cursor: backfillFrom ? "pointer" : "not-allowed",
                                                    display: "flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap",
                                                }}
                                            >
                                                {syncing[selected.id] ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <RotateCcw size={14} />}
                                                Starten
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ─── Settings ─── */}
                            <div>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                                    <Settings size={16} style={{ color: "var(--color-brand)" }} />
                                    <h3 style={{ fontWeight: 600, fontSize: "0.9rem" }}>Instellingen</h3>
                                </div>
                                <div style={{
                                    padding: "14px 16px", borderRadius: "10px",
                                    background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
                                    display: "flex", flexDirection: "column", gap: "12px",
                                }}>
                                    {/* Interval */}
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>Sync interval</div>
                                            <div style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>Hoe vaak data automatisch wordt bijgewerkt</div>
                                        </div>
                                        <select
                                            value={selected.syncInterval}
                                            onChange={e => updateInterval(selected.id, Number(e.target.value))}
                                            style={selectStyle}
                                        >
                                            {SCHEDULE_PRESETS.map(p => (
                                                <option key={p.value} value={p.value}>{p.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    {/* Pause / Resume */}
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "12px" }}>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>
                                                {selected.syncStatus === "PAUSED" ? "Sync hervatten" : "Sync pauzeren"}
                                            </div>
                                            <div style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>
                                                {selected.syncStatus === "PAUSED" ? "Automatische synchronisatie is gepauzeerd" : "Automatische synchronisatie tijdelijk stoppen"}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => togglePause(selected.id, selected.syncStatus)}
                                            style={{
                                                padding: "6px 14px", borderRadius: "6px",
                                                background: selected.syncStatus === "PAUSED" ? "rgba(16, 185, 129, 0.1)" : "rgba(245, 158, 11, 0.1)",
                                                border: "1px solid " + (selected.syncStatus === "PAUSED" ? "rgba(16, 185, 129, 0.2)" : "rgba(245, 158, 11, 0.2)"),
                                                color: selected.syncStatus === "PAUSED" ? "#10b981" : "#f59e0b",
                                                fontSize: "0.8rem", fontWeight: 600, cursor: "pointer",
                                                display: "flex", alignItems: "center", gap: "6px",
                                            }}
                                        >
                                            {selected.syncStatus === "PAUSED" ? <Play size={14} /> : <Pause size={14} />}
                                            {selected.syncStatus === "PAUSED" ? "Hervatten" : "Pauzeren"}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* ─── Sync History ─── */}
                            <div>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                                    <History size={16} style={{ color: "var(--color-brand)" }} />
                                    <h3 style={{ fontWeight: 600, fontSize: "0.9rem" }}>Sync Geschiedenis</h3>
                                </div>

                                {/* Running indicator */}
                                {selected.recentJobs?.some(j => j.status === "RUNNING") && (
                                    <div style={{
                                        display: "flex", alignItems: "center", gap: "10px",
                                        padding: "10px 14px", borderRadius: "8px", marginBottom: "10px",
                                        background: "rgba(99, 102, 241, 0.08)", border: "1px solid rgba(99, 102, 241, 0.2)",
                                    }}>
                                        <span style={{
                                            width: "8px", height: "8px", borderRadius: "50%", background: "#6366f1",
                                            animation: "pulse-dot 1.5s ease-in-out infinite",
                                        }} />
                                        <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#818cf8" }}>
                                            Sync wordt uitgevoerd…
                                        </span>
                                    </div>
                                )}

                                {selected.recentJobs && selected.recentJobs.length > 0 ? (
                                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                        {selected.recentJobs.map(job => {
                                            const isRunning = job.status === "RUNNING";
                                            const hasError = !!job.errorMessage;
                                            const isErrorExpanded = expandedJobError === job.id;
                                            const duration = job.startedAt && job.completedAt
                                                ? `${Math.round((new Date(job.completedAt).getTime() - new Date(job.startedAt).getTime()) / 1000)}s`
                                                : isRunning
                                                    ? `${Math.round((Date.now() - new Date(job.startedAt!).getTime()) / 1000)}s…`
                                                    : "—";
                                            return (
                                                <div
                                                    key={job.id}
                                                    style={{
                                                        padding: "10px 12px", borderRadius: "8px",
                                                        background: isRunning ? "rgba(99, 102, 241, 0.04)" : "rgba(255,255,255,0.02)",
                                                        border: "1px solid " + (hasError ? "rgba(239, 68, 68, 0.12)" : "rgba(255,255,255,0.04)"),
                                                    }}
                                                >
                                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                                                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                            {jobStatusBadge(job.status)}
                                                            <span style={{
                                                                fontSize: "0.7rem", fontWeight: 600,
                                                                color: MODE_COLORS[job.syncMode || 'INCREMENTAL'] || 'var(--color-text-muted)',
                                                            }}>
                                                                {MODE_LABELS[job.syncMode || 'INCREMENTAL'] || job.syncMode}
                                                            </span>
                                                        </div>
                                                        <span style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>
                                                            {job.startedAt ? new Date(job.startedAt).toLocaleString("nl-NL", {
                                                                day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                                                            }) : "—"}
                                                            {" · "}{duration}
                                                        </span>
                                                    </div>
                                                    {/* Stats row */}
                                                    <div style={{ display: "flex", gap: "12px", fontSize: "0.75rem" }}>
                                                        {job.recordsFetched != null && (
                                                            <span style={{ color: "var(--color-text-secondary)" }}>
                                                                {job.recordsFetched.toLocaleString("nl-NL")} opgehaald
                                                            </span>
                                                        )}
                                                        {(job.recordsNew ?? 0) > 0 && (
                                                            <span style={{ color: "#10b981" }}>+{job.recordsNew?.toLocaleString("nl-NL")} nieuw</span>
                                                        )}
                                                        {(job.recordsUpdated ?? 0) > 0 && (
                                                            <span style={{ color: "#818cf8" }}>{job.recordsUpdated?.toLocaleString("nl-NL")} bijgewerkt</span>
                                                        )}
                                                        {(job.recordsDeleted ?? 0) > 0 && (
                                                            <span style={{ color: "#ef4444" }}>-{job.recordsDeleted?.toLocaleString("nl-NL")} verwijderd</span>
                                                        )}
                                                    </div>
                                                    {/* Error expandable */}
                                                    {hasError && (
                                                        <>
                                                            <button
                                                                onClick={() => setExpandedJobError(isErrorExpanded ? null : job.id)}
                                                                style={{
                                                                    marginTop: "6px", padding: "4px 8px", borderRadius: "4px",
                                                                    background: "rgba(239, 68, 68, 0.08)", border: "none",
                                                                    color: "#ef4444", fontSize: "0.72rem", fontWeight: 600,
                                                                    cursor: "pointer", display: "flex", alignItems: "center", gap: "4px",
                                                                }}
                                                            >
                                                                <AlertTriangle size={11} />
                                                                {isErrorExpanded ? "Fout verbergen" : "Fout bekijken"}
                                                            </button>
                                                            {isErrorExpanded && (
                                                                <div style={{
                                                                    marginTop: "6px", padding: "10px 12px", borderRadius: "6px",
                                                                    background: "rgba(0,0,0,0.2)", fontSize: "0.75rem",
                                                                    color: "#fca5a5", whiteSpace: "pre-wrap", wordBreak: "break-word",
                                                                    maxHeight: "150px", overflowY: "auto", lineHeight: 1.5,
                                                                    fontFamily: "var(--font-mono, monospace)",
                                                                }}>
                                                                    {job.errorMessage}
                                                                </div>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div style={{ padding: "24px", textAlign: "center", color: "var(--color-text-muted)", fontSize: "0.85rem" }}>
                                        <Timer size={20} style={{ marginBottom: "8px", opacity: 0.5 }} />
                                        <p>Nog geen sync jobs uitgevoerd</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes pulse-dot { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(1.3); } }
                @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            `}</style>
        </div>
    );
}

// ─── Shared styles ───

const selectStyle: React.CSSProperties = {
    padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--color-border)",
    background: "var(--color-surface)", color: "var(--color-text-primary)",
    fontSize: "0.8rem", cursor: "pointer", outline: "none",
};

const dateInputStyle: React.CSSProperties = {
    padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--color-border)",
    background: "var(--color-surface)", color: "var(--color-text-primary)",
    fontSize: "0.8rem", outline: "none", width: "100%",
};

const actionBtnStyle = (color: string, bg: string): React.CSSProperties => ({
    display: "flex", alignItems: "center", padding: "12px 14px",
    background: bg, border: `1px solid ${color}22`,
    borderRadius: "10px", color, cursor: "pointer",
    transition: "all 0.15s",
    width: "100%",
});
