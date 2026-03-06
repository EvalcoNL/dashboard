"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { User, Save, Loader2, Mail, CheckCircle, AlertCircle } from "lucide-react";

interface ProfileSettingsProps {
    initialName: string;
    initialEmail: string;
}

export default function ProfileSettings({ initialName, initialEmail }: ProfileSettingsProps) {
    const [name, setName] = useState(initialName);
    const [email, setEmail] = useState(initialEmail);
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [emailLoading, setEmailLoading] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error", text: string } | null>(null);
    const [emailMessage, setEmailMessage] = useState<{ type: "success" | "error" | "info", text: string } | null>(null);
    const searchParams = useSearchParams();

    // Check for email verification redirect messages
    useEffect(() => {
        const status = searchParams.get("email_status");
        const msg = searchParams.get("email_message");
        if (status && msg) {
            setEmailMessage({ type: status as "success" | "error", text: msg });
            // Clear the URL params without refresh
            const url = new URL(window.location.href);
            url.searchParams.delete("email_status");
            url.searchParams.delete("email_message");
            window.history.replaceState({}, "", url.toString());
        }
    }, [searchParams]);

    const handleSave = async () => {
        if (password && password !== confirmPassword) {
            setMessage({ type: "error", text: "Wachtwoorden komen niet overeen" });
            return;
        }

        if (password && password.length < 8) {
            setMessage({ type: "error", text: "Wachtwoord moet minimaal 8 tekens zijn" });
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

    const handleEmailChange = async () => {
        if (!email || email === initialEmail) {
            setEmailMessage({ type: "error", text: "Voer een nieuw e-mailadres in" });
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setEmailMessage({ type: "error", text: "Voer een geldig e-mailadres in" });
            return;
        }

        setEmailLoading(true);
        setEmailMessage(null);

        try {
            const res = await fetch("/api/user/change-email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            const data = await res.json();

            if (!res.ok) {
                setEmailMessage({ type: "error", text: data.error || "Er is een fout opgetreden" });
                return;
            }

            setEmailMessage({ type: "info", text: "Verificatie-e-mail verzonden! Controleer je inbox op " + email });
        } catch {
            setEmailMessage({ type: "error", text: "Er is een fout opgetreden" });
        } finally {
            setEmailLoading(false);
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
                {/* Name */}
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

                {/* Email */}
                <div>
                    <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "8px" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <Mail size={14} />
                            E-mailadres
                        </span>
                    </label>
                    <div style={{ display: "flex", gap: "10px" }}>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            style={{
                                flex: 1,
                                padding: "10px 14px",
                                background: "var(--color-surface)",
                                border: "1px solid var(--color-border)",
                                borderRadius: "8px",
                                color: "var(--color-text-primary)"
                            }}
                        />
                        <button
                            onClick={handleEmailChange}
                            disabled={emailLoading || email === initialEmail}
                            style={{
                                padding: "10px 16px",
                                background: email !== initialEmail ? "rgba(99, 102, 241, 0.1)" : "transparent",
                                color: email !== initialEmail ? "var(--color-brand)" : "var(--color-text-muted)",
                                border: "1px solid " + (email !== initialEmail ? "rgba(99, 102, 241, 0.3)" : "var(--color-border)"),
                                borderRadius: "8px",
                                fontWeight: 600,
                                fontSize: "0.8125rem",
                                cursor: emailLoading || email === initialEmail ? "not-allowed" : "pointer",
                                opacity: emailLoading ? 0.7 : 1,
                                whiteSpace: "nowrap",
                                display: "flex",
                                alignItems: "center",
                                gap: "6px"
                            }}
                        >
                            {emailLoading ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                            Wijzigen
                        </button>
                    </div>
                    {emailMessage && (
                        <div style={{
                            marginTop: "8px",
                            padding: "10px 14px",
                            borderRadius: "8px",
                            fontSize: "0.8125rem",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            background: emailMessage.type === "success" ? "rgba(16, 185, 129, 0.1)"
                                : emailMessage.type === "info" ? "rgba(99, 102, 241, 0.1)"
                                    : "rgba(239, 68, 68, 0.1)",
                            color: emailMessage.type === "success" ? "#10b981"
                                : emailMessage.type === "info" ? "#818cf8"
                                    : "#ef4444",
                            border: "1px solid " + (
                                emailMessage.type === "success" ? "rgba(16, 185, 129, 0.2)"
                                    : emailMessage.type === "info" ? "rgba(99, 102, 241, 0.2)"
                                        : "rgba(239, 68, 68, 0.2)"
                            ),
                        }}>
                            {emailMessage.type === "success" ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                            {emailMessage.text}
                        </div>
                    )}
                    <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: "6px" }}>
                        Bij wijziging ontvang je een verificatie-e-mail op het nieuwe adres
                    </p>
                </div>

                {/* Passwords */}
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

                {/* Profile save message */}
                {message && (
                    <div style={{
                        padding: "12px",
                        borderRadius: "8px",
                        fontSize: "0.875rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        background: message.type === "success" ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                        color: message.type === "success" ? "#10b981" : "#ef4444",
                    }}>
                        {message.type === "success" ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
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
