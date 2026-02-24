"use client";

import React, { useState } from "react";
import {
    Globe, Plus, RotateCcw, ExternalLink, Trash2, FileWarning,
    Shield, Settings, Pause, Play, Lock, Mail, Wifi, Eye,
    Phone, MessageSquare, Bell, ChevronDown, ChevronRight, AlertTriangle
} from "lucide-react";
import Link from "next/link";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

// ── Shared styles ───────────────────────────────
const kpiCardStyle: React.CSSProperties = {
    background: "var(--color-surface-elevated)", borderRadius: "10px", padding: "16px", border: "1px solid var(--color-border)"
};
const kpiLabelStyle: React.CSSProperties = {
    fontSize: "0.7rem", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: "6px"
};
const kpiSubStyle: React.CSSProperties = { fontSize: "0.7rem", color: "var(--color-text-muted)", marginTop: "4px" };
const thStyle: React.CSSProperties = { paddingBottom: "12px", fontWeight: 500, fontSize: "0.8rem", textAlign: "center" };
const inputStyle: React.CSSProperties = {
    flex: 1, padding: "10px 14px", background: "var(--color-surface)", border: "1px solid var(--color-border)",
    borderRadius: "8px", color: "var(--color-text-primary)", fontSize: "0.85rem", outline: "none", width: "100%",
    transition: "border-color 0.2s",
};
const selectStyle: React.CSSProperties = {
    padding: "10px 14px", background: "var(--color-surface)", border: "1px solid var(--color-border)",
    borderRadius: "8px", color: "var(--color-text-primary)", fontSize: "0.85rem", outline: "none", width: "100%",
    appearance: "none" as any, cursor: "pointer",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 12px center",
    paddingRight: "36px",
};
const fieldLabelStyle: React.CSSProperties = {
    fontSize: "0.8rem", fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: "6px", display: "block"
};
const fieldHelpStyle: React.CSSProperties = {
    fontSize: "0.7rem", color: "var(--color-text-muted)", marginTop: "6px"
};
const sectionCardStyle: React.CSSProperties = {
    background: "var(--color-surface-elevated)", borderRadius: "12px", padding: "20px", border: "1px solid var(--color-border)"
};
const checkboxStyle = (checked: boolean): React.CSSProperties => ({
    width: "18px", height: "18px", borderRadius: "4px", cursor: "pointer",
    border: checked ? "none" : "2px solid var(--color-border)",
    background: checked ? "var(--color-brand)" : "transparent",
    display: "flex", alignItems: "center", justifyContent: "center",
    transition: "all 0.15s", flexShrink: 0,
});

// ── Two-column section layout (BetterStack-style) ──
function SettingsSection({ title, description, children, noBorder }: {
    title: string; description?: string; children: React.ReactNode; noBorder?: boolean;
}) {
    return (
        <div style={{
            display: "grid",
            gridTemplateColumns: "320px 1fr",
            gap: "48px",
            padding: "32px 0",
            borderBottom: noBorder ? "none" : "1px solid var(--color-border)",
        }}>
            <div>
                <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--color-text-primary)", margin: "0 0 8px" }}>
                    {title}
                </h3>
                {description && (
                    <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", margin: 0, lineHeight: 1.5 }}>
                        {description}
                    </p>
                )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                {children}
            </div>
        </div>
    );
}

interface MonitorDetailProps {
    domain: any;
    stats: any;
    tab: string;
    setTab: (t: string) => void;
    settings: any;
    updateSetting: (key: string, val: any) => void;
    isSaving: boolean;
    isSyncing: boolean;
    pages: any[];
    onSync: () => void;
    onPause: () => void;
    onSaveSettings: () => void;
    onDeleteMonitor: () => void;
    onAddPage: (url: string, label: string) => Promise<any>;
    onDeletePage: (pageId: string) => Promise<void>;
}

