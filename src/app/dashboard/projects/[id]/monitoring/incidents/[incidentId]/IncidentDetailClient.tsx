"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeft, Shield, ShieldCheck, ShieldAlert, AlertTriangle,
    ExternalLink, Globe, Send, User,
} from "lucide-react";

interface IncidentEvent {
    id: string;
    type: string;
    message: string | null;
    userId: string | null;
    userName: string | null;
    createdAt: string;
}

interface IncidentData {
    id: string;
    clientId: string;
    title: string;
    cause: string;
    causeCode: string | null;
    status: string;
    checkedUrl: string | null;
    httpMethod: string;
    statusCode: number | null;
    responseTime: number | null;
    resolvedIp: string | null;
    startedAt: string;
    acknowledgedAt: string | null;
    acknowledgedBy: string | null;
    resolvedAt: string | null;
    resolvedBy: string | null;
    createdAt: string;
    client: { id: string; name: string };
    dataSource: { id: string; name: string | null; externalId: string } | null;
    events: IncidentEvent[];
}

function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Zojuist";
    if (mins < 60) return `${mins} ${mins === 1 ? "minuut" : "minuten"} geleden`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} ${hours === 1 ? "uur" : "uur"} geleden`;
    const days = Math.floor(hours / 24);
    return `${days} ${days === 1 ? "dag" : "dagen"} geleden`;
}

function formatDuration(startStr: string, endStr?: string | null) {
    const start = new Date(startStr).getTime();
    const end = endStr ? new Date(endStr).getTime() : Date.now();
    const diff = end - start;
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    if (hours > 0) return `${hours}u ${mins}m ${secs}s`;
    return `${mins}m ${secs}s`;
}

function getStatusConfig(status: string) {
    switch (status) {
        case "ONGOING": return { label: "Ongoing", color: "#ef4444", bg: "rgba(239,68,68,0.12)", icon: ShieldAlert };
        case "ACKNOWLEDGED": return { label: "Acknowledged", color: "#f59e0b", bg: "rgba(245,158,11,0.12)", icon: Shield };
        case "RESOLVED": return { label: "Resolved", color: "#10b981", bg: "rgba(16,185,129,0.12)", icon: ShieldCheck };
        default: return { label: status, color: "#9ca3af", bg: "rgba(156,163,175,0.12)", icon: Shield };
    }
}

function getCauseColor(code: string | null) {
    if (!code) return "#ef4444";
    if (["500", "502", "503", "504", "RES"].includes(code)) return "#ef4444";
    return "#f59e0b";
}

function getEventIcon(type: string) {
    switch (type) {
        case "CREATED": return { icon: AlertTriangle, color: "#ef4444" };
        case "ACKNOWLEDGED": return { icon: Shield, color: "#f59e0b" };
        case "RESOLVED": return { icon: ShieldCheck, color: "#10b981" };
        case "REOPENED": return { icon: ShieldAlert, color: "#ef4444" };
        case "ESCALATED": return { icon: AlertTriangle, color: "#f59e0b" };
        default: return { icon: User, color: "var(--color-brand)" };
    }
}

export default function IncidentDetailClient({ incident: initial, userName }: { incident: IncidentData; userName: string }) {
    const router = useRouter();
    const [incident, setIncident] = useState(initial);
    const [comment, setComment] = useState("");
    const [loading, setLoading] = useState(false);

    const statusConfig = getStatusConfig(incident.status);
    const StatusIcon = statusConfig.icon;

    const handleAction = async (action: string) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/incidents/${incident.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action }),
            });
            if (res.ok) {
                const updated = await res.json();
                setIncident({
                    ...updated,
                    startedAt: updated.startedAt,
                    acknowledgedAt: updated.acknowledgedAt || null,
                    resolvedAt: updated.resolvedAt || null,
                    createdAt: updated.createdAt,
                    events: updated.events.map((e: any) => ({ ...e, createdAt: e.createdAt })),
                });
            }
        } finally {
            setLoading(false);
        }
    };

    const handleComment = async () => {
        if (!comment.trim()) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/incidents/${incident.id}/events`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: comment.trim(), type: "COMMENT" }),
            });
            if (res.ok) {
                const event = await res.json();
                setIncident(prev => ({
                    ...prev,
                    events: [...prev.events, { ...event, createdAt: event.createdAt }],
                }));
                setComment("");
            }
        } finally {
            setLoading(false);
        }
    };

    const cardStyle: React.CSSProperties = {
        background: "var(--color-surface-elevated)",
        border: "1px solid var(--color-border)",
        borderRadius: "10px",
        padding: "20px 24px",
    };

    return (
        <div style={{ padding: "32px", maxWidth: "960px", margin: "0 auto" }}>
            {/* Back link */}
            <Link href={`/dashboard/projects/${incident.clientId}/monitoring/incidents`} style={{
                display: "inline-flex", alignItems: "center", gap: "6px",
                color: "var(--color-text-muted)", textDecoration: "none", fontSize: "0.8rem",
                marginBottom: "20px", transition: "color 0.15s",
            }} className="back-link">
                <ArrowLeft size={14} /> Terug naar incidenten
            </Link>

            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    <div style={{
                        width: "44px", height: "44px", borderRadius: "12px",
                        background: statusConfig.bg, display: "flex",
                        alignItems: "center", justifyContent: "center",
                    }}>
                        <StatusIcon size={22} color={statusConfig.color} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--color-text-primary)", margin: 0 }}>
                            {incident.title}
                        </h1>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px" }}>
                            <span style={{
                                fontSize: "0.7rem", fontWeight: 700, padding: "3px 10px",
                                borderRadius: "12px", background: statusConfig.bg, color: statusConfig.color,
                                textTransform: "uppercase", letterSpacing: "0.03em",
                            }}>
                                {statusConfig.label}
                            </span>
                            <span style={{ fontSize: "0.78rem", color: "var(--color-text-muted)" }}>
                                · {new Date(incident.startedAt).toLocaleString("nl-NL", { dateStyle: "long", timeStyle: "short" })}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: "flex", gap: "10px" }}>
                    {incident.status === "ONGOING" && (
                        <button onClick={() => handleAction("acknowledge")} disabled={loading} style={{
                            padding: "8px 20px", borderRadius: "8px", cursor: "pointer",
                            background: "rgba(245,158,11,0.15)", color: "#f59e0b",
                            border: "1px solid rgba(245,158,11,0.3)", fontWeight: 600,
                            fontSize: "0.8rem", transition: "all 0.15s",
                        }} className="action-btn">
                            Bevestigen
                        </button>
                    )}
                    {incident.status !== "RESOLVED" && (
                        <button onClick={() => handleAction("resolve")} disabled={loading} style={{
                            padding: "8px 20px", borderRadius: "8px", cursor: "pointer",
                            background: "rgba(16,185,129,0.15)", color: "#10b981",
                            border: "1px solid rgba(16,185,129,0.3)", fontWeight: 600,
                            fontSize: "0.8rem", transition: "all 0.15s",
                        }} className="action-btn">
                            Oplossen
                        </button>
                    )}
                    {incident.status === "RESOLVED" && (
                        <button onClick={() => handleAction("reopen")} disabled={loading} style={{
                            padding: "8px 20px", borderRadius: "8px", cursor: "pointer",
                            background: "rgba(239,68,68,0.15)", color: "#ef4444",
                            border: "1px solid rgba(239,68,68,0.3)", fontWeight: 600,
                            fontSize: "0.8rem", transition: "all 0.15s",
                        }} className="action-btn">
                            Heropenen
                        </button>
                    )}
                </div>
            </div>

            {/* Acknowledged by */}
            {incident.acknowledgedBy && (
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "16px" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", display: "flex", alignItems: "center", gap: "6px" }}>
                        {incident.status === "ACKNOWLEDGED" ? "Bevestigd" : incident.status === "RESOLVED" ? "Opgelost" : "Bevestigd"} door
                        <span style={{
                            display: "inline-flex", alignItems: "center", gap: "4px",
                            background: "rgba(245,158,11,0.1)", padding: "2px 8px", borderRadius: "10px",
                            color: "#f59e0b", fontWeight: 600, fontSize: "0.7rem",
                        }}>
                            <User size={10} /> {incident.acknowledgedBy}
                        </span>
                    </span>
                </div>
            )}

            {/* Quick Links */}
            <div style={{ display: "flex", gap: "20px", marginBottom: "28px", borderBottom: "1px solid var(--color-border)", paddingBottom: "16px" }}>
                {incident.checkedUrl && (
                    <a href={incident.checkedUrl} target="_blank" rel="noopener noreferrer" style={{
                        display: "flex", alignItems: "center", gap: "6px",
                        color: "var(--color-text-muted)", fontSize: "0.8rem", textDecoration: "none",
                    }} className="quick-link">
                        <ExternalLink size={14} /> Response
                    </a>
                )}
                {incident.dataSource && (
                    <Link href={`/dashboard/projects/${incident.clientId}/monitoring/web`} style={{
                        display: "flex", alignItems: "center", gap: "6px",
                        color: "var(--color-text-muted)", fontSize: "0.8rem", textDecoration: "none",
                    }} className="quick-link">
                        <Globe size={14} /> Monitor
                    </Link>
                )}
            </div>

            {/* Info Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "24px" }}>
                <div style={cardStyle}>
                    <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>
                        Oorzaak
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        {incident.causeCode && (
                            <span style={{
                                fontSize: "0.65rem", fontWeight: 700, padding: "2px 6px",
                                borderRadius: "4px", background: getCauseColor(incident.causeCode),
                                color: "white", minWidth: "28px", textAlign: "center",
                            }}>
                                {incident.causeCode}
                            </span>
                        )}
                        <span style={{ fontSize: "1rem", fontWeight: 700, color: "var(--color-text-primary)" }}>
                            {incident.cause}
                        </span>
                    </div>
                </div>
                <div style={cardStyle}>
                    <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>
                        Gestart
                    </div>
                    <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--color-text-primary)" }}>
                        {timeAgo(incident.startedAt)}
                    </div>
                </div>
                <div style={cardStyle}>
                    <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>
                        Duur
                    </div>
                    <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--color-text-primary)" }}>
                        {incident.status === "RESOLVED"
                            ? formatDuration(incident.startedAt, incident.resolvedAt)
                            : incident.status === "ACKNOWLEDGED"
                                ? <span style={{ color: "#f59e0b" }}>Acknowledged</span>
                                : <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#ef4444", animation: "pulse 2s infinite" }} />
                                    Ongoing
                                </span>
                        }
                    </div>
                </div>
            </div>

            {/* Checked URL */}
            {incident.checkedUrl && (
                <div style={{ ...cardStyle, marginBottom: "16px" }}>
                    <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>
                        Gecontroleerde URL
                    </div>
                    <div style={{
                        background: "rgba(0,0,0,0.2)", padding: "10px 14px", borderRadius: "6px",
                        fontFamily: "monospace", fontSize: "0.85rem", color: "var(--color-text-primary)",
                    }}>
                        {incident.httpMethod} {incident.checkedUrl}
                    </div>
                </div>
            )}

            {/* Metadata */}
            <div style={{ ...cardStyle, marginBottom: "32px" }}>
                <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>
                    Metadata
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                    <tbody>
                        {incident.responseTime != null && (
                            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                                <td style={{ padding: "10px 0", color: "var(--color-text-muted)", width: "50%" }}>Responstijd</td>
                                <td style={{ padding: "10px 0", color: "var(--color-text-primary)", fontWeight: 500 }}>{incident.responseTime}ms</td>
                            </tr>
                        )}
                        {incident.statusCode != null && (
                            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                                <td style={{ padding: "10px 0", color: "var(--color-text-muted)" }}>Response code</td>
                                <td style={{ padding: "10px 0", color: "var(--color-text-primary)", fontWeight: 500 }}>{incident.statusCode}</td>
                            </tr>
                        )}
                        {incident.resolvedIp && (
                            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                                <td style={{ padding: "10px 0", color: "var(--color-text-muted)" }}>Resolved IP</td>
                                <td style={{ padding: "10px 0", color: "var(--color-text-primary)", fontFamily: "monospace", fontWeight: 500 }}>{incident.resolvedIp}</td>
                            </tr>
                        )}
                        <tr>
                            <td style={{ padding: "10px 0", color: "var(--color-text-muted)" }}>Project</td>
                            <td style={{ padding: "10px 0" }}>
                                <Link href={`/dashboard/projects/${incident.clientId}`} style={{ color: "var(--color-brand)", textDecoration: "none", fontWeight: 500 }}>
                                    {incident.client?.name}
                                </Link>
                            </td>
                        </tr>
                        {incident.dataSource && (
                            <tr>
                                <td style={{ padding: "10px 0", color: "var(--color-text-muted)" }}>Monitor</td>
                                <td style={{ padding: "10px 0", color: "var(--color-text-primary)", fontWeight: 500 }}>
                                    {incident.dataSource.name || incident.dataSource.externalId}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Timeline */}
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "20px" }}>
                Tijdlijn
            </h2>

            {/* Comment Input */}
            <div style={{ display: "flex", gap: "12px", marginBottom: "24px", alignItems: "flex-start" }}>
                <div style={{
                    width: "36px", height: "36px", borderRadius: "50%", flexShrink: 0,
                    background: "var(--color-brand)", display: "flex",
                    alignItems: "center", justifyContent: "center",
                    color: "white", fontSize: "0.7rem", fontWeight: 700,
                }}>
                    {userName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1, display: "flex", gap: "8px" }}>
                    <input
                        value={comment}
                        onChange={e => setComment(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleComment(); } }}
                        placeholder="Laat een opmerking achter..."
                        style={{
                            flex: 1, padding: "10px 14px", borderRadius: "8px",
                            border: "1px solid var(--color-border)", background: "var(--color-surface-elevated)",
                            color: "var(--color-text-primary)", fontSize: "0.85rem",
                            outline: "none", transition: "border-color 0.15s",
                        }}
                        className="comment-input"
                    />
                    <button
                        onClick={handleComment}
                        disabled={loading || !comment.trim()}
                        style={{
                            padding: "10px 16px", borderRadius: "8px", cursor: "pointer",
                            background: comment.trim() ? "#ef4444" : "rgba(239,68,68,0.2)",
                            color: "white", border: "none", fontWeight: 600,
                            fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "6px",
                            transition: "all 0.15s", opacity: comment.trim() ? 1 : 0.5,
                        }}
                    >
                        <Send size={14} /> Post
                    </button>
                </div>
            </div>

            {/* Events Timeline */}
            <div style={{ position: "relative", paddingLeft: "18px" }}>
                {/* Vertical line */}
                <div style={{
                    position: "absolute", left: "17px", top: "0", bottom: "0",
                    width: "2px", background: "var(--color-border)",
                }} />

                {[...incident.events].reverse().map((event, idx) => {
                    const { icon: EventIcon, color } = getEventIcon(event.type);
                    const isComment = event.type === "COMMENT";

                    return (
                        <div key={event.id} style={{
                            display: "flex", gap: "16px", marginBottom: idx < incident.events.length - 1 ? "20px" : "0",
                            position: "relative",
                        }}>
                            {/* Dot */}
                            <div style={{
                                width: "24px", height: "24px", borderRadius: "50%",
                                background: `${color}20`, border: `2px solid ${color}`,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                flexShrink: 0, zIndex: 1,
                            }}>
                                <EventIcon size={11} color={color} />
                            </div>

                            {/* Content */}
                            <div style={{ flex: 1, paddingTop: "2px" }}>
                                <div style={{
                                    display: "flex", alignItems: "center", justifyContent: "space-between",
                                    marginBottom: isComment ? "6px" : "0",
                                }}>
                                    <span style={{ fontSize: "0.82rem", color: "var(--color-text-primary)", fontWeight: isComment ? 400 : 500 }}>
                                        {event.message}
                                    </span>
                                    <span style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", whiteSpace: "nowrap", marginLeft: "12px" }}>
                                        {new Date(event.createdAt).toLocaleString("nl-NL", { dateStyle: "medium", timeStyle: "short" })}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <style jsx>{`
                .back-link:hover { color: var(--color-text-primary) !important; }
                .action-btn:hover { filter: brightness(1.2); }
                .action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
                .quick-link:hover { color: var(--color-brand) !important; }
                .comment-input:focus { border-color: var(--color-brand) !important; }
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.4; }
                }
            `}</style>
        </div>
    );
}
