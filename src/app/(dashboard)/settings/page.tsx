export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import ProfileSettings from "@/components/settings/ProfileSettings";
import SecuritySettings from "@/components/settings/SecuritySettings";
import { Shield, Database } from "lucide-react";

export default async function SettingsPage() {
    const session = await auth();
    if (!session || !session.user) redirect("/login");

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { twoFactorEnabled: true }
    });

    return (
        <div className="animate-fade-in" style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px" }}>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "4px" }}>Instellingen</h1>
            <p style={{ color: "var(--color-text-secondary)", fontSize: "0.9rem", marginBottom: "32px" }}>
                Beheer je account en systeeminstellingen
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: "24px", alignItems: "start" }}>
                <div style={{ display: "grid", gap: "24px" }}>
                    {/* Profile */}
                    <ProfileSettings initialName={session.user.name || ""} initialEmail={session.user.email || ""} />

                    {/* Security (2FA) */}
                    <SecuritySettings is2FAEnabled={user?.twoFactorEnabled || false} />
                </div>

                <div style={{ display: "grid", gap: "24px" }}>
                    {/* System */}
                    <div className="glass-card" style={{ padding: "24px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                            <div
                                style={{
                                    width: "40px",
                                    height: "40px",
                                    borderRadius: "10px",
                                    background: "rgba(139, 92, 246, 0.1)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "#8b5cf6",
                                }}
                            >
                                <Database size={20} />
                            </div>
                            <div>
                                <h3 style={{ fontSize: "0.95rem", fontWeight: 600 }}>Systeem</h3>
                                <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>Platform informatie</p>
                            </div>
                        </div>
                        <div style={{ display: "grid", gap: "12px" }}>
                            <div>
                                <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Platform</span>
                                <p style={{ fontSize: "0.9rem" }}>Evalco Dashboard</p>
                            </div>
                            <div>
                                <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Versie</span>
                                <p style={{ fontSize: "0.9rem" }}>v2.0.0</p>
                            </div>
                            <div>
                                <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Omgeving</span>
                                <p style={{ fontSize: "0.9rem" }}>
                                    <span style={{
                                        padding: "2px 8px",
                                        borderRadius: "6px",
                                        background: process.env.NODE_ENV === "production" ? "rgba(16, 185, 129, 0.1)" : "rgba(245, 158, 11, 0.1)",
                                        color: process.env.NODE_ENV === "production" ? "#10b981" : "#f59e0b",
                                        fontSize: "0.8rem",
                                        fontWeight: 600
                                    }}>
                                        {process.env.NODE_ENV === "production" ? "Productie" : "Development"}
                                    </span>
                                </p>
                            </div>
                            <div>
                                <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Jouw rol</span>
                                <p style={{ fontSize: "0.9rem" }}>
                                    <span style={{
                                        padding: "2px 8px",
                                        borderRadius: "6px",
                                        background: (session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN") ? "rgba(99, 102, 241, 0.1)" : "rgba(16, 185, 129, 0.1)",
                                        color: (session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN") ? "var(--color-brand)" : "#10b981",
                                        fontSize: "0.8rem",
                                        fontWeight: 600
                                    }}>
                                        {session.user.role === "SUPER_ADMIN" ? "Super Admin" : session.user.role === "ADMIN" ? "Administrator" : session.user.role === "STRATEGIST" ? "Strateeg" : session.user.role === "MEMBER" ? "Lid" : session.user.role}
                                    </span>
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Roles info (admin only) */}
                    {(session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN") && (
                        <div className="glass-card" style={{ padding: "24px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                                <div
                                    style={{
                                        width: "40px",
                                        height: "40px",
                                        borderRadius: "10px",
                                        background: "rgba(16, 185, 129, 0.1)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        color: "#10b981",
                                    }}
                                >
                                    <Shield size={20} />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: "0.95rem", fontWeight: 600 }}>Rollen & rechten</h3>
                                    <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>Overzicht systeemrollen</p>
                                </div>
                            </div>
                            <div style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)", display: "grid", gap: "16px" }}>
                                <div style={{ padding: "12px", borderRadius: "8px", background: "var(--color-surface)" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                                        <span style={{
                                            padding: "2px 8px", borderRadius: "6px",
                                            background: "rgba(99, 102, 241, 0.1)", color: "var(--color-brand)",
                                            fontSize: "0.8rem", fontWeight: 700
                                        }}>Admin</span>
                                    </div>
                                    <p style={{ margin: 0, lineHeight: 1.5 }}>
                                        Volledige toegang tot alle projecten, gebruikersbeheer, databronnen en systeeminstellingen. Kan gebruikers uitnodigen en rollen toewijzen.
                                    </p>
                                </div>
                                <div style={{ padding: "12px", borderRadius: "8px", background: "var(--color-surface)" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                                        <span style={{
                                            padding: "2px 8px", borderRadius: "6px",
                                            background: "rgba(16, 185, 129, 0.1)", color: "#10b981",
                                            fontSize: "0.8rem", fontWeight: 700
                                        }}>Strateeg</span>
                                    </div>
                                    <p style={{ margin: 0, lineHeight: 1.5 }}>
                                        Toegang tot toegewezen projecten. Kan rapporten bekijken en beoordelen, dashboards aanmaken, data verkennen en monitoring inzien.
                                    </p>
                                </div>
                                <div style={{ padding: "12px", borderRadius: "8px", background: "var(--color-surface)" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                                        <span style={{
                                            padding: "2px 8px", borderRadius: "6px",
                                            background: "rgba(245, 158, 11, 0.1)", color: "#f59e0b",
                                            fontSize: "0.8rem", fontWeight: 700
                                        }}>Viewer</span>
                                    </div>
                                    <p style={{ margin: 0, lineHeight: 1.5 }}>
                                        Alleen-lezen toegang tot toegewezen projecten. Kan dashboards en rapporten bekijken, maar niets bewerken of aanmaken.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
