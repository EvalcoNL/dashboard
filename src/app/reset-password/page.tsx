"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock, AlertCircle, ArrowLeft, CheckCircle2, Eye, EyeOff } from "lucide-react";
import "../auth-shared.css";

function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token");

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (!token) {
            setError("Ongeldige of ontbrekende token.");
        }
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (password !== confirmPassword) {
            setError("Wachtwoorden komen niet overeen.");
            return;
        }

        if (password.length < 8) {
            setError("Wachtwoord moet minimaal 8 tekens lang zijn.");
            return;
        }

        setLoading(true);

        try {
            const res = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Er is iets misgegaan. Probeer het opnieuw.");
            } else {
                setSuccess(true);
                setTimeout(() => {
                    router.push("/login");
                }, 3000);
            }
        } catch (err) {
            console.error("Reset password error:", err);
            setError("Systeemfout. Probeer het later opnieuw.");
        } finally {
            setLoading(false);
        }
    };

    if (!token && !error) return null;

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
                    <h1>Wachtwoord herstellen</h1>
                    <p>Evalco AI Performance Platform</p>
                </div>

                <div className="auth-card auth-glass">
                    {!success ? (
                        <div className="auth-form-section">
                            <h2 className="auth-section-title">Nieuw wachtwoord</h2>
                            <p className="auth-section-subtitle">
                                Stel een nieuw veilig wachtwoord in voor je account.
                            </p>

                            <form onSubmit={handleSubmit} className="auth-form">
                                <div className="auth-input-group">
                                    <label htmlFor="password">Nieuw wachtwoord</label>
                                    <div className="auth-password-wrapper">
                                        <input
                                            id="password"
                                            type={showPassword ? "text" : "password"}
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            minLength={8}
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

                                <div className="auth-input-group">
                                    <label htmlFor="confirmPassword">Bevestig wachtwoord</label>
                                    <div className="auth-password-wrapper">
                                        <input
                                            id="confirmPassword"
                                            type={showPassword ? "text" : "password"}
                                            placeholder="••••••••"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                {error && (
                                    <div className="auth-error-message">
                                        <AlertCircle size={16} />
                                        {error}
                                    </div>
                                )}

                                <button type="submit" className="auth-submit-btn" disabled={loading || !!error}>
                                    {loading ? <Spinner /> : "Wachtwoord opslaan"}
                                </button>
                            </form>
                        </div>
                    ) : (
                        <div className="auth-form-section auth-text-center auth-animate-slide-up">
                            <div className="auth-icon-badge success">
                                <CheckCircle2 size={32} />
                            </div>
                            <h2 className="auth-section-title">Wachtwoord gewijzigd</h2>
                            <p className="auth-section-subtitle">
                                Je wachtwoord is succesvol aangepast. Je wordt nu doorgestuurd naar het inlogscherm...
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

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={null}>
            <ResetPasswordForm />
        </Suspense>
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
