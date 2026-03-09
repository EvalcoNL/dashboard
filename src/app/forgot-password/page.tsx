"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, AlertCircle, ArrowLeft, CheckCircle2 } from "lucide-react";
import "../auth-shared.css";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const res = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Er is iets misgegaan. Probeer het opnieuw.");
            } else {
                setSuccess(true);
            }
        } catch (error: any) {
            console.error("Forgot password API error:", error);
            if (error.code) console.error("Error code:", error.code);
            if (error.meta) console.error("Error meta:", error.meta);
            setError("Systeemfout. Probeer het later opnieuw.");
        } finally {
            setLoading(false);
        }
    };

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
                    <h1>Wachtwoord vergeten</h1>
                    <p>Evalco AI Performance Platform</p>
                </div>

                <div className="auth-card auth-glass">
                    {!success ? (
                        <div className="auth-form-section">
                            <h2 className="auth-section-title">Wachtwoord herstellen</h2>
                            <p className="auth-section-subtitle">
                                Voer je e-mailadres in om een herstel-link te ontvangen.
                            </p>

                            <form onSubmit={handleSubmit} className="auth-form">
                                <div className="auth-input-group">
                                    <label htmlFor="email">E-mailadres</label>
                                    <div className="auth-input-wrapper">
                                        <Mail className="auth-input-icon" size={18} />
                                        <input
                                            id="email"
                                            type="email"
                                            placeholder="naam@evalco.nl"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            autoComplete="email"
                                        />
                                    </div>
                                </div>

                                {error && (
                                    <div className="auth-error-message">
                                        <AlertCircle size={16} />
                                        {error}
                                    </div>
                                )}

                                <button type="submit" className="auth-submit-btn" disabled={loading}>
                                    {loading ? <Spinner /> : "Verzenden"}
                                </button>
                            </form>
                        </div>
                    ) : (
                        <div className="auth-form-section auth-text-center auth-animate-slide-up">
                            <div className="auth-icon-badge success">
                                <CheckCircle2 size={32} />
                            </div>
                            <h2 className="auth-section-title">Check je mail</h2>
                            <p className="auth-section-subtitle">
                                We hebben een herstel-link gestuurd naar <strong>{email}</strong> als dit adres bij ons bekend is.
                            </p>
                            <p className="auth-hint">
                                Geen mail ontvangen? Check je spam-folder of probeer het over een paar minuten opnieuw.
                            </p>
                        </div>
                    )}

                    <div className="auth-footer-links">
                        <Link href="/login" className="auth-back-link">
                            <ArrowLeft size={16} /> Terug naar inloggen
                        </Link>
                    </div>
                </div>
            </main>

        </div>
    );
}

function Spinner() {
    return (
        <svg
            className="auth-spinner"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.2" />
            <path
                d="M12 2C6.47715 2 2 6.47715 2 12C2 13.5997 2.37562 15.1116 3.03902 16.4512"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
            />
        </svg>
    );
}
