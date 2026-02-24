"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    Globe, Plus, RotateCcw, MoreVertical,
    Clock, Trash2, X, Settings, Pause, Play
} from "lucide-react";

interface WebMonitoringClientProps {
    clientId: string;
    clientName: string;
    domains: any[];
    incidents: any[];
    summary: { total: number; up: number; down: number };
}

export default function WebMonitoringClient({ clientId, clientName, domains, incidents, summary }: WebMonitoringClientProps) {
    const router = useRouter();
    const [showAddForm, setShowAddForm] = useState(false);
    const [newUrl, setNewUrl] = useState("");
    const [newName, setNewName] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (!(e.target as Element).closest('.action-menu-container')) {
                setOpenMenuId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleAddMonitor = async () => {
        if (!newUrl.trim() || isCreating) return;
        setIsCreating(true);
        try {
            const res = await fetch(`/api/projects/${clientId}/monitors`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: newUrl.trim(), name: newName.trim() || undefined })
            });
            if (res.ok) { setNewUrl(""); setNewName(""); setShowAddForm(false); router.refresh(); }
        } finally { setIsCreating(false); }
    };

    const handleSync = async (domainId: string) => {
        if (syncingIds.has(domainId)) return;
        setSyncingIds(prev => new Set(prev).add(domainId));
        try {
            const res = await fetch(`/api/data-sources/${domainId}/refresh`);
            if (res.ok) router.refresh();
        } finally {
            setTimeout(() => { setSyncingIds(prev => { const n = new Set(prev); n.delete(domainId); return n; }); }, 500);
        }
    };

    const handleDeleteMonitor = async (domainId: string) => {
        if (!confirm("Weet je zeker dat je deze monitor wilt verwijderen?")) return;
        try { await fetch(`/api/data-sources/${domainId}`, { method: "DELETE" }); router.refresh(); } catch (e) { console.error(e); }
    };

    const handlePauseMonitor = async (domainId: string, currentlyActive: boolean) => {
        try {
            await fetch(`/api/data-sources/${domainId}`, {
                method: "PATCH", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ active: !currentlyActive })
            });
            router.refresh();
        } catch (e) { console.error(e); }
    };

    const getDomainStats = (domain: any) => {
        const checks = domain.uptimeChecks || [];
        const config = domain.config || {};
        let currentStatus = "Unknown", isUp = true, statusColor = "#9ca3af";
        if (!domain.active) {
            currentStatus = "Gepauzeerd";
            statusColor = "#9ca3af";
            isUp = true;
        } else if (checks.length > 0) {
            currentStatus = checks[0].status === "UP" ? "Up" : "Down";
            isUp = checks[0].status === "UP";
            statusColor = isUp ? "#10b981" : "#ef4444";
            // Check for page-level incidents
            if (isUp) {
                const monitoredPages = domain.monitoredPages || [];
                const hasPageErrors = monitoredPages.some((p: any) => p.lastStatus && p.lastStatus >= 400);
                if (hasPageErrors) {
                    currentStatus = "Waarschuwing";
                    statusColor = "#f59e0b";
                }
            }
        }
        const maxBars = 40;
        const barChecks = checks.slice(0, maxBars).reverse();
        const bars = Array.from({ length: maxBars }).map((_, i) => {
            const checkIndex = i - (maxBars - barChecks.length);
            if (checkIndex >= 0 && checkIndex < barChecks.length) {
                return { status: barChecks[checkIndex].status === "UP" ? "up" : "down", tooltip: new Date(barChecks[checkIndex].checkedAt).toLocaleString() };
            }
            return { status: "unknown", tooltip: "Geen data" };
        });
        return { currentStatus, isUp, statusColor, bars, uptimePercent7d: domain.uptime7d || "100.00", config };
    };

    const getBarColor = (status: string) => status === "up" ? "#10b981" : status === "down" ? "#ef4444" : "#374151";

    return (
        <div style={{ padding: "32px", maxWidth: "1200px", margin: "0 auto" }}>
            {/* ── Header ─────────────────────────────────────────── */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
                <div>
                    <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "6px" }}>Web Monitoring</h1>
                    <p style={{ color: "var(--color-text-secondary)", fontSize: "0.9rem", margin: 0 }}>Uptime, beveiliging en prestaties voor {clientName}</p>
                </div>
                <button onClick={() => setShowAddForm(!showAddForm)} style={{
                    padding: "10px 20px", background: "var(--color-brand)", border: "none", borderRadius: "8px",
                    color: "white", fontWeight: 600, fontSize: "0.875rem", cursor: "pointer",
                    display: "flex", alignItems: "center", gap: "8px", transition: "all 0.2s ease"
                }}>
                    {showAddForm ? <X size={16} /> : <Plus size={16} />}
                    {showAddForm ? "Annuleren" : "Monitor Toevoegen"}
                </button>
            </div>

            {/* ── Add Monitor Form ────────────────────────────────── */}
            {showAddForm && (
                <div className="glass-card" style={{ padding: "24px", marginBottom: "24px", animation: "slideDown 0.2s ease-out" }}>
                    <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--color-text-primary)", margin: "0 0 16px" }}>Nieuwe monitor toevoegen</h3>
                    <div style={{ display: "flex", gap: "12px", alignItems: "flex-end" }}>
                        <div style={{ flex: 2 }}>
                            <label style={labelStyle}>URL</label>
                            <input placeholder="https://www.voorbeeld.nl" value={newUrl} onChange={(e) => setNewUrl(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleAddMonitor()} style={formInputStyle} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={labelStyle}>Naam (optioneel)</label>
                            <input placeholder="Mijn website" value={newName} onChange={(e) => setNewName(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleAddMonitor()} style={formInputStyle} />
                        </div>
                        <button onClick={handleAddMonitor} disabled={isCreating || !newUrl.trim()} style={{
                            padding: "10px 24px", background: "var(--color-brand)", border: "none", borderRadius: "8px",
                            color: "white", fontWeight: 600, fontSize: "0.875rem", height: "41px", whiteSpace: "nowrap",
                            cursor: isCreating || !newUrl.trim() ? "not-allowed" : "pointer", opacity: isCreating || !newUrl.trim() ? 0.5 : 1
                        }}>{isCreating ? "Bezig..." : "Toevoegen"}</button>
                    </div>
                </div>
            )}

            {/* ── Summary Bar ─────────────────────────────────────── */}
            <div className="glass-card" style={{ padding: "16px 24px", marginBottom: "24px", display: "flex", alignItems: "center", gap: "32px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#10b981" }} />
                    <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--color-text-primary)" }}>{summary.up}</span>
                    <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>Up</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: summary.down > 0 ? "#ef4444" : "#374151" }} />
                    <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--color-text-primary)" }}>{summary.down}</span>
                    <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>Down</span>
                </div>
                <div style={{ flex: 1 }} />
                <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>{summary.total} monitor{summary.total !== 1 ? "s" : ""}</span>
            </div>

            {/* ── Monitor List ─────────────────────────────────────── */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {domains.map(domain => {
                    const stats = getDomainStats(domain);

                    return (
                        <div key={domain.id} className="glass-card" style={{ overflow: "visible" }}>
                            <div
                                onClick={() => router.push(`/dashboard/projects/${clientId}/monitoring/web/${domain.id}`)}
                                style={{
                                    display: "flex", alignItems: "center", gap: "16px", padding: "16px 20px", cursor: "pointer", transition: "background 0.15s ease"
                                }}
                                className="monitor-row"
                            >

                                <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: stats.statusColor, boxShadow: !stats.isUp ? `0 0 8px ${stats.statusColor}` : "none", flexShrink: 0 }} />
                                <div style={{ minWidth: "180px" }}>
                                    <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--color-text-primary)" }}>{domain.name}</div>
                                    <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", marginTop: "2px" }}>
                                        <span style={{ background: "rgba(99,102,241,0.1)", color: "var(--color-brand)", padding: "1px 6px", borderRadius: "4px", fontWeight: 600, fontSize: "0.65rem", textTransform: "uppercase" }}>HTTP</span>
                                    </div>
                                </div>
                                <div style={{ color: stats.statusColor, fontSize: "0.8rem", fontWeight: 600, minWidth: "50px" }}>{stats.currentStatus}</div>
                                <div style={{ display: "flex", gap: "1.5px", height: "24px", alignItems: "flex-end", flex: 1, maxWidth: "300px" }}>
                                    {stats.bars.map((bar: any, i: number) => (
                                        <div key={i} style={{ flex: 1, height: bar.status === "unknown" ? "30%" : bar.status === "down" ? "60%" : "100%", background: getBarColor(bar.status), borderRadius: "1.5px", opacity: bar.status === "unknown" ? 0.3 : 1 }} title={bar.tooltip} />
                                    ))}
                                </div>
                                <div style={{ fontSize: "0.85rem", fontWeight: 700, color: parseFloat(stats.uptimePercent7d) >= 99.9 ? "#10b981" : parseFloat(stats.uptimePercent7d) >= 99 ? "#f59e0b" : "#ef4444", minWidth: "60px", textAlign: "right" }}>{stats.uptimePercent7d}%</div>
                                <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", display: "flex", alignItems: "center", gap: "4px", minWidth: "50px" }}><Clock size={12} /> {stats.config.uptimeInterval || 5}m</div>
                                {/* Actions menu */}
                                <div className="action-menu-container" style={{ position: "relative", marginLeft: "auto" }}>
                                    <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === domain.id ? null : domain.id); }} style={{
                                        background: "none", border: "none", color: "var(--color-text-muted)", cursor: "pointer", padding: "4px", borderRadius: "6px", display: "flex"
                                    }} className="menu-trigger"><MoreVertical size={16} /></button>
                                    {openMenuId === domain.id && (
                                        <div style={{ position: "absolute", right: 0, top: "100%", marginTop: "4px", background: "var(--color-surface-elevated)", border: "1px solid var(--color-border)", borderRadius: "8px", boxShadow: "0 8px 24px rgba(0,0,0,0.3)", zIndex: 50, minWidth: "160px", overflow: "hidden" }}>
                                            <button onClick={(e) => { e.stopPropagation(); handleSync(domain.id); setOpenMenuId(null); }} className="dropdown-item" style={dropdownItemStyle}><RotateCcw size={14} /> Verversen</button>
                                            <button onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/projects/${clientId}/monitoring/web/${domain.id}`); setOpenMenuId(null); }} className="dropdown-item" style={dropdownItemStyle}><Settings size={14} /> Instellingen</button>
                                            <button onClick={(e) => { e.stopPropagation(); handlePauseMonitor(domain.id, domain.active); setOpenMenuId(null); }} className="dropdown-item" style={dropdownItemStyle}>{domain.active ? <><Pause size={14} /> Pauzeren</> : <><Play size={14} /> Hervatten</>}</button>
                                            <div style={{ height: "1px", background: "var(--color-border)" }} />
                                            <button onClick={(e) => { e.stopPropagation(); handleDeleteMonitor(domain.id); setOpenMenuId(null); }} className="dropdown-item" style={{ ...dropdownItemStyle, color: "#ef4444" }}><Trash2 size={14} /> Verwijderen</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* Empty state */}
                {domains.length === 0 && !showAddForm && (
                    <div className="glass-card" style={{ padding: "64px 32px", textAlign: "center" }}>
                        <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "rgba(99,102,241,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-brand)", margin: "0 auto 20px" }}>
                            <Globe size={28} />
                        </div>
                        <h3 style={{ fontSize: "1.15rem", fontWeight: 600, color: "var(--color-text-primary)", marginBottom: "8px" }}>Geen monitors actief</h3>
                        <p style={{ color: "var(--color-text-secondary)", maxWidth: "400px", margin: "0 auto 24px", fontSize: "0.9rem" }}>
                            Voeg een website monitor toe om uptime, SSL en responstijden te volgen.
                        </p>
                        <button onClick={() => setShowAddForm(true)} style={{
                            padding: "12px 28px", background: "var(--color-brand)", border: "none", borderRadius: "8px",
                            color: "white", fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "0.9rem"
                        }}><Plus size={16} /> Eerste Monitor Toevoegen</button>
                    </div>
                )}
            </div>

            <style jsx>{`
                .monitor-row:hover { background: rgba(255,255,255,0.02); }
                .menu-trigger:hover { background: var(--color-surface-hover); color: var(--color-text-primary); }
                .dropdown-item:hover { background: var(--color-surface-hover) !important; }
                @keyframes slideDown { from { opacity: 0; max-height: 0; } to { opacity: 1; max-height: 2000px; } }
            `}</style>
        </div>
    );
}

// ── Shared styles ───────────────────────────────
const labelStyle: React.CSSProperties = { fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "6px" };
const formInputStyle: React.CSSProperties = { width: "100%", padding: "10px 14px", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "8px", color: "var(--color-text-primary)", fontSize: "0.875rem", outline: "none", boxSizing: "border-box" };
const dropdownItemStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: "10px", width: "100%", padding: "10px 14px", background: "none", border: "none", color: "var(--color-text-primary)", fontSize: "0.8rem", cursor: "pointer", textAlign: "left" };
