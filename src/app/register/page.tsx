"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, AlertCircle, ArrowRight, Mail, CheckCircle2 } from "lucide-react";
import "../auth-shared.css";

export default function RegisterPage() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Registratie mislukt");
            }

            setSuccess(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Er is een fout opgetreden");
        } finally {
            setLoading(false);
        }
    };

    if (!mounted) return null;

    return (
        <div className="auth-container">
            <div className="auth-blob auth-blob-1"></div>
            <div className="auth-blob auth-blob-2"></div>
            <div className="auth-blob auth-blob-3"></div>

            <main className="auth-content-wrapper">
                <div className="auth-header">
                    <div className="auth-logo-box">
                        <img src="/images/logo/logo_icon.svg" alt="Evalco" width={32} height={32} />
                    </div>
                    <h1>Evalco Dashboard</h1>
                    <p>AI Performance Analysis Platform</p>
                </div>

                <div className="auth-card auth-glass">
                    {success ? (
                        <div className="auth-form-section auth-animate-slide-up" style={{ textAlign: "center" }}>
                            <div className="auth-icon-badge success">
                                <Mail size={28} />
                            </div>
                            <h2 className="auth-section-title">Controleer je E-mail</h2>
                            <p className="auth-section-subtitle" style={{ marginBottom: "16px" }}>
                                We hebben een verificatie link gestuurd naar <strong style={{ color: "#f8fafc" }}>{email}</strong>.
                            </p>
                            <p style={{ color: "#64748b", fontSize: "0.8rem", marginBottom: "24px", lineHeight: 1.6 }}>
                                Klik op de link in de e-mail om je account te activeren. De link is 24 uur geldig.
                            </p>
                            <Link href="/login" className="auth-submit-btn" style={{ textDecoration: "none", display: "inline-flex" }}>
                                Ga naar Inloggen
                            </Link>
                        </div>
                    ) : (
                        <div className="auth-form-section">
                            <h2 className="auth-section-title">Account Aanmaken</h2>
                            <p className="auth-section-subtitle">Registreer om aan de slag te gaan</p>

                            <form onSubmit={handleSubmit} className="auth-form">
                                <div className="auth-input-group">
                                    <label htmlFor="name">Volledige Naam</label>
                                    <input
                                        id="name"
                                        type="text"
                                        placeholder="Jan de Vries"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                        autoComplete="name"
                                        autoFocus
                                    />
                                </div>

                                <div className="auth-input-group">
                                    <label htmlFor="register-email">E-mailadres</label>
                                    <input
                                        id="register-email"
                                        type="email"
                                        placeholder="naam@bedrijf.nl"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        autoComplete="email"
                                    />
                                </div>

                                <div className="auth-input-group">
                                    <label htmlFor="register-password">Wachtwoord</label>
                                    <div className="auth-password-wrapper">
                                        <input
                                            id="register-password"
                                            type={showPassword ? "text" : "password"}
                                            placeholder="Minimaal 6 karakters"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            minLength={6}
                                            autoComplete="new-password"
                                        />
                                        <button
                                            type="button"
                                            className="auth-toggle-password"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                {error && <ErrorMessage message={error} />}

                                <button type="submit" className="auth-submit-btn" disabled={loading}>
                                    {loading ? <Spinner /> : (
                                        <>
                                            Account Aanmaken <ArrowRight size={18} />
                                        </>
                                    )}
                                </button>
                            </form>

                            <div style={{ textAlign: "center", marginTop: "24px" }}>
                                <span style={{ color: "#64748b", fontSize: "0.85rem" }}>
                                    Al een account?{" "}
                                    <Link href="/login" style={{ color: "#818cf8", textDecoration: "none", fontWeight: 600 }}>
                                        Inloggen
                                    </Link>
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                <footer className="auth-footer">
                    <p>© {new Date().getFullYear()} Evalco &bull; Beveiligd Intern Platform</p>
                </footer>
            </main>

        </div>
    );
}

function ErrorMessage({ message }: { message: string }) {
    return (
        <div className="auth-error-message">
            <AlertCircle size={16} />
            {message}
        </div>
    );
}

function Spinner() {
    return (
        <svg className="auth-spinner" width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.2" />
            <path d="M12 2C6.47715 2 2 6.47715 2 12C2 13.5997 2.37562 15.1116 3.03902 16.4512" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
    );
}
