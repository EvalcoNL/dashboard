"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, AlertCircle, ArrowRight, Mail, CheckCircle2 } from "lucide-react";

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
        <div className="login-container">
            <div className="blob blob-1"></div>
            <div className="blob blob-2"></div>
            <div className="blob blob-3"></div>

            <main className="content-wrapper">
                <div className="header">
                    <div className="logo-box">
                        <img src="/images/logo/logo_icon.svg" alt="Evalco" width={32} height={32} />
                    </div>
                    <h1>Evalco Dashboard</h1>
                    <p>AI Performance Analysis Platform</p>
                </div>

                <div className="card glass">
                    {success ? (
                        <div className="form-section animate-slide-up" style={{ textAlign: "center" }}>
                            <div className="icon-badge success">
                                <Mail size={28} />
                            </div>
                            <h2 className="section-title">Controleer je E-mail</h2>
                            <p className="section-subtitle" style={{ marginBottom: "16px" }}>
                                We hebben een verificatie link gestuurd naar <strong style={{ color: "#f8fafc" }}>{email}</strong>.
                            </p>
                            <p style={{ color: "#64748b", fontSize: "0.8rem", marginBottom: "24px", lineHeight: 1.6 }}>
                                Klik op de link in de e-mail om je account te activeren. De link is 24 uur geldig.
                            </p>
                            <Link href="/login" className="submit-btn" style={{ textDecoration: "none", display: "inline-flex" }}>
                                Ga naar Inloggen
                            </Link>
                        </div>
                    ) : (
                        <div className="form-section">
                            <h2 className="section-title">Account Aanmaken</h2>
                            <p className="section-subtitle">Registreer om aan de slag te gaan</p>

                            <form onSubmit={handleSubmit} className="form">
                                <div className="input-group">
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

                                <div className="input-group">
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

                                <div className="input-group">
                                    <label htmlFor="register-password">Wachtwoord</label>
                                    <div className="password-wrapper">
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
                                            className="toggle-password"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                {error && <ErrorMessage message={error} />}

                                <button type="submit" className="submit-btn" disabled={loading}>
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

                <footer className="footer">
                    <p>© {new Date().getFullYear()} Evalco &bull; Beveiligd Intern Platform</p>
                </footer>
            </main>

            <style jsx>{`
                .login-container {
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: #020617;
                    padding: 24px;
                    position: relative;
                    overflow: hidden;
                    font-family: 'Inter', -apple-system, sans-serif;
                    color: #f8fafc;
                }

                .blob {
                    position: absolute;
                    border-radius: 50%;
                    filter: blur(80px);
                    z-index: 0;
                    opacity: 0.15;
                    animation: float 20s infinite alternate;
                }
                .blob-1 { width: 500px; height: 500px; background: #6366f1; top: -100px; left: -100px; }
                .blob-2 { width: 400px; height: 400px; background: #a855f7; bottom: -50px; right: -50px; animation-delay: -5s; }
                .blob-3 { width: 300px; height: 300px; background: #2dd4bf; top: 40%; left: 60%; animation-delay: -10s; }

                @keyframes float {
                    from { transform: translate(0, 0) rotate(0deg); }
                    to { transform: translate(40px, 40px) rotate(10deg); }
                }

                .content-wrapper {
                    position: relative;
                    z-index: 10;
                    width: 100%;
                    max-width: 420px;
                    display: flex;
                    flex-direction: column;
                    gap: 32px;
                    margin: 0 auto;
                }

                .header { text-align: center; }

                .logo-box {
                    display: inline-flex;
                    margin-bottom: 20px;
                }

                h1 {
                    font-size: 1.875rem;
                    font-weight: 800;
                    letter-spacing: -0.025em;
                    margin-bottom: 4px;
                    background: linear-gradient(to right, #f8fafc, #94a3b8);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }

                .header p { color: #94a3b8; font-size: 0.9375rem; }

                .glass {
                    background: rgba(15, 23, 42, 0.6);
                    backdrop-filter: blur(16px);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 24px;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                }

                .card { padding: 40px; }

                .section-title { font-size: 1.25rem; font-weight: 700; margin-bottom: 6px; }
                .section-subtitle { color: #94a3b8; font-size: 0.875rem; margin-bottom: 32px; }

                .form { display: flex; flex-direction: column; gap: 20px; }

                .input-group { display: flex; flex-direction: column; gap: 8px; }

                label {
                    font-size: 0.8125rem;
                    font-weight: 600;
                    color: #cbd5e1;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                input {
                    background: rgba(30, 41, 59, 0.5);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 12px;
                    padding: 12px 16px;
                    color: white;
                    font-size: 0.9375rem;
                    transition: all 0.2s ease;
                }

                input:focus {
                    outline: none;
                    border-color: #6366f1;
                    background: rgba(30, 41, 59, 0.8);
                    box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
                }

                .password-wrapper { position: relative; }
                .password-wrapper input { width: 100%; padding-right: 48px; }

                .toggle-password {
                    position: absolute;
                    right: 12px;
                    top: 50%;
                    transform: translateY(-50%);
                    background: none;
                    border: none;
                    color: #64748b;
                    cursor: pointer;
                    display: flex;
                    padding: 8px;
                    border-radius: 8px;
                }
                .toggle-password:hover { color: #f8fafc; background: rgba(255, 255, 255, 0.05); }

                .submit-btn {
                    margin-top: 12px;
                    background: #6366f1;
                    color: white;
                    border: none;
                    border-radius: 12px;
                    padding: 14px;
                    font-size: 0.9375rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                }

                .submit-btn:hover {
                    background: #4f46e5;
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4);
                }

                .submit-btn:active { transform: translateY(0); }
                .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

                .icon-badge {
                    display: inline-flex;
                    padding: 16px;
                    background: rgba(99, 102, 241, 0.1);
                    color: #6366f1;
                    border-radius: 50%;
                    margin-bottom: 24px;
                }

                .icon-badge.success {
                    background: rgba(16, 185, 129, 0.1);
                    color: #10b981;
                }

                .footer { text-align: center; color: #475569; font-size: 0.75rem; }

                .animate-slide-up { animation: slide-up 0.4s ease-out; }

                @keyframes slide-up {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                @keyframes spin { to { transform: rotate(360deg); } }
                .spinner { animation: spin 1s linear infinite; }
            `}</style>
        </div>
    );
}

function ErrorMessage({ message }: { message: string }) {
    return (
        <div className="error-message">
            <AlertCircle size={16} />
            {message}
            <style jsx>{`
                .error-message {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 12px 16px;
                    background: rgba(239, 68, 68, 0.1);
                    border: 1px solid rgba(239, 68, 68, 0.2);
                    border-radius: 12px;
                    color: #f87171;
                    font-size: 0.875rem;
                    animation: shake 0.4s ease-in-out;
                }
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-4px); }
                    75% { transform: translateX(4px); }
                }
            `}</style>
        </div>
    );
}

function Spinner() {
    return (
        <svg className="spinner" width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.2" />
            <path d="M12 2C6.47715 2 2 6.47715 2 12C2 13.5997 2.37562 15.1116 3.03902 16.4512" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
    );
}
