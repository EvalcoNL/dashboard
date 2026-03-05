"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, ShieldAlert, Shield, ShieldCheck, MessageSquare, Mail, ToggleLeft, ToggleRight, BellRing } from "lucide-react";
import { useState } from "react";
import { useNotification } from "@/components/NotificationProvider";

interface Incident {
    id: string;
    status: string;
    title: string;
    cause: string;
    causeCode: string | null;
    startedAt: string;
    acknowledgedAt: string | null;
    resolvedAt: string | null;
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

export default function IncidentsClient({
    clientId,
    clientName,
    incidents,
    initialSlackWebhookUrl,
    isAdmin = false,
    userOptedIn = false
}: {
    clientId: string;
    clientName: string;
    incidents: Incident[];
    initialSlackWebhookUrl: string;
    isAdmin?: boolean;
    userOptedIn?: boolean;
}) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const slackError = searchParams.get("error");
    const { showToast, confirm } = useNotification();

    const [search, setSearch] = useState("");
    const [activeTab, setActiveTab] = useState<"overview" | "settings">("overview");

    // Notification state
    const [optedIn, setOptedIn] = useState(userOptedIn);
    const [togglingOptIn, setTogglingOptIn] = useState(false);
    const [slackUrl, setSlackUrl] = useState(initialSlackWebhookUrl);
    const [saving, setSaving] = useState(false);

    const slackEnabled = slackUrl.trim().length > 0;

