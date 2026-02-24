"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Users, MoreHorizontal, UserPlus, Trash2, Mail, Clock, X, Send } from "lucide-react";

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
}

interface PendingInvite {
    id: string;
    email: string;
    createdAt: Date;
}

export default function ProjectAccessManager({
    clientId,
    allUsers,
    linkedUserIds,
    pendingInvites
}: {
    clientId: string;
    allUsers: User[];
    linkedUserIds: string[];
    pendingInvites: PendingInvite[];
}) {
    const router = useRouter();
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>(linkedUserIds);
    const [loading, setLoading] = useState(false);

    // UI states
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (!(e.target as Element).closest('.action-menu-container')) {
                setOpenMenuId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const updateAccess = async (newUserIds: string[]) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/projects/${clientId}/access`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userIds: newUserIds }),
            });

            if (!res.ok) throw new Error("Opslaan mislukt");

            setSelectedUserIds(newUserIds);
            router.refresh();
        } catch (error) {
            console.error(error);
            alert("Er is iets misgegaan bij het opslaan van de toegang.");
        } finally {
            setLoading(false);
            setOpenMenuId(null);
        }
    };

    const handleRemove = (userId: string) => {
        const updated = selectedUserIds.filter(id => id !== userId);
        updateAccess(updated);
    };

    const handleSendInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteEmail) return;

        setLoading(true);
        try {
            const res = await fetch(`/api/projects/${clientId}/invites`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: inviteEmail }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Uitnodigen mislukt");
            }

            setInviteEmail("");
            setShowInviteModal(false);
            router.refresh();
        } catch (error: any) {
            console.error(error);
            alert(error.message || "Er is een fout opgetreden bij het uitnodigen.");
        } finally {
            setLoading(false);
        }
    };

    const handleResendInvite = async (inviteId: string) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/projects/${clientId}/invites/${inviteId}/resend`, {
                method: "POST"
            });
            if (!res.ok) throw new Error("Opnieuw versturen mislukt");
            alert("Uitnodiging is succesvol opnieuw verstuurd!");
            router.refresh();
        } catch (error) {
            console.error(error);
            alert("Er is iets misgegaan bij het opnieuw versturen van de uitnodiging.");
        } finally {
            setLoading(false);
            setOpenMenuId(null);
        }
    };

    const handleRevokeInvite = async (inviteId: string) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/projects/${clientId}/invites`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ inviteId }),
            });

            if (!res.ok) throw new Error("Intrekken mislukt");

            router.refresh();
        } catch (error) {
            console.error(error);
            alert("Er is iets misgegaan bij het intrekken van de uitnodiging.");
        } finally {
            setLoading(false);
            setOpenMenuId(null);
        }
    };

    const linkedUsers = allUsers.filter(u => selectedUserIds.includes(u.id) && u.role !== "ADMIN");

    return (
        <div style={{
            padding: "32px",
            background: "var(--color-surface-elevated)",
            border: "1px solid var(--color-border)",
            borderRadius: "12px",
            marginTop: "32px"
        }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{
                        width: "48px", height: "48px", borderRadius: "12px",
                        background: "rgba(99,102,241,0.1)", display: "flex",
                        alignItems: "center", justifyContent: "center", color: "var(--color-brand)"
                    }}>
                        <Users size={24} />
                    </div>
                    <div>
                        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--color-text-primary)", margin: 0 }}>
                            Toegang
                        </h2>
                        <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", margin: "4px 0 0 0" }}>
                            Teamleden met toegang tot dit account.
                        </p>
                    </div>
                </div>

                <button
                    onClick={() => setShowInviteModal(true)}
                    style={{
                        display: "flex", alignItems: "center", gap: "8px",
                        padding: "8px 16px", background: "var(--color-brand)", color: "white",
                        border: "none", borderRadius: "8px", fontWeight: 600, cursor: "pointer"
                    }}
                >
                    <UserPlus size={16} />
                    Uitnodigen
                </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {linkedUsers.length === 0 && pendingInvites.length === 0 ? (
                    <div style={{ padding: "24px", textAlign: "center", color: "var(--color-text-muted)", border: "1px dashed var(--color-border)", borderRadius: "8px" }}>
                        Geen specifieke gebruikers met toegang. (Admins hebben wel altijd toegang).
                    </div>
                ) : (
                    <>
                        {/* Active Users */}
                        {linkedUsers.map(user => (
                            <div
                                key={user.id}
                                style={{
                                    display: "flex", alignItems: "center", justifyContent: "space-between",
                                    padding: "12px 16px", borderRadius: "8px",
                                    border: "1px solid var(--color-border)",
                                    background: "var(--color-surface)"
                                }}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                    <div style={{ width: "32px", height: "32px", borderRadius: "16px", background: "var(--color-surface-elevated)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", fontWeight: 600, color: "var(--color-text-primary)" }}>
                                        {user.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div style={{ display: "flex", flexDirection: "column" }}>
                                        <span style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--color-text-primary)" }}>
                                            {user.name}
                                        </span>
                                        <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
                                            {user.email} &mdash; {user.role}
                                        </span>
                                    </div>
                                </div>

                                <div className="action-menu-container" style={{ position: "relative" }}>
                                    <button
                                        onClick={() => setOpenMenuId(openMenuId === user.id ? null : user.id)}
                                        style={{
                                            background: "transparent", border: "none", color: "var(--color-text-muted)",
                                            cursor: "pointer", padding: "4px", borderRadius: "4px"
                                        }}
                                        onMouseOver={(e) => e.currentTarget.style.color = "var(--color-text-primary)"}
                                        onMouseOut={(e) => e.currentTarget.style.color = "var(--color-text-muted)"}
                                    >
                                        <MoreHorizontal size={20} />
                                    </button>

                                    {openMenuId === user.id && (
                                        <div style={{
                                            position: "absolute", top: "100%", right: 0, marginTop: "4px",
                                            background: "var(--color-surface)", border: "1px solid var(--color-border)",
                                            borderRadius: "6px", minWidth: "160px", zIndex: 10, overflow: "hidden",
                                            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
                                        }}>
                                            <button
                                                onClick={() => handleRemove(user.id)}
                                                style={{
                                                    display: "flex", alignItems: "center", gap: "8px", width: "100%",
                                                    padding: "10px 12px", background: "transparent", border: "none",
                                                    color: "var(--color-danger, #ef4444)", cursor: "pointer", fontSize: "0.85rem", fontWeight: 500, textAlign: "left"
                                                }}
                                                onMouseOver={(e) => e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)"}
                                                onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
                                            >
                                                <Trash2 size={16} />
                                                Verwijderen
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* Pending Invites */}
                        {pendingInvites.map(invite => (
                            <div
                                key={invite.id}
                                style={{
                                    display: "flex", alignItems: "center", justifyContent: "space-between",
                                    padding: "12px 16px", borderRadius: "8px",
                                    border: "1px dashed var(--color-border)",
                                    background: "rgba(255, 255, 255, 0.02)"
                                }}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: "12px", opacity: 0.7 }}>
                                    <div style={{ width: "32px", height: "32px", borderRadius: "16px", background: "var(--color-surface-elevated)", border: "1px dashed var(--color-border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-muted)" }}>
                                        <Mail size={14} />
                                    </div>
                                    <div style={{ display: "flex", flexDirection: "column" }}>
                                        <span style={{ fontSize: "0.95rem", fontWeight: 500, color: "var(--color-text-primary)", display: "flex", alignItems: "center", gap: "6px" }}>
                                            {invite.email}
                                            <span style={{
                                                fontSize: "0.65rem", padding: "2px 6px", borderRadius: "10px",
                                                background: "rgba(245, 158, 11, 0.1)", color: "#f59e0b",
                                                display: "inline-flex", alignItems: "center", gap: "4px", fontWeight: 600
                                            }}>
                                                <Clock size={10} />
                                                PENDING
                                            </span>
                                        </span>
                                        <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
                                            Uitgenodigd op {new Date(invite.createdAt).toLocaleDateString("nl-NL")}
                                        </span>
                                    </div>
                                </div>

                                <div className="action-menu-container" style={{ position: "relative" }}>
                                    <button
                                        onClick={() => setOpenMenuId(openMenuId === invite.id ? null : invite.id)}
                                        style={{
                                            background: "transparent", border: "none", color: "var(--color-text-muted)",
                                            cursor: "pointer", padding: "4px", borderRadius: "4px"
                                        }}
                                        onMouseOver={(e) => e.currentTarget.style.color = "var(--color-text-primary)"}
                                        onMouseOut={(e) => e.currentTarget.style.color = "var(--color-text-muted)"}
                                    >
                                        <MoreHorizontal size={20} />
                                    </button>

                                    {openMenuId === invite.id && (
                                        <div style={{
                                            position: "absolute", top: "100%", right: 0, marginTop: "4px",
                                            background: "var(--color-surface)", border: "1px solid var(--color-border)",
                                            borderRadius: "6px", minWidth: "170px", zIndex: 10, overflow: "hidden",
                                            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
                                        }}>
                                            <button
                                                onClick={() => handleResendInvite(invite.id)}
                                                style={{
                                                    display: "flex", alignItems: "center", gap: "8px", width: "100%",
                                                    padding: "10px 12px", background: "transparent", border: "none",
                                                    color: "var(--color-text-primary)", cursor: "pointer", fontSize: "0.85rem", fontWeight: 500, textAlign: "left"
                                                }}
                                                onMouseOver={(e) => e.currentTarget.style.background = "var(--color-surface-hover)"}
                                                onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
                                            >
                                                <Send size={16} />
                                                Opnieuw versturen
                                            </button>
                                            <div style={{ height: "1px", background: "var(--color-border)", margin: "2px 0" }} />
                                            <button
                                                onClick={() => handleRevokeInvite(invite.id)}
                                                style={{
                                                    display: "flex", alignItems: "center", gap: "8px", width: "100%",
                                                    padding: "10px 12px", background: "transparent", border: "none",
                                                    color: "var(--color-danger, #ef4444)", cursor: "pointer", fontSize: "0.85rem", fontWeight: 500, textAlign: "left"
                                                }}
                                                onMouseOver={(e) => e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)"}
                                                onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
                                            >
                                                <Trash2 size={16} />
                                                Intrekken
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </>
                )}
            </div>

            {loading && (
                <div style={{ marginTop: "16px", fontSize: "0.85rem", color: "var(--color-brand)", textAlign: "center" }}>
                    Bezig met opslaan...
                </div>
            )}

            {/* Invite Modal */}
            {showInviteModal && (
                <div style={{
                    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                    background: "rgba(0, 0, 0, 0.5)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    zIndex: 50, backdropFilter: "blur(4px)"
                }}>
                    <div style={{
                        background: "var(--color-surface)",
                        border: "1px solid var(--color-border)",
                        borderRadius: "12px",
                        width: "100%", maxWidth: "420px",
                        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
                    }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid var(--color-border)" }}>
                            <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600, color: "var(--color-text-primary)" }}>Teamlid Uitnodigen</h3>
                            <button
                                onClick={() => setShowInviteModal(false)}
                                style={{ background: "transparent", border: "none", color: "var(--color-text-muted)", cursor: "pointer" }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSendInvite} style={{ padding: "24px" }}>
                            <div style={{ marginBottom: "20px" }}>
                                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 500, color: "var(--color-text-primary)", marginBottom: "8px" }}>
                                    E-mailadres
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    placeholder="naam@bedrijf.nl"
                                    style={{
                                        width: "100%", padding: "10px 12px", borderRadius: "8px",
                                        border: "1px solid var(--color-border)", background: "var(--color-background)",
                                        color: "var(--color-text-primary)", fontSize: "0.95rem",
                                        outline: "none", boxSizing: "border-box"
                                    }}
                                />
                            </div>

                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                                <button
                                    type="button"
                                    onClick={() => setShowInviteModal(false)}
                                    style={{
                                        padding: "8px 16px", borderRadius: "8px", border: "1px solid var(--color-border)",
                                        background: "transparent", color: "var(--color-text-primary)",
                                        fontWeight: 500, cursor: "pointer"
                                    }}
                                >
                                    Annuleren
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    style={{
                                        padding: "8px 16px", borderRadius: "8px", border: "none",
                                        background: "var(--color-brand)", color: "white",
                                        fontWeight: 500, cursor: loading ? "not-allowed" : "pointer",
                                        opacity: loading ? 0.7 : 1
                                    }}
                                >
                                    {loading ? "Bezig..." : "Uitnodiging Versturen"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
