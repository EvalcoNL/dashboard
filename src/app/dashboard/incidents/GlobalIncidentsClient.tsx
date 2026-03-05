"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Search, ShieldAlert, Shield, ShieldCheck, Settings, Bell, Mail, MessageSquare, Save, Globe, ToggleLeft, ToggleRight, BellRing } from "lucide-react";
import { useState } from "react";
import { useNotification } from "@/components/NotificationProvider";

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

interface User {
    id: string;
    name: string;
    email: string;
}

interface ClientInfo {
    id: string;
    name: string;
    notificationMode: string;
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

function getModeLabel(mode: string) {
    switch (mode) {
        case "global": return { label: "Globaal", color: "#6366f1", bg: "rgba(99,102,241,0.1)" };
        case "custom": return { label: "Eigen", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" };
        case "disabled": return { label: "Uit", color: "#9ca3af", bg: "rgba(156,163,175,0.1)" };
        default: return { label: mode, color: "#9ca3af", bg: "rgba(156,163,175,0.1)" };
    }
}

export default function GlobalIncidentsClient({
    incidents,
    allUsers,
    globalNotificationUserIds,
    globalSlackWebhookUrl,
    clients,
    isAdmin = false,
    userPreferences = {}
}: {
    incidents: Incident[];
    allUsers: User[];
    globalNotificationUserIds: string[];
    globalSlackWebhookUrl: string;
    clients: ClientInfo[];
    isAdmin?: boolean;
    userPreferences?: Record<string, boolean>;
}) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const slackError = searchParams.get("error");
    const initialTab = searchParams.get("tab");
    const { showToast, confirm } = useNotification();
    const [search, setSearch] = useState("");
    const [activeTab, setActiveTab] = useState<"overview" | "settings" | "my-notifications">(
        initialTab === "settings" ? "settings" : "overview"
    );
    const [prefs, setPrefs] = useState<Record<string, boolean>>(userPreferences);
    const [togglingClient, setTogglingClient] = useState<string | null>(null);

    // Settings state
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>(globalNotificationUserIds);
    const [slackUrl, setSlackUrl] = useState(globalSlackWebhookUrl);
    const [saving, setSaving] = useState(false);

    const emailEnabled = selectedUserIds.length > 0;
    const slackEnabled = slackUrl.trim().length > 0;

    const handleTogglePreference = async (clientId: string) => {
        const currentlyEnabled = prefs[clientId] || false;
        const newEnabled = !currentlyEnabled;
        setTogglingClient(clientId);
        try {
            const res = await fetch("/api/user/notification-preferences", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ clientId, enabled: newEnabled })
            });
            if (!res.ok) throw new Error("Failed");
            setPrefs({ ...prefs, [clientId]: newEnabled });
            showToast("success", newEnabled ? "Meldingen ingeschakeld" : "Meldingen uitgeschakeld");
        } catch {
            showToast("error", "Kon voorkeur niet opslaan.");
        } finally {
            setTogglingClient(null);
        }
    };

    const handleUserToggle = (userId: string) => {
        if (selectedUserIds.includes(userId)) {
            setSelectedUserIds(selectedUserIds.filter(id => id !== userId));
        } else {
            setSelectedUserIds([...selectedUserIds, userId]);
        }
    };

    const handleSaveSettings = async () => {
        setSaving(true);
        try {
            const res = await fetch("/api/settings/notifications", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userIds: selectedUserIds,
                    slackWebhookUrl: slackUrl
                }),
            });
            if (!res.ok) throw new Error("Failed to save settings");
            router.refresh();
            showToast("success", "Globale instellingen opgeslagen!");
        } catch (error) {
            console.error(error);
            showToast("error", "Er ging iets mis met opslaan.");
        } finally {
            setSaving(false);
        }
    };

    const filtered = incidents.filter(inc =>
        inc.title.toLowerCase().includes(search.toLowerCase()) ||
        inc.cause.toLowerCase().includes(search.toLowerCase()) ||
        inc.client?.name.toLowerCase().includes(search.toLowerCase())
    );

    const globalCount = clients.filter(c => c.notificationMode === "global").length;
    const customCount = clients.filter(c => c.notificationMode === "custom").length;
    const disabledCount = clients.filter(c => c.notificationMode === "disabled").length;

    return (
        <div style={{ padding: "32px", maxWidth: "1100px", margin: "0 auto" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "28px" }}>
                <h1 style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--color-text-primary)", margin: 0 }}>
                    Incidents
                </h1>
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
                {isAdmin && (
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
                        <Settings size={16} /> Instellingen
                    </button>
                )}
                <button
                    onClick={() => setActiveTab("my-notifications")}
                    style={{
                        background: "none", border: "none", outline: "none", cursor: "pointer",
                        padding: "0 4px 12px 4px", fontSize: "0.9rem", fontWeight: 600,
                        color: activeTab === "my-notifications" ? "var(--color-brand)" : "var(--color-text-muted)",
                        borderBottom: activeTab === "my-notifications" ? "2px solid var(--color-brand)" : "2px solid transparent",
                        transition: "all 0.15s", display: "flex", alignItems: "center", gap: "8px"
                    }}
                >
                    <BellRing size={16} /> Mijn Meldingen
                </button>
            </div>

            {activeTab === "overview" ? (
                <>
                    {/* Search */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", marginBottom: "16px" }}>
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

                            {filtered.map(inc => {
                                const { icon: SIcon, color: sColor } = getStatusIcon(inc.status);

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

                                            <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
                                                {timeAgo(inc.startedAt)}
                                            </div>

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
                </>
            ) : activeTab === "settings" ? (
                /* ── Settings Tab ── */
                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                    {/* Global Notification Settings */}
                    <div style={{
                        background: "var(--color-surface-elevated)",
                        borderRadius: "10px",
                        border: "1px solid var(--color-border)",
                        padding: "32px"
                    }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
                            <Bell size={24} color="var(--color-brand)" />
                            <div>
                                <h2 style={{ fontSize: "1.2rem", fontWeight: 600, margin: 0, color: "var(--color-text-primary)" }}>
                                    Globale Notificaties
                                </h2>
                                <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", margin: "4px 0 0 0" }}>
                                    Standaard notificatie-instellingen die door alle projecten worden geërfd (tenzij individueel overschreven).
                                </p>
                            </div>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                            {/* Email Settings */}
                            <div style={{
                                display: "flex", flexDirection: "column",
                                padding: "20px", background: "rgba(0,0,0,0.1)", borderRadius: "8px",
                                border: "1px solid rgba(255,255,255,0.05)"
                            }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                                    <div style={{ display: "flex", gap: "16px" }}>
                                        <div style={{ width: "40px", height: "40px", borderRadius: "8px", background: "rgba(99,102,241,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-brand)" }}>
                                            <Mail size={18} />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--color-text-primary)" }}>E-mail Notificaties</div>
                                            <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginTop: "4px" }}>
                                                Selecteer de standaard ontvangers voor alle projecten.
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ fontSize: "0.8rem", color: emailEnabled ? "var(--color-brand)" : "var(--color-text-muted)", fontWeight: 600 }}>
                                        {emailEnabled ? "Ingeschakeld" : "Uitgeschakeld"}
                                    </div>
                                </div>

                                <div style={{
                                    display: "grid", gap: "8px", paddingLeft: "56px",
                                    borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "16px"
                                }}>
                                    {allUsers.map(user => (
                                        <label key={user.id} style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                                            <input
                                                type="checkbox"
                                                checked={selectedUserIds.includes(user.id)}
                                                onChange={() => handleUserToggle(user.id)}
                                                style={{ cursor: "pointer", width: "16px", height: "16px", accentColor: "var(--color-brand)" }}
                                            />
                                            <div>
                                                <div style={{ fontSize: "0.85rem", color: "var(--color-text-primary)", fontWeight: 500 }}>{user.name}</div>
                                                <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>{user.email}</div>
                                            </div>
                                        </label>
                                    ))}
                                    {allUsers.length === 0 && (
                                        <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>Geen systeemgebruikers gevonden.</div>
                                    )}
                                </div>
                            </div>

                            {/* Slack Settings */}
                            <div style={{
                                display: "flex", flexDirection: "column",
                                padding: "20px", background: "rgba(0,0,0,0.1)", borderRadius: "8px",
                                border: "1px solid rgba(255,255,255,0.05)"
                            }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                                    <div style={{ display: "flex", gap: "16px" }}>
                                        <div style={{ width: "40px", height: "40px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-secondary)" }}>
                                            <MessageSquare size={18} />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--color-text-primary)" }}>Slack Waarschuwingen</div>
                                            <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginTop: "4px" }}>
                                                Koppel een Slack Webhook URL om updates in een kanaal te ontvangen.
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ fontSize: "0.8rem", color: slackEnabled ? "var(--color-brand)" : "var(--color-text-muted)", fontWeight: 600 }}>
                                        {slackEnabled ? "Geconfigureerd" : "Niet geconfigureerd"}
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
                                                        message: "Weet je zeker dat je de globale Slack koppeling wilt verwijderen? Projecten met globale instellingen zullen geen Slack meldingen meer ontvangen.",
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
                                                    router.push("/api/auth/slack/link?scope=global");
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

                            {/* Save Button */}
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "4px" }}>
                                <button
                                    onClick={handleSaveSettings}
                                    disabled={saving}
                                    style={{
                                        display: "inline-flex", alignItems: "center", gap: "8px",
                                        padding: "8px 16px", fontSize: "0.85rem", fontWeight: 600,
                                        background: "var(--color-brand)", color: "#fff",
                                        border: "none", borderRadius: "6px",
                                        cursor: saving ? "not-allowed" : "pointer",
                                        opacity: saving ? 0.7 : 1
                                    }}
                                >
                                    <Save size={16} />
                                    {saving ? "Opslaan..." : "Instellingen Opslaan"}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Per-Project Overview */}
                    <div style={{
                        background: "var(--color-surface-elevated)",
                        borderRadius: "10px",
                        border: "1px solid var(--color-border)",
                        padding: "32px"
                    }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                            <Globe size={20} color="var(--color-brand)" />
                            <div>
                                <h3 style={{ fontSize: "1rem", fontWeight: 600, margin: 0, color: "var(--color-text-primary)" }}>
                                    Project Overzicht
                                </h3>
                                <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", margin: "2px 0 0 0" }}>
                                    Elk project kan de globale instellingen erven of eigen instellingen gebruiken.
                                </p>
                            </div>
                        </div>

                        {/* Summary badges */}
                        <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
                            <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", display: "flex", alignItems: "center", gap: "6px" }}>
                                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#6366f1" }} />
                                {globalCount} globaal
                            </div>
                            <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", display: "flex", alignItems: "center", gap: "6px" }}>
                                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#f59e0b" }} />
                                {customCount} eigen
                            </div>
                            <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", display: "flex", alignItems: "center", gap: "6px" }}>
                                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#9ca3af" }} />
                                {disabledCount} uit
                            </div>
                        </div>

                        {/* Client list */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            {clients.map(client => {
                                const mode = getModeLabel(client.notificationMode);
                                return (
                                    <Link key={client.id} href={`/dashboard/projects/${client.id}/monitoring/incidents?tab=settings`} style={{ textDecoration: "none" }}>
                                        <div style={{
                                            display: "flex", alignItems: "center", justifyContent: "space-between",
                                            padding: "12px 16px", borderRadius: "8px",
                                            background: "rgba(0,0,0,0.1)", transition: "background 0.15s",
                                            cursor: "pointer"
                                        }} className="client-row">
                                            <div style={{ fontSize: "0.9rem", fontWeight: 500, color: "var(--color-text-primary)" }}>
                                                {client.name}
                                            </div>
                                            <span style={{
                                                fontSize: "0.7rem", fontWeight: 600,
                                                padding: "3px 10px", borderRadius: "99px",
                                                background: mode.bg, color: mode.color,
                                                textTransform: "uppercase", letterSpacing: "0.03em"
                                            }}>
                                                {mode.label}
                                            </span>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </div>
            ) : activeTab === "my-notifications" ? (
                /* User opt-in notifications tab */
                <div style={{
                    background: "var(--color-surface-elevated)",
                    borderRadius: "10px",
                    border: "1px solid var(--color-border)",
                    padding: "32px"
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                        <div style={{
                            width: "40px", height: "40px", borderRadius: "10px",
                            background: "rgba(99, 102, 241, 0.1)",
                            display: "flex", alignItems: "center", justifyContent: "center"
                        }}>
                            <BellRing size={20} color="var(--color-brand)" />
                        </div>
                        <div>
                            <h3 style={{ fontSize: "1rem", fontWeight: 600, margin: 0, color: "var(--color-text-primary)" }}>
                                Mijn Meldingen
                            </h3>
                            <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", margin: "2px 0 0 0" }}>
                                Kies voor welke projecten je e-mailmeldingen wilt ontvangen bij incidenten.
                            </p>
                        </div>
                    </div>

                    <div style={{ display: "flex", gap: "16px", marginBottom: "20px", marginTop: "16px" }}>
                        <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981" }} />
                            {Object.values(prefs).filter(Boolean).length} actief
                        </div>
                        <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#9ca3af" }} />
                            {clients.length - Object.values(prefs).filter(Boolean).length} inactief
                        </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        {clients.map(client => {
                            const isEnabled = prefs[client.id] || false;
                            const isToggling = togglingClient === client.id;
                            return (
                                <div key={client.id} style={{
                                    display: "flex", alignItems: "center", justifyContent: "space-between",
                                    padding: "14px 16px", borderRadius: "8px",
                                    background: "rgba(0,0,0,0.1)", transition: "background 0.15s"
                                }} className="client-row">
                                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                        <div style={{
                                            width: "8px", height: "8px", borderRadius: "50%",
                                            background: isEnabled ? "#10b981" : "#9ca3af",
                                            transition: "background 0.2s"
                                        }} />
                                        <span style={{ fontSize: "0.9rem", fontWeight: 500, color: "var(--color-text-primary)" }}>
                                            {client.name}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => handleTogglePreference(client.id)}
                                        disabled={isToggling}
                                        style={{
                                            display: "flex", alignItems: "center", gap: "6px",
                                            padding: "6px 14px", borderRadius: "6px",
                                            background: isEnabled ? "rgba(16, 185, 129, 0.1)" : "var(--color-surface-hover)",
                                            border: `1px solid ${isEnabled ? "rgba(16, 185, 129, 0.3)" : "var(--color-border)"}`,
                                            color: isEnabled ? "#10b981" : "var(--color-text-muted)",
                                            fontSize: "0.8rem", fontWeight: 600,
                                            cursor: isToggling ? "not-allowed" : "pointer",
                                            opacity: isToggling ? 0.6 : 1,
                                            transition: "all 0.2s"
                                        }}
                                    >
                                        {isEnabled ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                                        {isToggling ? "..." : isEnabled ? "Aan" : "Uit"}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : null}

            <style jsx>{`
                .incident-row:hover { background: var(--color-surface-hover) !important; }
                .client-row:hover { background: rgba(255,255,255,0.03) !important; }
            `}</style>
        </div>
    );
}