    const handleToggleOptIn = async () => {
        const newValue = !optedIn;
        setTogglingOptIn(true);
        try {
            const res = await fetch("/api/user/notification-preferences", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ clientId, enabled: newValue })
            });
            if (!res.ok) throw new Error("Failed");
            setOptedIn(newValue);
            showToast("success", newValue ? "Je ontvangt nu meldingen voor dit project" : "Meldingen uitgeschakeld voor dit project");
        } catch {
            showToast("error", "Kon voorkeur niet opslaan.");
        } finally {
            setTogglingOptIn(false);
        }
    };

    const handleSaveSlack = async () => {
        setSaving(true);
        try {
            const res = await fetch(`/api/projects/${clientId}/notifications`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ slackWebhookUrl: slackUrl }),
            });
            if (!res.ok) throw new Error("Failed to save settings");
            router.refresh();
            showToast("success", "Slack instellingen opgeslagen!");
        } catch (error) {
            console.error(error);
            showToast("error", "Er ging iets mis met opslaan.");
        } finally {
            setSaving(false);
        }
    };

    // Filter incidents
    const filtered = incidents.filter(inc => {
        const q = search.toLowerCase();
        return (
            inc.title.toLowerCase().includes(q) ||
            inc.cause.toLowerCase().includes(q) ||
            inc.status.toLowerCase().includes(q)
        );
    });

    const ongoingCount = incidents.filter(i => i.status === "ONGOING").length;

    return (
        <div style={{ padding: "32px", maxWidth: "1100px", margin: "0 auto" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "28px" }}>
                <div>
                    <h1 style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--color-text-primary)", margin: 0, marginBottom: "4px" }}>
                        Incidents
                    </h1>
                    <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", margin: 0 }}>
                        {clientName}
                    </p>
                </div>
                {ongoingCount > 0 && (
                    <div style={{
                        display: "flex", alignItems: "center", gap: "8px",
                        padding: "6px 14px", borderRadius: "99px",
                        background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)"
                    }}>
                        <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#ef4444", animation: "pulse 2s infinite" }} />
                        <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#ef4444" }}>{ongoingCount} actief</span>
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div style={{
                display: "flex", gap: "24px", marginBottom: "24px",
                borderBottom: "1px solid var(--color-border)", paddingBottom: "1px"
            }}>
                <button
                    onClick={() => setActiveTab("overview")}
                    style={{
                        background: "none", border: "none", outline: "none", cursor: "pointer",
                        padding: "0 4px 12px 4px", fontSize: "0.9rem", fontWeight: 600,
                        color: activeTab === "overview" ? "var(--color-brand)" : "var(--color-text-muted)",
                        borderBottom: activeTab === "overview" ? "2px solid var(--color-brand)" : "2px solid transparent",
                        transition: "all 0.15s", display: "flex", alignItems: "center", gap: "8px"
                    }}
                >
                    <ShieldAlert size={16} /> Overzicht
                </button>
                <button
                    onClick={() => setActiveTab("settings")}
                    style={{
                        background: "none", border: "none", outline: "none", cursor: "pointer",
                        padding: "0 4px 12px 4px", fontSize: "0.9rem", fontWeight: 600,
                        color: activeTab === "settings" ? "var(--color-brand)" : "var(--color-text-muted)",
                        borderBottom: activeTab === "settings" ? "2px solid var(--color-brand)" : "2px solid transparent",
                        transition: "all 0.15s", display: "flex", alignItems: "center", gap: "8px"
                    }}
                >
                    <BellRing size={16} /> Meldingen
                </button>
            </div>

            {activeTab === "overview" ? (
                <>
                    {/* Search */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", marginBottom: "16px" }}>
                        <div style={{
                            display: "flex", alignItems: "center", gap: "8px", padding: "8px 14px",
                            borderRadius: "8px", border: "1px solid var(--color-border)",
                            background: "var(--color-surface-elevated)", width: "280px"
                        }}>
                            <Search size={14} color="var(--color-text-muted)" />
                            <input
                                type="text"
                                placeholder="Zoeken..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                style={{
                                    border: "none", outline: "none", background: "transparent",
                                    color: "var(--color-text-primary)", fontSize: "0.85rem", width: "100%"
                                }}
                            />
                        </div>
                    </div>

                    {/* Incidents */}
                    {filtered.length === 0 ? (
                        <div style={{
                            background: "var(--color-surface-elevated)", borderRadius: "10px",
                            border: "1px solid var(--color-border)", padding: "48px 32px", textAlign: "center"
                        }}>
                            <ShieldCheck size={40} color="var(--color-text-muted)" style={{ marginBottom: "16px", opacity: 0.5 }} />
                            <div style={{ fontSize: "1rem", color: "var(--color-text-primary)", fontWeight: 600, marginBottom: "8px" }}>
                                Geen incidenten gevonden
                            </div>
                            <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>
                                {search ? "Geen resultaten voor deze zoekterm." : "Er zijn nog geen incidenten voor dit project."}
                            </p>
                        </div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            {filtered.map(inc => {
                                const { icon: StatusIcon, color: statusColor } = getStatusIcon(inc.status);
                                return (
                                    <Link key={inc.id} href={`/dashboard/projects/${clientId}/monitoring/incidents/${inc.id}`} style={{ textDecoration: "none" }}>
                                        <div style={{
                                            display: "flex", alignItems: "center", gap: "16px",
                                            padding: "14px 20px", borderRadius: "8px",
                                            background: "var(--color-surface-elevated)",
                                            border: "1px solid var(--color-border)",
                                            transition: "background 0.15s", cursor: "pointer"
                                        }} className="incident-row">
                                            <StatusIcon size={18} style={{ color: statusColor, flexShrink: 0 }} />
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--color-text-primary)", marginBottom: "2px" }}>
                                                    {inc.title}
                                                </div>
                                                <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                    {inc.cause}
                                                </div>
                                            </div>
                                            <div style={{ display: "flex", alignItems: "center", gap: "16px", flexShrink: 0 }}>
                                                <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", textAlign: "right" }}>
                                                    {timeAgo(inc.startedAt)}
                                                </div>
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
                </>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                    {/* Personal opt-in toggle */}
                    <div style={{
                        background: "var(--color-surface-elevated)",
                        borderRadius: "10px",
                        border: "1px solid var(--color-border)",
                        padding: "32px"
                    }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
                            <BellRing size={24} color="var(--color-brand)" />
                            <div>
                                <h2 style={{ fontSize: "1.2rem", fontWeight: 600, margin: 0, color: "var(--color-text-primary)" }}>
                                    Mijn Meldingen
                                </h2>
                                <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", margin: "4px 0 0 0" }}>
                                    Ontvang e-mailmeldingen bij incidenten voor dit project.
                                </p>
                            </div>
                        </div>

                        <div style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            padding: "20px", background: "rgba(0,0,0,0.1)", borderRadius: "8px",
                            border: `1px solid ${optedIn ? "rgba(16, 185, 129, 0.2)" : "rgba(255,255,255,0.05)"}`
                        }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                                <div style={{
                                    width: "40px", height: "40px", borderRadius: "8px",
                                    background: optedIn ? "rgba(16, 185, 129, 0.1)" : "rgba(99,102,241,0.1)",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    color: optedIn ? "#10b981" : "var(--color-text-muted)",
                                    transition: "all 0.2s"
                                }}>
                                    <Mail size={18} />
                                </div>
                                <div>
                                    <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--color-text-primary)" }}>
                                        E-mail Meldingen
                                    </div>
                                    <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginTop: "2px" }}>
                                        {optedIn
                                            ? "Je ontvangt een e-mail bij elk nieuw incident."
                                            : "Je ontvangt momenteel geen meldingen voor dit project."
                                        }
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={handleToggleOptIn}
                                disabled={togglingOptIn}
                                style={{
                                    display: "flex", alignItems: "center", gap: "8px",
                                    padding: "10px 20px", borderRadius: "8px",
                                    background: optedIn ? "rgba(16, 185, 129, 0.1)" : "var(--color-surface-hover)",
                                    border: `1px solid ${optedIn ? "rgba(16, 185, 129, 0.3)" : "var(--color-border)"}`,
                                    color: optedIn ? "#10b981" : "var(--color-text-muted)",
                                    fontSize: "0.85rem", fontWeight: 600,
                                    cursor: togglingOptIn ? "not-allowed" : "pointer",
                                    opacity: togglingOptIn ? 0.6 : 1,
                                    transition: "all 0.2s"
                                }}
                            >
                                {optedIn ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                                {togglingOptIn ? "..." : optedIn ? "Ingeschakeld" : "Uitgeschakeld"}
                            </button>
                        </div>
                    </div>

                    {/* Slack Settings — admin only */}
                    {isAdmin && (
                        <div style={{
                            background: "var(--color-surface-elevated)",
                            borderRadius: "10px",
                            border: "1px solid var(--color-border)",
                            padding: "32px"
                        }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
                                <MessageSquare size={24} color="var(--color-text-secondary)" />
                                <div>
                                    <h2 style={{ fontSize: "1.2rem", fontWeight: 600, margin: 0, color: "var(--color-text-primary)" }}>
                                        Slack Integratie
                                    </h2>
                                    <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", margin: "4px 0 0 0" }}>
                                        Koppel een Slack Webhook URL om meldingen in een kanaal te ontvangen.
                                    </p>
                                </div>
                            </div>

                            <div style={{ paddingLeft: "56px" }}>
                                {slackEnabled ? (
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                        <div style={{
                                            flex: 1, maxWidth: "400px", padding: "8px 12px", borderRadius: "6px",
                                            background: "rgba(16, 185, 129, 0.05)", border: "1px solid rgba(16, 185, 129, 0.2)",
                                            color: "var(--color-text-primary)", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "8px"
                                        }}>
                                            <ShieldCheck size={16} color="#10b981" />
                                            <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                Verbonden met Slack Webhook
                                            </span>
                                        </div>
                                        <button
                                            onClick={async () => {
                                                const confirmed = await confirm({
                                                    title: "Slack ontkoppelen",
                                                    message: "Weet je zeker dat je Slack wilt ontkoppelen?",
                                                    confirmLabel: "Ja, ontkoppelen",
                                                    type: "danger"
                                                });
                                                if (confirmed) {
                                                    setSlackUrl("");
                                                }
                                            }}
                                            style={{
                                                padding: "8px 12px", borderRadius: "6px", background: "rgba(239, 68, 68, 0.1)",
                                                border: "1px solid rgba(239, 68, 68, 0.2)", color: "#ef4444",
                                                fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", transition: "all 0.15s"
                                            }}
                                            className="hover-opacity"
                                        >
                                            Ontkoppelen
                                        </button>
                                    </div>
                                ) : (
                                    <div>
                                        <button
                                            onClick={() => {
                                                router.push(`/api/auth/slack/link?clientId=${clientId}`);
                                            }}
                                            style={{
                                                display: "inline-flex", alignItems: "center", gap: "8px",
                                                padding: "8px 16px", borderRadius: "6px", background: "var(--color-surface-hover)",
                                                border: "1px solid var(--color-border)", color: "var(--color-text-primary)",
                                                fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", transition: "all 0.15s"
                                            }}
                                            className="hover-bg-int"
                                        >
                                            Slack Koppelen
                                        </button>
                                        {slackError && (
                                            <div style={{ marginTop: "8px", fontSize: "0.75rem", color: "#ef4444", fontWeight: 500 }}>
                                                Kan Slack niet koppelen. Waarschuwing: {slackError.replace(/_/g, " ")}.
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <style jsx>{`
                .incident-row:hover { background: var(--color-surface-hover) !important; }
                .hover-opacity:hover { opacity: 0.8; }
            `}</style>
        </div>
    );
}
