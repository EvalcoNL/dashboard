"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, AlertCircle, ShieldCheck, ChevronLeft, ArrowRight } from "lucide-react";
import "../auth-shared.css";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [twoFactorToken, setTwoFactorToken] = useState("");
    const [show2FA, setShow2FA] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            // Step 1: If 2FA form isn't shown yet, pre-check credentials and 2FA status
            if (!show2FA) {
                const checkRes = await fetch("/api/auth/check-2fa", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, password }),
                });
                const checkData = await checkRes.json();

                if (!checkData.valid) {
                    setError("Ongeldig e-mailadres of wachtwoord.");
                    setLoading(false);
                    return;
                }

                if (checkData.twoFactorRequired) {
                    setShow2FA(true);
                    setLoading(false);
                    return;
                }
            }

            // Step 2: Sign in with NextAuth (with or without 2FA token)
            const result = await signIn("credentials", {
                email,
                password,
                twoFactorToken: show2FA ? twoFactorToken : "",
                redirect: false,
            });

            if (result?.error) {
                if (show2FA) {
                    setError("Ongeldige verificatiecode. Probeer het opnieuw.");
                } else {
                    setError("Ongeldig e-mailadres of wachtwoord.");
                }
            } else if (result?.ok) {
                router.push("/");
                router.refresh();
            } else {
                setError("Er is een onbekende fout opgetreden.");
            }
        } catch (err) {
            console.error("SignIn catch error:", err);
            setError("Systeemfout. Probeer het later opnieuw.");
        } finally {
            setLoading(false);
        }
    };

    if (!mounted) return null;

    return (
        <div className="auth-container">
            {/* Animated Background Blobs */}
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
                    {!show2FA ? (
                        <div className="auth-form-section">
                            <h2 className="auth-section-title">Welkom terug</h2>
                            <p className="auth-section-subtitle">Voer je gegevens in om in te loggen</p>

                            <form onSubmit={handleSubmit} className="auth-form">
                                <div className="auth-input-group">
                                    <label htmlFor="email">E-mailadres</label>
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

                                <div className="auth-input-group">
                                    <div className="auth-label-row">
                                        <label htmlFor="password">Wachtwoord</label>
                                        <Link href="/forgot-password" title="Wachtwoord vergeten" className="auth-forgot-link">Vergeten?</Link>
                                    </div>
                                    <div className="auth-password-wrapper">
                                        <input
                                            id="password"
                                            type={showPassword ? "text" : "password"}
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            autoComplete="current-password"
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
                                            Inloggen <ArrowRight size={18} />
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    ) : (
                        <div className="auth-form-section auth-animate-slide-up">
                            <button className="auth-back-btn" onClick={() => setShow2FA(false)}>
                                <ChevronLeft size={18} /> Terug
                            </button>
                            <div className="auth-icon-badge">
                                <ShieldCheck size={28} />
                            </div>
                            <h2 className="auth-section-title">2FA Verificatie</h2>
                            <p className="auth-section-subtitle">Voer de 6-cijferige code in uit je authenticator app</p>

                            <form onSubmit={handleSubmit} className="auth-form">
                                <div className="auth-input-group">
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        placeholder="000 000"
                                        maxLength={6}
                                        value={twoFactorToken}
                                        onChange={(e) => setTwoFactorToken(e.target.value.replace(/\D/g, ""))}
                                        required
                                        autoFocus
                                        className="auth-otp-input"
                                    />
                                </div>

                                {error && <ErrorMessage message={error} />}

                                <button type="submit" className="auth-submit-btn" disabled={loading}>
                                    {loading ? <Spinner /> : "Verifiëren"}
                                </button>
                            </form>
                        </div>
                    )}
                </div>

                <footer className="auth-footer">
                    <p>© {new Date().getFullYear()} Evalco &bull; Beveiligd Intern Platform</p>
                    <p style={{ marginTop: "8px" }}>
                        <Link href="/register" style={{ color: "#818cf8", textDecoration: "none", fontWeight: 500 }}>
                            Nog geen account? Registreren
                        </Link>
                    </p>
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
