"use client";

import { useState } from "react";
import { Shield, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import Image from "next/image";

interface SecuritySettingsProps {
    is2FAEnabled: boolean;
}

export default function SecuritySettings({ is2FAEnabled: initialEnabled }: SecuritySettingsProps) {
    const [isEnabled, setIsEnabled] = useState(initialEnabled);
    const [step, setStep] = useState<"idle" | "setup" | "verify">("idle");
    const [qrCode, setQrCode] = useState("");
    const [secret, setSecret] = useState("");
    const [token, setToken] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [showDisableConfirm, setShowDisableConfirm] = useState(false);

    const handleSetup = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await fetch("/api/user/2fa/setup", { method: "POST" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Setup failed");

            setQrCode(data.qrCodeUrl);
            setSecret(data.secret);
            setStep("setup");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Er is een fout opgetreden");
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await fetch("/api/user/2fa/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ secret, token }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Verification failed");

            setIsEnabled(true);
            setStep("idle");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Er is een fout opgetreden");
        } finally {
            setLoading(false);
        }
    };

    const handleDisable = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await fetch("/api/user/2fa/disable", { method: "POST" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Disable failed");

            setIsEnabled(false);
            setShowDisableConfirm(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Er is een fout opgetreden");
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
                    background: "rgba(16, 185, 129, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#10b981"
                }}>
                    <Shield size={20} />
                </div>
                <div>
                    <h3 style={{ fontSize: "1rem", fontWeight: 600 }}>Beveiliging</h3>
                    <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>Twee-factor authenticatie (2FA)</p>
                </div>
            </div>

            <div style={{ display: "grid", gap: "20px" }}>
                <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "16px",
                    background: "var(--color-surface)",
                    borderRadius: "12px",
                    border: "1px solid var(--color-border)"
                }}>
                    <div>
                        <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>Twee-factor authenticatie</div>
                        <div style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
                            Voeg een extra beveiligingslaag toe aan je account.
                        </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        {isEnabled ? (
                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#10b981", fontSize: "0.875rem", fontWeight: 600 }}>
                                    <CheckCircle2 size={16} />
                                    Ingeschakeld
                                </div>
                                <button
                                    onClick={() => setShowDisableConfirm(true)}
                                    disabled={loading || showDisableConfirm}
                                    style={{
                                        padding: "6px 12px",
                                        background: "rgba(239, 68, 68, 0.1)",
                                        color: "#ef4444",
                                        border: "1px solid rgba(239, 68, 68, 0.2)",
                                        borderRadius: "6px",
                                        fontSize: "0.75rem",
                                        fontWeight: 600,
                                        cursor: "pointer",
                                        opacity: (loading || showDisableConfirm) ? 0.5 : 1
                                    }}
                                >
                                    Uitschakelen
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={handleSetup}
                                disabled={loading || step !== "idle"}
                                style={{
                                    padding: "8px 16px",
                                    background: "var(--color-brand)",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "8px",
                                    fontSize: "0.875rem",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    opacity: (loading || step !== "idle") ? 0.7 : 1
                                }}
                            >
                                {loading && step === "idle" ? <Loader2 size={16} className="animate-spin" /> : "Inschakelen"}
                            </button>
                        )}
                    </div>
                </div>

                {showDisableConfirm && (
                    <div className="animate-fade-in" style={{
                        padding: "16px",
                        background: "rgba(239, 68, 68, 0.05)",
                        border: "1px solid rgba(239, 68, 68, 0.2)",
                        borderRadius: "12px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "16px"
                    }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <AlertCircle size={20} color="#ef4444" />
                            <div>
                                <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#ef4444" }}>Weet je het zeker?</div>
                                <div style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
                                    Dit verlaagt de beveiliging van je account.
                                </div>
                            </div>
                        </div>
                        <div style={{ display: "flex", gap: "8px" }}>
                            <button
                                onClick={() => setShowDisableConfirm(false)}
                                disabled={loading}
                                style={{
                                    padding: "6px 12px",
                                    background: "none",
                                    border: "1px solid var(--color-border)",
                                    borderRadius: "8px",
                                    fontSize: "0.75rem",
                                    cursor: "pointer",
                                    color: "var(--color-text-primary)"
                                }}
                            >
                                Annuleren
                            </button>
                            <button
                                onClick={handleDisable}
                                disabled={loading}
                                style={{
                                    padding: "6px 12px",
                                    background: "#ef4444",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "8px",
                                    fontSize: "0.75rem",
                                    fontWeight: 600,
                                    cursor: "pointer"
                                }}
                            >
                                {loading ? <Loader2 size={14} className="animate-spin" /> : "Ja, uitschakelen"}
                            </button>
                        </div>
                    </div>
                )}

                {step === "setup" && (
                    <div style={{
                        padding: "24px",
                        background: "rgba(99, 102, 241, 0.03)",
                        border: "1px dashed var(--color-border)",
                        borderRadius: "12px",
                        textAlign: "center"
                    }}>
                        <p style={{ fontSize: "0.9rem", color: "var(--color-text-primary)", marginBottom: "20px", fontWeight: 500 }}>
                            Scan deze QR-code met een authenticator app (zoals Google Authenticator of Authy).
                        </p>
                        <div style={{
                            background: "white",
                            padding: "12px",
                            borderRadius: "12px",
                            display: "inline-block",
                            marginBottom: "20px",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
                        }}>
                            <Image
                                src={qrCode}
                                alt="QR Code"
                                width={180}
                                height={180}
                                unoptimized
                            />
                        </div>
                        <div style={{ maxWidth: "300px", margin: "0 auto" }}>
                            <label style={{ display: "block", fontSize: "0.85rem", textAlign: "left", marginBottom: "8px", fontWeight: 600 }}>
                                Voer de 6-cijferige code in:
                            </label>
                            <div style={{ display: "flex", gap: "12px" }}>
                                <input
                                    value={token}
                                    onChange={(e) => setToken(e.target.value)}
                                    placeholder="000000"
                                    maxLength={6}
                                    style={{
                                        flex: 1,
                                        padding: "12px",
                                        textAlign: "center",
                                        letterSpacing: "4px",
                                        fontSize: "1.25rem",
                                        fontWeight: 700,
                                        background: "var(--color-surface)",
                                        border: "1px solid var(--color-border)",
                                        borderRadius: "10px",
                                        color: "var(--color-text-primary)"
                                    }}
                                />
                                <button
                                    onClick={handleVerify}
                                    disabled={loading || token.length !== 6}
                                    style={{
                                        padding: "0 20px",
                                        background: "var(--color-brand)",
                                        color: "white",
                                        border: "none",
                                        borderRadius: "10px",
                                        fontWeight: 600,
                                        cursor: "pointer"
                                    }}
                                >
                                    {loading ? <Loader2 size={20} className="animate-spin" /> : "Verify"}
                                </button>
                            </div>
                            {error && (
                                <div style={{
                                    marginTop: "12px",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    color: "#ef4444",
                                    fontSize: "0.85rem",
                                    justifyContent: "center"
                                }}>
                                    <AlertCircle size={14} />
                                    {error}
                                </div>
                            )}
                        </div>
                        <button
                            onClick={() => setStep("idle")}
                            style={{ marginTop: "20px", background: "none", border: "none", color: "var(--color-text-muted)", fontSize: "0.85rem", cursor: "pointer" }}
                        >
                            Annuleren
                        </button>
                    </div>
                )}

                {isEnabled && (
                    <div style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)", fontStyle: "italic", textAlign: "center", opacity: 0.7 }}>
                        2FA is geactiveerd. Bij je volgende login zal om een code worden gevraagd.
                    </div>
                )}
            </div>
        </div>
    );
}