export default function MonitorDetail({
    domain, stats, tab, setTab, settings: s, updateSetting,
    isSaving, isSyncing, pages, onSync, onPause, onSaveSettings,
    onDeleteMonitor, onAddPage, onDeletePage
}: MonitorDetailProps) {
    const [newPageUrl, setNewPageUrl] = React.useState("");
    const [newPageLabel, setNewPageLabel] = React.useState("");
    const [isAddingPage, setIsAddingPage] = React.useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);

    // Use actual incidents from the database instead of deriving them
    const incidents = domain.incidents || [];
    const activeIncidents = incidents.filter((i: any) => i.status === "ONGOING" || i.status === "ACKNOWLEDGED");

    const getRootCauseColor = (code: string) => {
        if (['500', '502', '503', '504', 'RES'].includes(code)) return '#ef4444';
        if (['T/O', 'DNS'].includes(code)) return '#f59e0b';
        return '#f59e0b';
    };

    const tabs = [
        { key: 'overview', label: 'Overzicht', icon: <Eye size={16} /> },
        { key: 'pages', label: "Pagina's", icon: <Globe size={16} /> },
        { key: 'incidents', label: 'Incidenten', icon: <AlertTriangle size={16} />, badge: activeIncidents.length > 0 ? activeIncidents.length : undefined },
        { key: 'settings', label: 'Instellingen', icon: <Settings size={16} /> },
    ];

    return (
        <div>
            {/* ── Tab Navigation ── */}
            <div style={{
                display: "flex",
                gap: "0",
                borderBottom: "2px solid var(--color-border)",
                marginBottom: "0",
                marginTop: "24px",
            }}>
                {tabs.map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)} style={{
                        padding: "12px 24px",
                        fontSize: "0.875rem",
                        fontWeight: 600,
                        color: tab === t.key ? "var(--color-brand)" : "var(--color-text-muted)",
                        background: "none",
                        border: "none",
                        borderBottom: tab === t.key ? "2px solid var(--color-brand)" : "2px solid transparent",
                        marginBottom: "-2px",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                    }} className="tab-btn">
                        {t.icon} {t.label}
                        {t.badge && (
                            <span style={{
                                background: "#ef4444", color: "white", fontSize: "0.65rem", fontWeight: 700,
                                padding: "1px 6px", borderRadius: "10px", minWidth: "18px", textAlign: "center",
                            }}>{t.badge}</span>
                        )}
                    </button>
                ))}
                <div style={{ flex: 1 }} />
                <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 0" }}>
                    <button onClick={() => alert("Test notificatie verzonden!")} style={{
                        padding: "8px 16px", borderRadius: "8px", border: "1px solid var(--color-border)",
                        background: "var(--color-surface-elevated)", color: "var(--color-text-primary)",
                        fontSize: "0.8rem", fontWeight: 500, cursor: "pointer",
                        display: "flex", alignItems: "center", gap: "6px", transition: "all 0.2s",
                    }} className="action-btn">
                        <Bell size={14} /> Test notificatie
                    </button>
                    <button onClick={onPause} style={{
                        padding: "8px 16px", borderRadius: "8px", border: "1px solid var(--color-border)",
                        background: "var(--color-surface-elevated)", color: "var(--color-text-primary)",
                        fontSize: "0.8rem", fontWeight: 500, cursor: "pointer",
                        display: "flex", alignItems: "center", gap: "6px", transition: "all 0.2s",
                    }} className="action-btn">
                        {domain.active ? <><Pause size={14} /> Pauzeren</> : <><Play size={14} /> Hervatten</>}
                    </button>
                    <button onClick={onSync} disabled={isSyncing} style={{
                        padding: "8px 16px", borderRadius: "8px", border: "1px solid var(--color-border)",
                        background: "var(--color-surface-elevated)", color: "var(--color-text-primary)",
                        fontSize: "0.8rem", fontWeight: 500, cursor: "pointer",
                        display: "flex", alignItems: "center", gap: "6px", transition: "all 0.2s",
                        opacity: isSyncing ? 0.6 : 1
                    }} className="action-btn">
                        <RotateCcw size={14} className={isSyncing ? "animate-spin" : ""} /> Verversen
                    </button>
                    {tab === 'settings' && (
                        <button onClick={onDeleteMonitor} style={{
                            padding: "8px 16px", borderRadius: "8px",
                            border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)",
                            color: "#ef4444", fontSize: "0.8rem", fontWeight: 500, cursor: "pointer",
                            display: "flex", alignItems: "center", gap: "6px", transition: "all 0.15s",
                        }} className="delete-btn">
                            <Trash2 size={14} /> Verwijderen
                        </button>
                    )}
                </div>
            </div>

            {/* ── Tab Content ── */}
            <div style={{ animation: "fadeIn 0.3s ease-out" }}>
                {/* ─── OVERVIEW TAB ─── */}
                {tab === 'overview' && (<div style={{ paddingTop: "28px" }}>
                    {/* KPI Cards */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "24px" }}>
                        <div style={kpiCardStyle}>
                            <div style={kpiLabelStyle}>Status</div>
                            <div style={{ fontSize: "1.25rem", fontWeight: 700, color: stats.statusColor }}>{stats.currentStatus}</div>
                            <div style={kpiSubStyle}>{stats.lastCheckText}</div>
                        </div>
                        <div style={kpiCardStyle}>
                            <div style={kpiLabelStyle}>Gem. responstijd</div>
                            <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--color-text-primary)" }}>{stats.avgResponseTime} ms</div>
                            <div style={kpiSubStyle}>{stats.minResponseTime}ms min / {stats.maxResponseTime}ms max</div>
                        </div>
                        <div style={kpiCardStyle}>
                            <div style={kpiLabelStyle}>Uptime 7 dagen</div>
                            <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#10b981" }}>{domain.uptime7d}%</div>
                            <div style={kpiSubStyle}>Laatste 7 dagen</div>
                        </div>
                        <div style={kpiCardStyle}>
                            <div style={kpiLabelStyle}>Uptime 30 dagen</div>
                            <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#10b981" }}>{domain.uptime30d}%</div>
                            <div style={kpiSubStyle}>Laatste 30 dagen</div>
                        </div>
                    </div>

                    {/* Chart + SSL */}
                    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "16px", marginBottom: "24px" }}>
                        <div style={sectionCardStyle}>
                            <h4 style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--color-text-primary)", margin: "0 0 16px" }}>Responstijd</h4>
                            <div style={{ width: '100%', height: 200 }}>
                                {stats.chartData.length > 0 ? (
                                    <ResponsiveContainer>
                                        <LineChart data={stats.chartData} margin={{ top: 5, right: 0, left: -20, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                            <XAxis dataKey="time" stroke="rgba(255,255,255,0.2)" fontSize={10} tickMargin={8} minTickGap={40} />
                                            <YAxis stroke="rgba(255,255,255,0.2)" fontSize={10} tickFormatter={(val) => val + 'ms'} />
                                            <Tooltip contentStyle={{ background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '0.8rem' }} itemStyle={{ color: '#10b981' }} />
                                            <Line type="monotone" dataKey="responseMs" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 5, fill: '#10b981' }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-muted)", fontSize: "0.8rem" }}>
                                        Nog onvoldoende data voor grafiek.
                                    </div>
                                )}
                            </div>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                            <div style={sectionCardStyle}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", color: "var(--color-text-primary)", fontWeight: 600, fontSize: "0.875rem" }}>
                                    <Shield size={16} color={stats.config.ssl ? "#10b981" : "#9ca3af"} /> SSL & Domein
                                </div>
                                <div style={{ marginBottom: "14px" }}>
                                    <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.03em" }}>Domein</div>
                                    <a href={`https://${domain.externalId}`} target="_blank" rel="noopener noreferrer"
                                        style={{ color: "var(--color-brand)", textDecoration: "none", fontSize: "0.85rem", fontWeight: 500, display: "flex", alignItems: "center", gap: "4px" }}>
                                        {domain.externalId} <ExternalLink size={12} />
                                    </a>
                                </div>
                                {stats.config.sslDetails && !stats.config.sslDetails.error && (
                                    <div>
                                        <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.03em" }}>SSL Certificaat</div>
                                        <div style={{ fontSize: "0.85rem", color: "var(--color-text-primary)", fontWeight: 500 }}>
                                            Geldig t/m {new Date(stats.config.sslDetails.validTo).toLocaleDateString("nl-NL")}
                                        </div>
                                        <div style={{ fontSize: "0.7rem", color: "#10b981", marginTop: "4px" }}>
                                            Uitgever: {stats.config.sslDetails.issuer || "Onbekend"}
                                        </div>
                                    </div>
                                )}
                                {stats.config.sslDetails?.error && (<div style={{ fontSize: "0.8rem", color: "#ef4444" }}>SSL check mislukt</div>)}
                                {!stats.config.sslDetails && (<div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>Wacht op eerste scan...</div>)}
                            </div>
                        </div>
                    </div>

                    {/* Availability Table */}
                    <div style={sectionCardStyle}>
                        <h4 style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--color-text-primary)", margin: "0 0 14px" }}>Beschikbaarheid</h4>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                            <thead>
                                <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                                    <th style={{ ...thStyle, textAlign: "left" }}>Periode</th>
                                    <th style={thStyle}>Beschikbaarheid</th>
                                    <th style={thStyle}>Downtime</th>
                                    <th style={thStyle}>Incidenten</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[
                                    { label: "Laatste 7 dagen", uptime: domain.uptime7d },
                                    { label: "Laatste 30 dagen", uptime: domain.uptime30d },
                                ].map(row => {
                                    const up = parseFloat(row.uptime || "100");
                                    const downPct = (100 - up).toFixed(2);
                                    return (
                                        <tr key={row.label} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                                            <td style={{ padding: "10px 0", color: "var(--color-text-primary)", fontWeight: 500 }}>{row.label}</td>
                                            <td style={{ padding: "10px 0", textAlign: "center", color: up >= 99.9 ? "#10b981" : up >= 99 ? "#f59e0b" : "#ef4444", fontWeight: 700 }}>{row.uptime}%</td>
                                            <td style={{ padding: "10px 0", textAlign: "center", color: "var(--color-text-muted)" }}>{downPct === "0.00" ? "geen" : downPct + "%"}</td>
                                            <td style={{ padding: "10px 0", textAlign: "center", color: "var(--color-text-muted)" }}>{downPct === "0.00" ? "0" : "—"}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>)}

                {/* ─── SETTINGS TAB (BetterStack-style) ─── */}
                {tab === 'settings' && (<div>
                    {/* What to monitor */}
                    <SettingsSection
                        title="Wat te monitoren"
                        description="Configureer de website die je wilt monitoren. Geavanceerde opties vind je verderop."
                    >
                        <div>
                            <label style={fieldLabelStyle}>Waarschuw wanneer</label>
                            <select
                                value={s.alertCondition}
                                onChange={(e) => updateSetting('alertCondition', e.target.value)}
                                style={selectStyle}
                            >
                                <option value="url_unavailable">URL is niet bereikbaar</option>
                                <option value="status_not_2xx">Status code is niet 2xx</option>
                                <option value="keyword_missing">Zoekwoord ontbreekt</option>
                                <option value="keyword_present">Zoekwoord aanwezig</option>
                                <option value="response_slow">Responstijd te hoog</option>
                            </select>
                        </div>
                        <div>
                            <label style={fieldLabelStyle}>URL om te monitoren</label>
                            <input
                                type="text"
                                value={`https://${domain.externalId}`}
                                readOnly
                                style={{ ...inputStyle, opacity: 0.7, cursor: "default" }}
                            />
                        </div>
                    </SettingsSection>

                    {/* On-call escalation */}
                    <SettingsSection
                        title="Notificaties"
                        description="Stel in hoe je op de hoogte wordt gebracht wanneer er een incident plaatsvindt."
                    >
                        <div>
                            <label style={fieldLabelStyle}>Wanneer er een nieuw incident is</label>
                            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                                {[
                                    { key: "notifyCall", label: "Bellen", icon: <Phone size={13} /> },
                                    { key: "notifySms", label: "SMS", icon: <MessageSquare size={13} /> },
                                    { key: "notifyEmail", label: "E-mail", icon: <Mail size={13} /> },
                                    { key: "notifyPush", label: "Push", icon: <Bell size={13} /> },
                                ].map(n => (
                                    <button
                                        key={n.key}
                                        onClick={() => updateSetting(n.key, !s[n.key])}
                                        style={{
                                            padding: "8px 16px", borderRadius: "8px", fontSize: "0.8rem", fontWeight: 500,
                                            cursor: "pointer", display: "flex", alignItems: "center", gap: "8px",
                                            border: s[n.key] ? "1px solid var(--color-brand)" : "1px solid var(--color-border)",
                                            background: s[n.key] ? "rgba(99,102,241,0.12)" : "var(--color-surface)",
                                            color: s[n.key] ? "var(--color-brand)" : "var(--color-text-muted)",
                                            transition: "all 0.15s",
                                        }}
                                    >
                                        <div style={checkboxStyle(s[n.key])}>
                                            {s[n.key] && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                                        </div>
                                        {n.icon} {n.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </SettingsSection>

                    {/* Advanced settings toggle */}
                    <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        style={{
                            display: "flex", alignItems: "center", gap: "8px", width: "100%",
                            padding: "16px 0", background: "none", border: "none", borderBottom: "1px solid var(--color-border)",
                            color: "var(--color-text-secondary)", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer",
                            transition: "color 0.15s",
                        }}
                        className="advanced-toggle"
                    >
                        {showAdvanced ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        Geavanceerde instellingen
                    </button>

                    {showAdvanced && (<>
                        {/* Advanced settings */}
                        <SettingsSection
                            title="Geavanceerd"
                            description="Fijnafstelling van monitoring parameters zoals herstelperiode, bevestigingsperiode en controle-interval."
                        >
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                                <div>
                                    <label style={fieldLabelStyle}>Herstelperiode</label>
                                    <select value={s.recoveryPeriod} onChange={(e) => updateSetting('recoveryPeriod', Number(e.target.value))} style={selectStyle}>
                                        {[1, 2, 3, 5, 10, 15, 30].map(v => (
                                            <option key={v} value={v}>{v} {v === 1 ? 'minuut' : 'minuten'}</option>
                                        ))}
                                    </select>
                                    <div style={fieldHelpStyle}>Hoe lang de monitor beschikbaar moet zijn om automatisch als hersteld te markeren.</div>
                                </div>
                                <div>
                                    <label style={fieldLabelStyle}>Bevestigingsperiode</label>
                                    <select value={s.confirmationPeriod} onChange={(e) => updateSetting('confirmationPeriod', Number(e.target.value))} style={selectStyle}>
                                        <option value={0}>Direct starten</option>
                                        {[1, 2, 3, 5, 10].map(v => (
                                            <option key={v} value={v}>{v} {v === 1 ? 'minuut' : 'minuten'}</option>
                                        ))}
                                    </select>
                                    <div style={fieldHelpStyle}>Wachttijd na een storing voordat een nieuw incident wordt aangemaakt.</div>
                                </div>
                            </div>

                            <div>
                                <label style={fieldLabelStyle}>Controle-interval</label>
                                <select value={s.uptimeInterval} onChange={(e) => updateSetting('uptimeInterval', Number(e.target.value))} style={selectStyle}>
                                    {[1, 2, 3, 5, 10, 15, 30, 60].map(v => (
                                        <option key={v} value={v}>{v < 60 ? `${v} minuten` : '1 uur'}</option>
                                    ))}
                                </select>
                                <div style={fieldHelpStyle}>Hoe vaak de monitor wordt gecontroleerd.</div>
                            </div>
                        </SettingsSection>

                        {/* SSL & domain verification */}
                        <SettingsSection
                            title="SSL & domein verificatie"
                        >
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                                <div>
                                    <label style={fieldLabelStyle}>SSL/TLS verificatie</label>
                                    <select value={s.ssl ? "on" : "off"} onChange={(e) => updateSetting('ssl', e.target.value === "on")} style={selectStyle}>
                                        <option value="on">Aan</option>
                                        <option value="off">Uit</option>
                                    </select>
                                    <div style={fieldHelpStyle}>Controleer SSL certificaten op geldigheid.</div>
                                </div>
                                <div>
                                    <label style={fieldLabelStyle}>SSL verloopdatum</label>
                                    <select value={s.sslExpiration ? String(s.sslExpirationDays) : "off"} onChange={(e) => {
                                        if (e.target.value === "off") {
                                            updateSetting('sslExpiration', false);
                                        } else {
                                            updateSetting('sslExpiration', true);
                                            updateSetting('sslExpirationDays', Number(e.target.value));
                                        }
                                    }} style={selectStyle}>
                                        <option value="off">Niet controleren</option>
                                        <option value="7">7 dagen van tevoren</option>
                                        <option value="14">14 dagen van tevoren</option>
                                        <option value="30">30 dagen van tevoren</option>
                                        <option value="60">60 dagen van tevoren</option>
                                    </select>
                                    <div style={fieldHelpStyle}>Waarschuw wanneer het SSL certificaat bijna verloopt.</div>
                                </div>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                                <div>
                                    <label style={fieldLabelStyle}>Domein verloopdatum</label>
                                    <select value={s.domainExpiration ? "on" : "off"} onChange={(e) => updateSetting('domainExpiration', e.target.value === "on")} style={selectStyle}>
                                        <option value="off">Niet controleren</option>
                                        <option value="on">Controleren</option>
                                    </select>
                                    <div style={fieldHelpStyle}>Waarschuw wanneer het domein bijna verloopt.</div>
                                </div>
                            </div>
                        </SettingsSection>

                        {/* Request parameters */}
                        <SettingsSection
                            title="Request parameters"
                        >
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                                <div>
                                    <label style={fieldLabelStyle}>HTTP methode</label>
                                    <select value={s.httpMethod} onChange={(e) => updateSetting('httpMethod', e.target.value)} style={selectStyle}>
                                        {['HEAD', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(m => (
                                            <option key={m} value={m}>{m}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label style={fieldLabelStyle}>Request timeout</label>
                                    <select value={s.requestTimeout} onChange={(e) => updateSetting('requestTimeout', Number(e.target.value))} style={selectStyle}>
                                        {[5, 10, 15, 20, 30, 45, 60].map(t => (
                                            <option key={t} value={t}>{t} seconden</option>
                                        ))}
                                    </select>
                                    <div style={fieldHelpStyle}>Dit omvat zowel de open- als leestijd.</div>
                                </div>
                            </div>

                            {['POST', 'PUT', 'PATCH'].includes(s.httpMethod) && (
                                <div>
                                    <label style={fieldLabelStyle}>Request body voor POST, PUT en PATCH requests</label>
                                    <textarea
                                        value={s.requestBody}
                                        onChange={(e) => updateSetting('requestBody', e.target.value)}
                                        placeholder='parameter1=value1&parameter2=value2'
                                        style={{
                                            ...inputStyle, minHeight: "80px", resize: "vertical",
                                            fontFamily: "monospace", fontSize: "0.8rem",
                                        }}
                                    />
                                </div>
                            )}

                            <div style={{ display: "flex", gap: "24px" }}>
                                <button
                                    onClick={() => updateSetting('followRedirects', !s.followRedirects)}
                                    style={{
                                        display: "flex", alignItems: "center", gap: "10px",
                                        background: "none", border: "none", cursor: "pointer", padding: 0,
                                        color: "var(--color-text-primary)", fontSize: "0.85rem", fontWeight: 500,
                                    }}
                                >
                                    <div style={checkboxStyle(s.followRedirects)}>
                                        {s.followRedirects && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                                    </div>
                                    Redirects volgen
                                </button>
                                <button
                                    onClick={() => updateSetting('keepCookies', !s.keepCookies)}
                                    style={{
                                        display: "flex", alignItems: "center", gap: "10px",
                                        background: "none", border: "none", cursor: "pointer", padding: 0,
                                        color: "var(--color-text-primary)", fontSize: "0.85rem", fontWeight: 500,
                                    }}
                                >
                                    <div style={checkboxStyle(s.keepCookies)}>
                                        {s.keepCookies && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                                    </div>
                                    Cookies behouden bij redirects
                                </button>
                            </div>
                        </SettingsSection>

                        {/* Request headers */}
                        <SettingsSection
                            title="Request headers"
                            noBorder
                        >
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 40px", gap: "8px" }}>
                                    <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.03em", paddingBottom: "4px" }}>Header naam</div>
                                    <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.03em", paddingBottom: "4px" }}>Header waarde</div>
                                    <div />
                                </div>
                                {(s.requestHeaders || [{ name: "", value: "" }]).map((header: any, idx: number) => (
                                    <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 40px", gap: "8px", alignItems: "center" }}>
                                        <input
                                            value={header.name}
                                            onChange={(e) => {
                                                const headers = [...s.requestHeaders];
                                                headers[idx] = { ...headers[idx], name: e.target.value };
                                                updateSetting('requestHeaders', headers);
                                            }}
                                            placeholder="Content-Type"
                                            style={inputStyle}
                                        />
                                        <input
                                            value={header.value}
                                            onChange={(e) => {
                                                const headers = [...s.requestHeaders];
                                                headers[idx] = { ...headers[idx], value: e.target.value };
                                                updateSetting('requestHeaders', headers);
                                            }}
                                            placeholder="application/json"
                                            style={inputStyle}
                                        />
                                        {s.requestHeaders.length > 1 && (
                                            <button
                                                onClick={() => {
                                                    const headers = s.requestHeaders.filter((_: any, i: number) => i !== idx);
                                                    updateSetting('requestHeaders', headers);
                                                }}
                                                style={{
                                                    background: "none", border: "none", color: "var(--color-text-muted)",
                                                    cursor: "pointer", padding: "4px", display: "flex",
                                                    borderRadius: "4px", transition: "color 0.15s",
                                                }}
                                                className="delete-header-btn"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <button
                                    onClick={() => {
                                        const headers = [...(s.requestHeaders || []), { name: "", value: "" }];
                                        updateSetting('requestHeaders', headers);
                                    }}
                                    style={{
                                        display: "flex", alignItems: "center", gap: "6px", padding: "8px 0",
                                        background: "none", border: "none", color: "var(--color-brand)",
                                        fontSize: "0.8rem", fontWeight: 500, cursor: "pointer",
                                    }}
                                >
                                    <Plus size={14} /> Header toevoegen
                                </button>
                            </div>
                        </SettingsSection>
                    </>)}

                    {/* Save bar */}
                    <div style={{
                        marginTop: "24px", paddingTop: "24px", borderTop: "1px solid var(--color-border)",
                        display: "flex", justifyContent: "flex-end",
                    }}>
                        <button onClick={onSaveSettings} disabled={isSaving} style={{
                            padding: "10px 28px", background: "var(--color-brand)", border: "none", borderRadius: "8px",
                            color: "white", fontWeight: 600, fontSize: "0.85rem", cursor: isSaving ? "not-allowed" : "pointer",
                            opacity: isSaving ? 0.6 : 1, display: "flex", alignItems: "center", gap: "6px"
                        }}>{isSaving ? "Opslaan..." : "Instellingen opslaan"}</button>
                    </div>
                </div>)}

                {/* ─── INCIDENTS TAB ─── */}
                {tab === 'incidents' && (
                    <div style={{ paddingTop: "28px" }}>
                        {/* Active incidents banner */}
                        {activeIncidents.length > 0 && (
                            <div style={{
                                display: "flex", alignItems: "center", gap: "12px", padding: "14px 18px",
                                background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
                                borderRadius: "10px", marginBottom: "20px",
                            }}>
                                <AlertTriangle size={18} color="#ef4444" />
                                <div>
                                    <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#ef4444" }}>
                                        {activeIncidents.length} actief {activeIncidents.length === 1 ? 'incident' : 'incidenten'}
                                    </div>
                                    <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", marginTop: "2px" }}>
                                        Er zijn momenteel openstaande incidenten voor deze monitor
                                    </div>
                                </div>
                            </div>
                        )}

                        {incidents.length === 0 ? (
                            <div style={{
                                ...sectionCardStyle,
                                textAlign: "center", padding: "48px 20px",
                            }}>
                                <div style={{ fontSize: "2rem", marginBottom: "12px" }}>🎉</div>
                                <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--color-text-primary)", marginBottom: "4px" }}>Geen incidenten</div>
                                <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>Er zijn geen incidenten geregistreerd voor deze monitor</div>
                            </div>
                        ) : (
                            <div style={{ borderRadius: "10px", overflow: "hidden", border: "1px solid var(--color-border)" }}>
                                {/* Table header */}
                                <div style={{
                                    display: "grid",
                                    gridTemplateColumns: "100px 1fr 180px 1fr 1fr 100px",
                                    padding: "10px 16px",
                                    background: "rgba(255,255,255,0.02)",
                                    borderBottom: "1px solid var(--color-border)",
                                    fontSize: "0.7rem", fontWeight: 600, color: "var(--color-text-muted)",
                                    textTransform: "uppercase", letterSpacing: "0.04em",
                                }}>
                                    <div>Status</div>
                                    <div>Monitor</div>
                                    <div>Oorzaak</div>
                                    <div>Gestart</div>
                                    <div>Opgelost</div>
                                    <div style={{ textAlign: "right" }}>Duur</div>
                                </div>

                                {/* Table rows */}
                                {incidents.map((inc: any) => {
                                    const isActive = !inc.resolvedAt;
                                    const startDate = new Date(inc.startedAt);
                                    const rcColor = getRootCauseColor(inc.rootCauseCode);

                                    return (
                                        <Link key={inc.id} href={`/dashboard/projects/${domain.clientId}/monitoring/incidents/${inc.id}`} style={{ textDecoration: "none" }}>
                                            <div style={{
                                                display: "grid",
                                                gridTemplateColumns: "100px 1fr 180px 1fr 1fr 100px",
                                                padding: "12px 16px",
                                                borderBottom: "1px solid rgba(255,255,255,0.03)",
                                                background: "var(--color-surface)",
                                                alignItems: "center",
                                                fontSize: "0.8rem",
                                                transition: "background 0.15s",
                                            }} className="incident-row">
                                                {/* Status */}
                                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                    <div style={{
                                                        width: "8px", height: "8px", borderRadius: "50%",
                                                        background: isActive ? (inc.status === "ACKNOWLEDGED" ? "#f59e0b" : "#ef4444") : "#10b981",
                                                        boxShadow: isActive ? `0 0 6px ${inc.status === "ACKNOWLEDGED" ? 'rgba(245,158,11,0.4)' : 'rgba(239,68,68,0.4)'}` : "none",
                                                    }} />
                                                    <span style={{
                                                        fontSize: "0.75rem", fontWeight: 600,
                                                        color: isActive ? (inc.status === "ACKNOWLEDGED" ? "#f59e0b" : "#ef4444") : "#10b981",
                                                        textTransform: "capitalize"
                                                    }}>
                                                        {inc.status.toLowerCase()}
                                                    </span>
                                                </div>

                                                <div style={{ color: "var(--color-text-primary)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                    {inc.title}
                                                </div>

                                                {/* Root Cause */}
                                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                    <span style={{
                                                        fontSize: "0.65rem", fontWeight: 700,
                                                        padding: "2px 6px", borderRadius: "4px",
                                                        background: rcColor, color: "white",
                                                        minWidth: "28px", textAlign: "center",
                                                    }}>
                                                        {inc.causeCode || 'UNK'}
                                                    </span>
                                                    <span style={{ color: "var(--color-text-secondary)", fontSize: "0.78rem" }}>
                                                        {inc.cause}
                                                    </span>
                                                </div>

                                                {/* Started */}
                                                <div style={{ color: "var(--color-text-muted)", fontSize: "0.75rem" }}>
                                                    {startDate.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })}, {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                </div>

                                                {/* Resolved */}
                                                <div style={{ color: "var(--color-text-muted)", fontSize: "0.75rem" }}>
                                                    {inc.resolvedAt ? (() => {
                                                        const d = new Date(inc.resolvedAt);
                                                        return `${d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })}, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
                                                    })() : <span style={{ color: "#ef4444", fontWeight: 500 }}>—</span>}
                                                </div>

                                                {/* Duration (Need to calculate diff) */}
                                                <div style={{ color: "var(--color-text-muted)", fontSize: "0.75rem", textAlign: "right" }}>
                                                    {(() => {
                                                        const end = inc.resolvedAt ? new Date(inc.resolvedAt) : new Date();
                                                        const ms = end.getTime() - startDate.getTime();
                                                        const mins = Math.floor(ms / 60000);
                                                        const hrs = Math.floor(mins / 60);
                                                        return hrs > 0 ? `${hrs}u ${mins % 60}m` : `${mins}m ${Math.floor((ms % 60000) / 1000)}s`;
                                                    })()}
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* ─── PAGES TAB ─── */}
                {tab === 'pages' && (() => {
                    const mainDomain = domain.externalId;
                    const mainUrl = `https://${mainDomain}`;
                    const lastCheck = (domain.uptimeChecks || [])[0];
                    const mainStatusColor = !domain.active ? "#9ca3af" : lastCheck ? (lastCheck.status === "UP" ? "#10b981" : "#ef4444") : "#9ca3af";
                    const mainStatusOk = lastCheck?.status === "UP";
                    const maxExtraPages = 10;
                    const canAddMore = pages.length < maxExtraPages;

                    const validatePageInput = (url: string): string | null => {
                        let cleaned = url.trim();
                        // Block external domains
                        if (cleaned.startsWith('http://') || cleaned.startsWith('https://')) {
                            try {
                                const parsed = new URL(cleaned);
                                if (parsed.hostname !== mainDomain && parsed.hostname !== `www.${mainDomain}` && `www.${parsed.hostname}` !== mainDomain) {
                                    return null; // external domain blocked
                                }
                                cleaned = parsed.pathname + parsed.search + parsed.hash;
                            } catch { return null; }
                        }
                        if (cleaned.includes('://')) return null;
                        // Ensure starts with /
                        if (!cleaned.startsWith('/')) cleaned = '/' + cleaned;
                        return cleaned;
                    };

                    return (
                        <div style={{ ...sectionCardStyle, marginTop: "28px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
                                <div>
                                    <h4 style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--color-text-primary)", margin: 0 }}>Gemonitorde pagina&apos;s</h4>
                                    <p style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", margin: "2px 0 0" }}>Hoofddomein + individuele pagina&apos;s op {mainDomain}</p>
                                </div>
                                <span style={{ fontSize: "0.7rem", color: pages.length >= maxExtraPages ? "#f59e0b" : "var(--color-text-muted)", fontWeight: 500 }}>
                                    {pages.length} / {maxExtraPages} extra pagina&apos;s
                                </span>
                            </div>

                            {/* Add page form */}
                            <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                                <div style={{ position: "relative", flex: 1, display: "flex", alignItems: "center" }}>
                                    <span style={{ position: "absolute", left: "12px", fontSize: "0.8rem", color: "var(--color-text-muted)", pointerEvents: "none" }}>{mainDomain}</span>
                                    <input
                                        placeholder="/pagina-pad"
                                        value={newPageUrl}
                                        onChange={(e) => setNewPageUrl(e.target.value)}
                                        style={{ ...inputStyle, paddingLeft: `${mainDomain.length * 7.5 + 20}px` }}
                                    />
                                </div>
                                <input placeholder="Label (optioneel)" value={newPageLabel} onChange={(e) => setNewPageLabel(e.target.value)} style={{ ...inputStyle, flex: "0 0 160px" }} />
                                <button disabled={isAddingPage || !newPageUrl.trim() || !canAddMore} onClick={async () => {
                                    const validated = validatePageInput(newPageUrl.trim());
                                    if (!validated) {
                                        alert(`Alleen pagina's op ${mainDomain} kunnen worden toegevoegd.`);
                                        return;
                                    }
                                    setIsAddingPage(true);
                                    try {
                                        const result = await onAddPage(validated, newPageLabel.trim());
                                        if (result) { setNewPageUrl(""); setNewPageLabel(""); }
                                    } finally { setIsAddingPage(false); }
                                }} style={{
                                    padding: "8px 14px", background: "var(--color-brand)", border: "none", borderRadius: "6px",
                                    color: "white", fontSize: "0.8rem", fontWeight: 600,
                                    cursor: isAddingPage || !newPageUrl.trim() || !canAddMore ? "not-allowed" : "pointer",
                                    opacity: isAddingPage || !newPageUrl.trim() || !canAddMore ? 0.5 : 1,
                                    display: "flex", alignItems: "center", gap: "4px", whiteSpace: "nowrap"
                                }}><Plus size={14} /> Toevoegen</button>
                            </div>

                            {/* Pages list */}
                            <div style={{ display: "flex", flexDirection: "column", gap: "1px", borderRadius: "6px", overflow: "hidden", border: "1px solid var(--color-border)" }}>
                                {/* Main domain - always first, not deletable */}
                                <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", background: "var(--color-surface)" }}>
                                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: mainStatusColor, flexShrink: 0 }} />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--color-text-primary)", display: "flex", alignItems: "center", gap: "6px" }}>
                                            {mainDomain}
                                            <span style={{ fontSize: "0.6rem", fontWeight: 500, padding: "1px 6px", borderRadius: "4px", background: "rgba(99,102,241,0.1)", color: "var(--color-brand)", textTransform: "uppercase" }}>Hoofddomein</span>
                                            <a href={mainUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-text-muted)" }}><ExternalLink size={10} /></a>
                                        </div>
                                    </div>
                                    {lastCheck && (
                                        <span style={{
                                            fontSize: "0.7rem", fontWeight: 700, padding: "2px 6px", borderRadius: "4px",
                                            background: domain.active ? (mainStatusOk ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.15)") : "rgba(156,163,175,0.1)",
                                            color: mainStatusColor
                                        }}>
                                            {!domain.active ? "Gepauzeerd" : mainStatusOk ? "200" : "Down"}
                                        </span>
                                    )}
                                    <div style={{ fontSize: "0.65rem", color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>
                                        {lastCheck ? new Date(lastCheck.checkedAt).toLocaleString() : "—"}
                                    </div>
                                    {/* No delete button for main domain */}
                                    <div style={{ width: "16px" }} />
                                </div>

                                {/* Extra pages */}
                                {pages.map((page: any) => {
                                    const statusOk = page.lastStatus === 200;
                                    const hasStatus = page.lastStatus != null;
                                    const pColor = !domain.active ? "#9ca3af" : !hasStatus ? "#9ca3af" : statusOk ? "#10b981" : page.lastStatus >= 500 ? "#ef4444" : "#f59e0b";
                                    return (
                                        <div key={page.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", background: "var(--color-surface)" }}>
                                            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: pColor, flexShrink: 0 }} />
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: "0.8rem", fontWeight: 500, color: "var(--color-text-primary)", display: "flex", alignItems: "center", gap: "4px" }}>
                                                    {page.label || page.url}
                                                    <a href={`https://${mainDomain}${page.url.startsWith('/') ? '' : '/'}${page.url}`}
                                                        target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-text-muted)" }}><ExternalLink size={10} /></a>
                                                </div>
                                            </div>
                                            {hasStatus && (<span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "2px 6px", borderRadius: "4px", background: statusOk ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.15)", color: pColor }}>{page.lastStatus}</span>)}
                                            <div style={{ fontSize: "0.65rem", color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>{page.lastCheckedAt ? new Date(page.lastCheckedAt).toLocaleString() : "—"}</div>
                                            <button onClick={() => onDeletePage(page.id)} style={{ background: "none", border: "none", color: "var(--color-text-muted)", cursor: "pointer", padding: "2px", display: "flex" }} title="Verwijder"><Trash2 size={12} /></button>
                                        </div>
                                    );
                                })}
                            </div>

                            {!canAddMore && (
                                <div style={{ textAlign: "center", padding: "12px 0 0", color: "#f59e0b", fontSize: "0.75rem" }}>
                                    Maximum aantal extra pagina&apos;s bereikt ({maxExtraPages})
                                </div>
                            )}
                        </div>
                    );
                })()}
            </div>

            <style jsx>{`
                .tab-btn:hover { color: var(--color-text-primary) !important; }
                .action-btn:hover { background: var(--color-surface-hover) !important; border-color: rgba(255,255,255,0.15) !important; }
                .delete-btn:hover { background: rgba(239,68,68,0.15) !important; border-color: rgba(239,68,68,0.5) !important; }
                .advanced-toggle:hover { color: var(--color-text-primary) !important; }
                .delete-header-btn:hover { color: #ef4444 !important; }
                .incident-row:hover { background: var(--color-surface-hover) !important; }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            `}</style>
        </div>
    );
}
