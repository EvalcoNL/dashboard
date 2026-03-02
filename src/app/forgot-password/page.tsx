"use client";

import { useState } from "react";
import Link from "next/link";
import { Activity, Mail, AlertCircle, ArrowLeft, CheckCircle2 } from "lucide-react";

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
            console.log("[ForgotPassword] Request for email:", email);

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
            // Log more details about the error to help debugging
            if (error.code) console.error("Error code:", error.code);
            if (error.meta) console.error("Error meta:", error.meta);
            setError("Systeemfout. Probeer het later opnieuw.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="blob blob-1"></div>
            <div className="blob blob-2"></div>
            <div className="blob blob-3"></div>

            <main className="content-wrapper">
                <div className="header">
                    <div className="logo-box">
                        <Activity size={32} strokeWidth={2.5} />
                    </div>
                    <h1>Wachtwoord vergeten</h1>
                    <p>Evalco AI Performance Platform</p>
                </div>

                <div className="card glass">
                    {!success ? (
                        <div className="form-section">
                            <h2 className="section-title">Wachtwoord herstellen</h2>
                            <p className="section-subtitle">
                                Voer je e-mailadres in om een herstel-link te ontvangen.
                            </p>

                            <form onSubmit={handleSubmit} className="form">
                                <div className="input-group">
                                    <label htmlFor="email">E-mailadres</label>
                                    <div className="input-wrapper">
                                        <Mail className="input-icon" size={18} />
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
                                    <div className="error-message">
                                        <AlertCircle size={16} />
                                        {error}
                                    </div>
                                )}

                                <button type="submit" className="submit-btn" disabled={loading}>
                                    {loading ? <Spinner /> : "Verzenden"}
                                </button>
                            </form>
                        </div>
                    ) : (
                        <div className="form-section text-center animate-slide-up">
                            <div className="icon-badge-success">
                                <CheckCircle2 size={32} />
                            </div>
                            <h2 className="section-title">Check je mail</h2>
                            <p className="section-subtitle">
                                We hebben een herstel-link gestuurd naar <strong>{email}</strong> als dit adres bij ons bekend is.
                            </p>
                            <p className="hint">
                                Geen mail ontvangen? Check je spam-folder of probeer het over een paar minuten opnieuw.
                            </p>
                        </div>
                    )}

                    <div className="footer-links">
                        <Link href="/login" className="back-link">
                            <ArrowLeft size={16} /> Terug naar inloggen
                        </Link>
                    </div>
                </div>
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
                }

                .header { text-align: center; }
                .logo-box {
                    display: inline-flex;
                    padding: 12px;
                    background: linear-gradient(135deg, #6366f1, #8b5cf6);
                    border-radius: 16px;
                    margin-bottom: 20px;
                    box-shadow: 0 8px 32px rgba(99, 102, 241, 0.4);
                    color: white;
                }

                h1 {
                    font-size: 1.875rem;
                    font-weight: 800;
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
                    padding: 40px;
                }

                .section-title { font-size: 1.25rem; font-weight: 700; margin-bottom: 6px; }
                .section-subtitle { color: #94a3b8; font-size: 0.875rem; margin-bottom: 32px; }
                .text-center { text-align: center; }

                .form { display: flex; flex-direction: column; gap: 20px; }
                .input-group { display: flex; flex-direction: column; gap: 8px; }
                label { font-size: 0.8125rem; font-weight: 600; color: #cbd5e1; text-transform: uppercase; letter-spacing: 0.05em; }

                .input-wrapper { position: relative; }
                .input-icon { 
                    position: absolute; 
                    left: 14px; 
                    top: 50%; 
                    transform: translateY(-50%); 
                    color: #64748b; 
                    pointer-events: none;
                    z-index: 10;
                }
                input {
                    width: 100%;
                    background: rgba(30, 41, 59, 0.5);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 12px;
                    padding: 12px 16px 12px 42px;
                    color: white;
                    font-size: 0.9375rem;
                    transition: all 0.2s ease;
                    position: relative;
                }
                input:focus { outline: none; border-color: #6366f1; background: rgba(30, 41, 59, 0.8); box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1); }

                .submit-btn {
                    background: #6366f1;
                    color: white;
                    border: none;
                    border-radius: 12px;
                    padding: 14px;
                    font-size: 0.9375rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                .submit-btn:hover { background: #4f46e5; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4); }
                .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }

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
                }

                .icon-badge-success {
                    display: inline-flex;
                    padding: 20px;
                    background: rgba(16, 185, 129, 0.1);
                    color: #10b981;
                    border-radius: 50%;
                    margin-bottom: 24px;
                }

                .hint { font-size: 0.8125rem; color: #64748b; line-height: 1.5; margin-top: 16px; }

                .footer-links {
                    margin-top: 32px;
                    padding-top: 24px;
                    border-top: 1px solid rgba(255, 255, 255, 0.05);
                    text-align: center;
                }

                .back-link {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    color: #64748b;
                    text-decoration: none;
                    font-size: 0.8125rem;
                    transition: color 0.2s ease;
                    margin-top: 16px;
                }
                .back-link:hover { 
                    color: #94a3b8;
                }

                .animate-slide-up { animation: slide-up 0.4s ease-out; }
                @keyframes slide-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes spin { to { transform: rotate(360deg); } }
                .spinner { animation: spin 1s linear infinite; }
            `}</style>
        </div>
    );
}

function Spinner() {
    return (
        <svg
            className="spinner"
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
