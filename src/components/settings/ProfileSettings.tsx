"use client";

import { useState } from "react";
import { User, Save, Loader2 } from "lucide-react";

interface ProfileSettingsProps {
    initialName: string;
}

export default function ProfileSettings({ initialName }: ProfileSettingsProps) {
    const [name, setName] = useState(initialName);
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error", text: string } | null>(null);

    const handleSave = async () => {
        if (password && password !== confirmPassword) {
            setMessage({ type: "error", text: "Wachtwoorden komen niet overeen" });
            return;
        }

        setLoading(true);
        setMessage(null);

        try {
            const res = await fetch("/api/user/profile", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, password: password || undefined }),
            });

            if (!res.ok) throw new Error("Update failed");

            setMessage({ type: "success", text: "Profiel succesvol bijgewerkt" });
            setPassword("");
            setConfirmPassword("");
        } catch {
            setMessage({ type: "error", text: "Er is een fout opgetreden bij het bijwerken van je profiel" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="glass-card" style={{ padding: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
                <div style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "10px",
                    background: "rgba(99, 102, 241, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--color-brand)"
                }}>
                    <User size={20} />
                </div>
                <div>
                    <h3 style={{ fontSize: "1rem", fontWeight: 600 }}>Profielinstellingen</h3>
                    <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>Beheer je persoonlijke informatie</p>
                </div>
            </div>

            <div style={{ display: "grid", gap: "20px" }}>
                <div>
                    <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "8px" }}>Naam</label>
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        style={{
                            width: "100%",
                            padding: "10px 14px",
                            background: "var(--color-surface)",
                            border: "1px solid var(--color-border)",
                            borderRadius: "8px",
                            color: "var(--color-text-primary)"
                        }}
                    />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                    <div>
                        <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "8px" }}>Nieuw Wachtwoord</label>
                        <input
                            type="password"
                            placeholder="Leeg laten om niet te wijzigen"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={{
                                width: "100%",
                                padding: "10px 14px",
                                background: "var(--color-surface)",
                                border: "1px solid var(--color-border)",
                                borderRadius: "8px",
                                color: "var(--color-text-primary)"
                            }}
                        />
                    </div>
                    <div>
                        <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "8px" }}>Bevestig Wachtwoord</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            style={{
                                width: "100%",
                                padding: "10px 14px",
                                background: "var(--color-surface)",
                                border: "1px solid var(--color-border)",
                                borderRadius: "8px",
                                color: "var(--color-text-primary)"
                            }}
                        />
                    </div>
                </div>

                {message && (
                    <div style={{
                        padding: "12px",
                        borderRadius: "8px",
                        fontSize: "0.875rem",
                        background: message.type === "success" ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                        color: message.type === "success" ? "#10b981" : "#ef4444",
                    }}>
                        {message.text}
                    </div>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "10px 24px",
                            background: "var(--color-brand)",
                            color: "white",
                            border: "none",
                            borderRadius: "8px",
                            fontWeight: 600,
                            cursor: loading ? "not-allowed" : "pointer",
                            opacity: loading ? 0.7 : 1
                        }}
                    >
                        {loading ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                        Wijzigingen Opslaan
                    </button>
                </div>
            </div>
        </div>
    );
}
