"use client";

import { useState } from "react";
import { X, User, Lock, Loader2, Eye, EyeOff } from "lucide-react";

interface LoginCredentialsModalProps {
    open: boolean;
    onClose: () => void;
    clientId: string;
    platformType: string;
    platformName: string;
    platformColor: string;
}

export default function LoginCredentialsModal({
    open, onClose, clientId, platformType, platformName, platformColor,
}: LoginCredentialsModalProps) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    if (!open) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const res = await fetch("/api/data-sources/api-key", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    clientId,
                    platformType,
                    name: name || `${platformName} - ${username}`,
                    config: { username, password },
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Er ging iets mis");

            setSuccess(true);
            setTimeout(() => {
                onClose();
                window.location.reload();
            }, 1500);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            style={{
                position: "fixed", inset: 0, zIndex: 1000,
                background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
                display: "flex", alignItems: "center", justifyContent: "center",
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: "var(--color-surface-elevated)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "16px", padding: "32px",
                    width: "100%", maxWidth: "480px", position: "relative",
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <button onClick={onClose} style={{
                    position: "absolute", top: "16px", right: "16px",
                    background: "none", border: "none", cursor: "pointer",
                    color: "var(--color-text-muted)", padding: "4px",
                }}>
                    <X size={20} />
                </button>

                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
                    <div style={{
                        width: "48px", height: "48px", borderRadius: "12px",
                        background: `${platformColor}20`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                        <User size={24} color={platformColor} />
                    </div>
                    <div>
                        <h2 style={{ fontWeight: 700, fontSize: "1.25rem", color: "var(--color-text-primary)", margin: 0 }}>
                            {platformName} koppelen
                        </h2>
                        <p style={{ color: "var(--color-text-secondary)", fontSize: "0.85rem", margin: 0 }}>
                            Voer je inloggegevens in
                        </p>
                    </div>
                </div>

                {success ? (
                    <div style={{
                        padding: "24px", textAlign: "center",
                        background: "rgba(16,185,129,0.1)", borderRadius: "12px",
                        color: "#10b981", fontWeight: 600,
                    }}>
                        ✓ {platformName} is succesvol gekoppeld!
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: "16px" }}>
                            <label style={{
                                display: "block", marginBottom: "6px", fontWeight: 600,
                                fontSize: "0.85rem", color: "var(--color-text-primary)",
                            }}>
                                Weergavenaam (optioneel)
                            </label>
                            <input type="text" value={name} onChange={e => setName(e.target.value)}
                                placeholder={platformName}
                                style={{
                                    width: "100%", padding: "10px 14px",
                                    background: "var(--color-surface)", border: "1px solid var(--color-border)",
                                    borderRadius: "8px", color: "var(--color-text-primary)",
                                    fontSize: "0.9rem", outline: "none", boxSizing: "border-box",
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: "16px" }}>
                            <label style={{
                                display: "block", marginBottom: "6px", fontWeight: 600,
                                fontSize: "0.85rem", color: "var(--color-text-primary)",
                            }}>
                                Gebruikersnaam / E-mail <span style={{ color: "#ef4444" }}>*</span>
                            </label>
                            <div style={{ position: "relative" }}>
                                <User size={16} style={{
                                    position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)",
                                    color: "var(--color-text-muted)",
                                }} />
                                <input type="text" required value={username} onChange={e => setUsername(e.target.value)}
                                    placeholder="gebruikersnaam of e-mail"
                                    style={{
                                        width: "100%", padding: "10px 14px 10px 36px",
                                        background: "var(--color-surface)", border: "1px solid var(--color-border)",
                                        borderRadius: "8px", color: "var(--color-text-primary)",
                                        fontSize: "0.9rem", outline: "none", boxSizing: "border-box",
                                    }}
                                />
                            </div>
                        </div>

                        <div style={{ marginBottom: "16px" }}>
                            <label style={{
                                display: "block", marginBottom: "6px", fontWeight: 600,
                                fontSize: "0.85rem", color: "var(--color-text-primary)",
                            }}>
                                Wachtwoord <span style={{ color: "#ef4444" }}>*</span>
                            </label>
                            <div style={{ position: "relative" }}>
                                <Lock size={16} style={{
                                    position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)",
                                    color: "var(--color-text-muted)",
                                }} />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required value={password} onChange={e => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    style={{
                                        width: "100%", padding: "10px 40px 10px 36px",
                                        background: "var(--color-surface)", border: "1px solid var(--color-border)",
                                        borderRadius: "8px", color: "var(--color-text-primary)",
                                        fontSize: "0.9rem", outline: "none", boxSizing: "border-box",
                                        fontFamily: "monospace",
                                    }}
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)}
                                    style={{
                                        position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)",
                                        background: "none", border: "none", cursor: "pointer",
                                        color: "var(--color-text-muted)", padding: "4px",
                                    }}
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <div style={{
                            padding: "10px 14px", marginBottom: "16px",
                            background: "rgba(245,158,11,0.1)", borderRadius: "8px",
                            color: "#f59e0b", fontSize: "0.8rem",
                        }}>
                            ⚠ Inloggegevens worden versleuteld opgeslagen
                        </div>

                        {error && (
                            <div style={{
                                padding: "10px 14px", marginBottom: "16px",
                                background: "rgba(239,68,68,0.1)", borderRadius: "8px",
                                color: "#ef4444", fontSize: "0.85rem",
                            }}>
                                {error}
                            </div>
                        )}

                        <button type="submit" disabled={loading}
                            style={{
                                width: "100%", padding: "12px",
                                background: platformColor, color: "white",
                                border: "none", borderRadius: "10px",
                                fontWeight: 600, fontSize: "0.95rem",
                                cursor: loading ? "not-allowed" : "pointer",
                                opacity: loading ? 0.7 : 1,
                                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                            }}
                        >
                            {loading ? <Loader2 size={18} className="spin" /> : null}
                            {loading ? "Koppelen..." : "Koppelen"}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
