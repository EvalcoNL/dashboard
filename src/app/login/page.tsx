"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Activity, Eye, EyeOff, AlertCircle } from "lucide-react";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [twoFactorToken, setTwoFactorToken] = useState("");
    const [show2FA, setShow2FA] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const result = await signIn("credentials", {
                email,
                password,
                twoFactorToken: show2FA ? twoFactorToken : undefined,
                redirect: false,
            });

            if (result?.error) {
                if (result.error.includes("TWO_FACTOR_REQUIRED")) {
                    setShow2FA(true);
                    setError(""); // Clear previous errors
                } else if (result.error.includes("INVALID_2FA_TOKEN")) {
                    setError("Ongeldige 2FA code. Probeer het opnieuw.");
                } else {
                    setError("Ongeldige inloggegevens. Probeer het opnieuw.");
                }
            } else {
                router.push("/dashboard");
                router.refresh();
            }
        } catch {
            setError("Er is een fout opgetreden. Probeer het later opnieuw.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            style={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)",
                padding: "20px",
                position: "relative",
                overflow: "hidden",
            }}
        >
            {/* Background glow effects */}
            <div
                style={{
                    position: "absolute",
                    top: "20%",
                    left: "30%",
                    width: "400px",
                    height: "400px",
                    background: "radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, transparent 70%)",
                    borderRadius: "50%",
                    pointerEvents: "none",
                }}
            />
            <div
                style={{
                    position: "absolute",
                    bottom: "10%",
                    right: "20%",
                    width: "300px",
                    height: "300px",
                    background: "radial-gradient(circle, rgba(139, 92, 246, 0.06) 0%, transparent 70%)",
                    borderRadius: "50%",
                    pointerEvents: "none",
                }}
            />

            <div className="animate-fade-in" style={{ width: "100%", maxWidth: "420px" }}>
                {/* Logo */}
                <div style={{ textAlign: "center", marginBottom: "40px" }}>
                    <div
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "64px",
                            height: "64px",
                            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                            borderRadius: "16px",
                            marginBottom: "16px",
                            boxShadow: "0 8px 32px rgba(99, 102, 241, 0.3)",
                        }}
                    >
                        <Activity size={32} color="white" />
                    </div>
                    <h1
                        style={{
                            fontSize: "1.75rem",
                            fontWeight: 700,
                            background: "linear-gradient(135deg, #f1f5f9, #94a3b8)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                            marginBottom: "8px",
                        }}
                    >
                        Evalco Dashboard
                    </h1>
                    <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem" }}>
                        AI Performance Analysis Platform
                    </p>
                </div>

                {/* Login Card */}
                <div
                    className="glass-card"
                    style={{ padding: "32px" }}
                >
                    <form onSubmit={handleSubmit}>
                        {!show2FA ? (
                            <>
                                <div style={{ marginBottom: "20px" }}>
                                    <label className="label" htmlFor="email">
                                        E-mailadres
                                    </label>
                                    <input
                                        id="email"
                                        type="email"
                                        className="input"
                                        placeholder="naam@evalco.nl"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        autoComplete="email"
                                        autoFocus
                                    />
                                </div>

                                <div style={{ marginBottom: "24px" }}>
                                    <label className="label" htmlFor="password">
                                        Wachtwoord
                                    </label>
                                    <div style={{ position: "relative" }}>
                                        <input
                                            id="password"
                                            type={showPassword ? "text" : "password"}
                                            className="input"
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            autoComplete="current-password"
                                            style={{ paddingRight: "44px" }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            style={{
                                                position: "absolute",
                                                right: "12px",
                                                top: "50%",
                                                transform: "translateY(-50%)",
                                                background: "none",
                                                border: "none",
                                                color: "var(--color-text-muted)",
                                                cursor: "pointer",
                                                padding: "4px",
                                            }}
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div style={{ marginBottom: "24px" }} className="animate-fade-in">
                                <label className="label" htmlFor="2fa">
                                    Twee-factor Authenticatie
                                </label>
                                <p style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)", marginBottom: "16px" }}>
                                    Voer de 6-cijferige verificatiecode uit je authenticator app in.
                                </p>
                                <input
                                    id="2fa"
                                    type="text"
                                    className="input"
                                    placeholder="000000"
                                    maxLength={6}
                                    value={twoFactorToken}
                                    onChange={(e) => setTwoFactorToken(e.target.value)}
                                    required
                                    autoFocus
                                    style={{
                                        textAlign: "center",
                                        letterSpacing: "8px",
                                        fontSize: "1.5rem",
                                        fontWeight: 700,
                                        height: "60px"
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShow2FA(false)}
                                    style={{
                                        marginTop: "12px",
                                        background: "none",
                                        border: "none",
                                        color: "var(--color-text-muted)",
                                        fontSize: "0.8rem",
                                        cursor: "pointer",
                                        width: "100%",
                                        textAlign: "center"
                                    }}
                                >
                                    Terug naar inloggen
                                </button>
                            </div>
                        )}

                        {error && (
                            <div
                                className="animate-fade-in"
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    padding: "12px 16px",
                                    background: "rgba(239, 68, 68, 0.1)",
                                    border: "1px solid rgba(239, 68, 68, 0.2)",
                                    borderRadius: "10px",
                                    marginBottom: "20px",
                                    color: "#f87171",
                                    fontSize: "0.85rem",
                                }}
                            >
                                <AlertCircle size={16} />
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading}
                            style={{
                                width: "100%",
                                padding: "12px",
                                fontSize: "0.9375rem",
                                opacity: loading ? 0.7 : 1,
                            }}
                        >
                            {loading ? (
                                <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <svg
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        style={{ animation: "spin 1s linear infinite" }}
                                    >
                                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.3" />
                                        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                                    </svg>
                                    Inloggen...
                                </span>
                            ) : (
                                "Inloggen"
                            )}
                        </button>
                    </form>
                </div>

                <p
                    style={{
                        textAlign: "center",
                        color: "var(--color-text-muted)",
                        fontSize: "0.8rem",
                        marginTop: "24px",
                    }}
                >
                    © {new Date().getFullYear()} Evalco — Intern Platform
                </p>
            </div>

            <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    );
}
