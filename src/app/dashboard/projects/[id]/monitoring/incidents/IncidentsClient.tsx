"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Search, ShieldAlert, Shield, ShieldCheck, Settings, Bell, Mail, MessageSquare, Save, X, ExternalLink } from "lucide-react";
import { useState } from "react";

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

interface User {
    id: string;
    name: string;
    email: string;
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
    allUsers,
    notificationUsers,
    initialSlackWebhookUrl
}: {
    clientId: string;
    clientName: string;
    incidents: Incident[];
    allUsers: User[];
    notificationUsers: User[];
    initialSlackWebhookUrl: string;
}) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const slackError = searchParams.get("error");

    const [search, setSearch] = useState("");
    const [activeTab, setActiveTab] = useState<"overview" | "settings">("overview");

    const [selectedUserIds, setSelectedUserIds] = useState<string[]>(
        notificationUsers.map(u => u.id)
    );
    const [slackUrl, setSlackUrl] = useState(initialSlackWebhookUrl);
    const [saving, setSaving] = useState(false);

    const emailEnabled = selectedUserIds.length > 0;
    const slackEnabled = slackUrl.trim().length > 0;

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
            const res = await fetch(`/api/projects/${clientId}/notifications`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userIds: selectedUserIds,
                    slackWebhookUrl: slackUrl
                }),
            });
            if (!res.ok) throw new Error("Failed to save settings");
            router.refresh();
            alert("Instellingen opgeslagen!");
        } catch (error) {
            console.error(error);
            alert("Er ging iets mis met opslaan.");
        } finally {
            setSaving(false);
        }
    };

    const [testingNotifs, setTestingNotifs] = useState(false);

    const handleTestNotifications = async () => {
        if (!emailEnabled && !slackEnabled) {
            alert("Er zijn geen e-mail of Slack notificaties ingesteld om te testen. Vink een kanaal aan en sla de instellingen eerst op.");
            return;
        }

        setTestingNotifs(true);
        try {
            const res = await fetch(`/api/projects/${clientId}/notifications/test`, {
                method: "POST",
            });
            const data = await res.json();

            if (res.ok) {
                alert(`Testbericht succesvol verstuurd!\n\nEmail: ${data.channels.email ? '✅' : '❌'}\nSlack: ${data.channels.slack ? '✅' : '❌'}`);
            } else {
                throw new Error(data.error || "Failed to trigger test");
            }
        } catch (error: any) {
            console.error(error);
            alert(`Fout bij het versturen van testbericht: ${error.message}`);
        } finally {
            setTestingNotifs(false);
        }
    };

    const filtered = incidents.filter(inc =>
        inc.title.toLowerCase().includes(search.toLowerCase()) ||
        inc.cause.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div style={{ padding: "32px", maxWidth: "1100px", margin: "0 auto" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "28px" }}>
                <div>
                    <h1 style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--color-text-primary)", margin: 0 }}>
                        Incidents
                    </h1>
                    <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem", margin: "4px 0 0 0" }}>{clientName}</p>
                </div>
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
                    <Settings size={16} /> Instellingen
                </button>
            </div>

            {/* Content Context */}
            {activeTab === "overview" ? (
                <>
                    {/* Header Controls */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", marginBottom: "16px" }}>
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
                            <div style={{ fontSize: "0.85rem" }}>Alles draait soepel — er zijn geen recente incidenten.</div>
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

                            {/* Rows */}
                            {filtered.map(inc => {
                                const { icon: SIcon, color: sColor } = getStatusIcon(inc.status);

                                return (
                                    <Link key={inc.id} href={`/dashboard/projects/${clientId}/monitoring/incidents/${inc.id}`} style={{ textDecoration: "none" }}>
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
            ) : (
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
                                Notificaties
                            </h2>
                            <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", margin: "4px 0 0 0" }}>
                                Bepaal hoe en of je op de hoogte wil worden gehouden van incidenten.
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
                                            Selecteer de gebruikers die een mail ontvangen bij een nieuw incident.
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
                                            onClick={() => {
                                                if (window.confirm("Zeker weten dat je Slack wilt ontkoppelen?")) {
                                                    setSlackUrl("");
                                                    // Auto-save happens separately or we can trigger it immediately
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

                        {/* Save Actions */}
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "12px" }}>
                            <button
                                onClick={handleTestNotifications}
                                disabled={testingNotifs}
                                className="glass-card"
                                style={{
                                    display: "inline-flex", alignItems: "center", gap: "8px",
                                    padding: "8px 16px", fontSize: "0.85rem", fontWeight: 600,
                                    background: "transparent", color: "var(--color-text-primary)",
                                    border: "1px solid var(--color-border)", borderRadius: "6px",
                                    cursor: testingNotifs ? "not-allowed" : "pointer",
                                    opacity: testingNotifs ? 0.7 : 1
                                }}
                            >
                                <Bell size={16} />
                                {testingNotifs ? "Testen..." : "Test Notificaties"}
                            </button>
                            <button
                                onClick={handleSaveSettings}
                                disabled={saving}
                                className="glass-card"
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
            )}

            <style jsx>{`
                .incident-row:hover { background: var(--color-surface-hover) !important; }
                .hover-opacity:hover { opacity: 0.8; }
            `}</style>
        </div>
    );
}
