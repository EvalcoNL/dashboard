"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle2, Search, ShieldAlert, Shield, ShieldCheck } from "lucide-react";
import { useState } from "react";

interface Incident {
    id: string;
    status: string;
    title: string;
    cause: string;
    causeCode: string | null;
    clientId: string;
    startedAt: string;
    acknowledgedAt: string | null;
    resolvedAt: string | null;
    client: { id: string; name: string };
    dataSource: { id: string; name: string | null; externalId: string } | null;
}

function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Zojuist";
    if (mins < 60) return `${mins} ${mins === 1 ? "minuut" : "minuten"} geleden`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} uur geleden`;
    const days = Math.floor(hours / 24);
    return `${days} ${days === 1 ? "dag" : "dagen"} geleden`;
}

function formatDuration(startStr: string, endStr?: string | null) {
    const start = new Date(startStr).getTime();
    const end = endStr ? new Date(endStr).getTime() : Date.now();
    const diff = end - start;
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    if (hours > 0) return `${hours}u ${mins}m`;
    return `${mins} minuten`;
}

function getStatusIcon(status: string) {
    switch (status) {
        case "ONGOING": return { icon: ShieldAlert, color: "#ef4444" };
        case "ACKNOWLEDGED": return { icon: Shield, color: "#f59e0b" };
        case "RESOLVED": return { icon: ShieldCheck, color: "#10b981" };
        default: return { icon: Shield, color: "#9ca3af" };
    }
}

function getStatusLabel(status: string) {
    switch (status) {
        case "ONGOING": return { label: "Ongoing", color: "#ef4444" };
        case "ACKNOWLEDGED": return { label: "Acknowledged", color: "#f59e0b" };
        case "RESOLVED": return { label: "Resolved", color: "#10b981" };
        default: return { label: status, color: "#9ca3af" };
    }
}

export default function GlobalIncidentsClient({ incidents }: { incidents: Incident[] }) {
    const [search, setSearch] = useState("");
    const activeCount = incidents.filter(i => i.status !== "RESOLVED").length;

    const filtered = incidents.filter(inc =>
        inc.title.toLowerCase().includes(search.toLowerCase()) ||
        inc.cause.toLowerCase().includes(search.toLowerCase()) ||
        inc.client?.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div style={{ padding: "32px", maxWidth: "1100px", margin: "0 auto" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "28px" }}>
                <h1 style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--color-text-primary)", margin: 0 }}>
                    Incidents
                </h1>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{
                        display: "flex", alignItems: "center", gap: "8px", padding: "8px 14px",
                        borderRadius: "8px", border: "1px solid var(--color-border)",
                        background: "var(--color-surface-elevated)", minWidth: "220px",
                    }}>
                        <Search size={15} color="var(--color-text-muted)" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search"
                            style={{
                                background: "transparent", border: "none", outline: "none",
                                color: "var(--color-text-primary)", fontSize: "0.85rem", width: "100%",
                            }}
                        />
                        <kbd style={{
                            fontSize: "0.65rem", padding: "2px 6px", borderRadius: "4px",
                            background: "rgba(99,102,241,0.2)", color: "var(--color-brand)",
                            fontWeight: 600, fontFamily: "monospace",
                        }}>/</kbd>
                    </div>
                </div>
            </div>

            {/* Table */}
            {filtered.length === 0 ? (
                <div style={{
                    textAlign: "center", padding: "60px", color: "var(--color-text-muted)",
                    background: "var(--color-surface)", borderRadius: "10px",
                    border: "1px solid var(--color-border)",
                }}>
                    <CheckCircle2 size={36} style={{ marginBottom: "12px", opacity: 0.3 }} />
                    <div style={{ fontSize: "1rem", fontWeight: 600, color: "var(--color-text-primary)", marginBottom: "6px" }}>
                        Geen incidenten gevonden
                    </div>
                    <div style={{ fontSize: "0.85rem" }}>Alles draait soepel.</div>
                </div>
            ) : (
                <div style={{ borderRadius: "10px", overflow: "hidden", border: "1px solid var(--color-border)" }}>
                    {/* Table header */}
                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 200px 180px",
                        padding: "10px 20px",
                        background: "rgba(255,255,255,0.02)",
                        borderBottom: "1px solid var(--color-border)",
                        fontSize: "0.7rem", fontWeight: 600, color: "var(--color-text-muted)",
                        textTransform: "uppercase", letterSpacing: "0.04em",
                    }}>
                        <div>Incident</div>
                        <div>Started at</div>
                        <div>Length</div>
                    </div>

                    {/* Table rows */}
                    {filtered.map(inc => {
                        const { icon: SIcon, color: sColor } = getStatusIcon(inc.status);
                        const sLabel = getStatusLabel(inc.status);

                        return (
                            <Link key={inc.id} href={`/dashboard/projects/${inc.clientId}/monitoring/incidents/${inc.id}`} style={{ textDecoration: "none" }}>
                                <div style={{
                                    display: "grid",
                                    gridTemplateColumns: "1fr 200px 180px",
                                    padding: "16px 20px",
                                    borderBottom: "1px solid rgba(255,255,255,0.03)",
                                    background: "var(--color-surface)",
                                    alignItems: "center",
                                    transition: "background 0.15s",
                                    cursor: "pointer",
                                }} className="incident-row">
                                    {/* Incident info */}
                                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                        <div style={{
                                            width: "32px", height: "32px", borderRadius: "8px",
                                            background: `${sColor}15`,
                                            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                                        }}>
                                            <SIcon size={16} color={sColor} />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--color-text-primary)", marginBottom: "2px" }}>
                                                {inc.title}
                                            </div>
                                            <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                                                {inc.cause}
                                                {inc.client && <span> · {inc.client.name}</span>}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Started at */}
                                    <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
                                        {timeAgo(inc.startedAt)}
                                    </div>

                                    {/* Length / Status */}
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        {inc.status === "ONGOING" && (
                                            <>
                                                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#ef4444" }} />
                                                <span style={{ fontSize: "0.8rem", color: "#ef4444", fontWeight: 500 }}>Ongoing</span>
                                            </>
                                        )}
                                        {inc.status === "ACKNOWLEDGED" && (
                                            <>
                                                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#f59e0b" }} />
                                                <span style={{ fontSize: "0.8rem", color: "#f59e0b", fontWeight: 500 }}>Acknowledged</span>
                                            </>
                                        )}
                                        {inc.status === "RESOLVED" && (
                                            <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
                                                {formatDuration(inc.startedAt, inc.resolvedAt)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}

            <style jsx>{`
                .incident-row:hover { background: var(--color-surface-hover) !important; }
            `}</style>
        </div>
    );
}
