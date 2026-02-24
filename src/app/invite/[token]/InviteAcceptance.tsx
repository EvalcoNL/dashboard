"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Activity, ShieldCheck, Mail, ArrowRight, UserPlus, LogIn } from "lucide-react";

export default function InviteAcceptance({
    token,
    email,
    clientName,
    userExists
}: {
    token: string;
    email: string;
    clientName: string;
    userExists: boolean;
}) {
    const router = useRouter();
    const [name, setName] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [step, setStep] = useState<"form" | "success">("form");

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            // Register or link user
            const res = await fetch("/api/auth/register-invite", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, name, password })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Registratie onbekende fout");
            }

            // Immediately Auto-login with the submitted credentials
            const signInResult = await signIn("credentials", {
                email,
                password,
                redirect: false,
            });

            if (signInResult?.error) {
                throw new Error("Account aangemaakt, maar automatisch inloggen mislukt. Log handmatig in.");
            }

            setStep("success");
            setTimeout(() => {
                router.push("/dashboard");
                router.refresh();
            }, 2000);

        } catch (err: any) {
            console.error(err);
            setError(err.message || "Er is iets fout gegaan.");
        } finally {
            setLoading(false);
        }
    };

    const handleLoginExisting = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const signInResult = await signIn("credentials", {
                email,
                password,
                redirect: false,
            });

            if (signInResult?.error) {
                throw new Error("Ongeldig wachtwoord.");
            }

            // Once logged in, the user has to accept the token, but the NextJS server component
            // used to do this automatically if session exists. Since we changed it, lets hit the register endpoint with empty name
            const res = await fetch("/api/auth/register-invite", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, name: "Bestaande Gebruiker", password })
            });

            if (!res.ok) {
                // Ignore API error since they might just be logging in
            }

            setStep("success");
            setTimeout(() => {
                router.push("/dashboard");
                router.refresh();
            }, 2000);

        } catch (err: any) {
            console.error(err);
            setError(err.message || "Er is iets fout gegaan.");
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="login-container">
            {/* Animated Background Elements */}
            <div className="ambient-light light-1"></div>
            <div className="ambient-light light-2"></div>

            <main className="content-wrapper">
                <div className="header">
                    <div className="logo-box">
                        <Activity size={32} strokeWidth={2.5} />
                    </div>
                    <h1>Evalco Workspace</h1>
                    <p className="subtitle">Je bent uitgenodigd voor <strong>{clientName}</strong></p>
                </div>

                <div className="card-glass">
                    {step === "success" ? (
                        <div className="success-state">
                            <div className="success-icon-wrapper">
                                <ShieldCheck size={36} />
                            </div>
                            <h2>Succesvol Gekoppeld!</h2>
                            <p>Je wordt nu doorgestuurd naar je dashboard...</p>
                            <div className="loading-bar">
                                <div className="loading-progress"></div>
                            </div>
                        </div>
                    ) : (
                        <div className="form-section">
                            <div className="form-header">
                                <h2>
                                    {userExists
                                        ? "Inloggen & Accepteren"
                                        : "Uitnodiging Accepteren en Account Aanmaken"}
                                </h2>
                                <p>
                                    Koppel je toegang tot <strong>{clientName}</strong> aan {email}.
                                </p>
                            </div>

                            <form onSubmit={userExists ? handleLoginExisting : handleRegister} className="form">
                                <div className="input-group">
                                    <label>E-mailadres</label>
                                    <div className="readonly-email">
                                        <Mail size={16} className="text-muted" />
                                        <span>{email}</span>
                                    </div>
                                </div>

                                {!userExists && (
                                    <div className="input-group">
                                        <label htmlFor="name">Volledige Naam</label>
                                        <input
                                            id="name"
                                            type="text"
                                            placeholder="Je volledige naam"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            required
                                        />
                                    </div>
                                )}

                                <div className="input-group">
                                    <div className="label-row">
                                        <label htmlFor="password">Wachtwoord</label>
                                    </div>
                                    <input
                                        id="password"
                                        type="password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        minLength={6}
                                    />
                                    {!userExists && (
                                        <span className="input-hint">Minimaal 6 karakters vereist</span>
                                    )}
                                </div>

                                {error && (
                                    <div className="error-message">
                                        <div className="error-indicator"></div>
                                        {error}
                                    </div>
                                )}

                                <button type="submit" className="submit-btn" disabled={loading}>
                                    {loading ? (
                                        <span className="btn-content">
                                            <svg className="spinner" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Bezig met verwerken...
                                        </span>
                                    ) : (
                                        <span className="btn-content">
                                            {userExists ? (
                                                <>
                                                    <LogIn size={18} />
                                                    Inloggen & Accepteren
                                                </>
                                            ) : (
                                                <>
                                                    <UserPlus size={18} />
                                                    Account Aanmaken & Accepteren
                                                </>
                                            )}
                                        </span>
                                    )}
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </main>

            <style jsx>{`
                .login-container {
                    min-height: 100vh; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center;
                    background-color: #030712; 
                    background-image: 
                        radial-gradient(ellipse at top, #111827, transparent),
                        radial-gradient(ellipse at bottom, #030712, transparent);
                    padding: 24px; 
                    position: relative; 
                    overflow: hidden;
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
                    color: #f8fafc;
                }
                
                .ambient-light {
                    position: absolute; 
                    border-radius: 50%; 
                    filter: blur(100px); 
                    opacity: 0.2;
                    animation: float 25s infinite alternate ease-in-out;
                    pointer-events: none;
                }
                
                .light-1 { 
                    width: 600px; 
                    height: 600px; 
                    background: #4f46e5; 
                    top: -200px; 
                    left: -200px; 
                }
                
                .light-2 { 
                    width: 500px; 
                    height: 500px; 
                    background: #7c3aed; 
                    bottom: -150px; 
                    right: -150px; 
                    animation-delay: -5s;
                }
                
                @keyframes float {
                    0% { transform: translate(0px, 0px) scale(1); }
                    33% { transform: translate(30px, -50px) scale(1.1); }
                    66% { transform: translate(-20px, 20px) scale(0.9); }
                    100% { transform: translate(0px, 0px) scale(1); }
                }
                
                .content-wrapper { 
                    z-index: 10; 
                    width: 100%; 
                    max-width: 440px; 
                    display: flex; 
                    flex-direction: column; 
                    gap: 32px; 
                    margin: 0 auto; 
                }
                
                .header { text-align: center; }
                
                .logo-box { 
                    display: inline-flex; 
                    padding: 14px; 
                    background: linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.2)); 
                    border: 1px solid rgba(99, 102, 241, 0.3);
                    border-radius: 18px; 
                    margin-bottom: 24px; 
                    color: #818cf8; 
                    box-shadow: 0 0 30px rgba(99, 102, 241, 0.15);
                }
                
                .header h1 { 
                    font-size: 2rem; 
                    font-weight: 800; 
                    margin: 0 0 8px 0; 
                    letter-spacing: -0.025em;
                    background: linear-gradient(180deg, #ffffff 0%, #a1a1aa 100%); 
                    -webkit-background-clip: text; 
                    -webkit-text-fill-color: transparent; 
                }
                
                .subtitle { 
                    color: #94a3b8; 
                    font-size: 1rem; 
                    margin: 0;
                }
                
                .subtitle strong {
                    color: #e2e8f0;
                    font-weight: 600;
                }
                
                .card-glass { 
                    background: rgba(15, 23, 42, 0.4); 
                    backdrop-filter: blur(20px); 
                    -webkit-backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.08); 
                    border-radius: 24px; 
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1); 
                    padding: 40px; 
                    position: relative;
                    overflow: hidden;
                }
                
                .card-glass::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 1px;
                    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent);
                }
                
                .form-header {
                    margin-bottom: 32px;
                }
                
                .form-header h2 { 
                    font-size: 1.25rem; 
                    font-weight: 700; 
                    margin: 0 0 8px 0; 
                    color: #f8fafc;
                }
                
                .form-header p { 
                    color: #94a3b8; 
                    font-size: 0.875rem; 
                    margin: 0; 
                    line-height: 1.5;
                }
                
                .form { 
                    display: flex; 
                    flex-direction: column; 
                    gap: 24px; 
                }
                
                .input-group { 
                    display: flex; 
                    flex-direction: column; 
                    gap: 8px; 
                }
                
                .label-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                label { 
                    font-size: 0.8125rem; 
                    font-weight: 600; 
                    color: #cbd5e1; 
                }
                
                .readonly-email {
                    display: flex; 
                    align-items: center; 
                    gap: 12px; 
                    padding: 14px 16px; 
                    background: rgba(255, 255, 255, 0.03); 
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 12px; 
                    color: #94a3b8;
                    font-size: 0.9375rem;
                }
                
                .text-muted {
                    color: #64748b;
                }
                
                input { 
                    background: rgba(15, 23, 42, 0.6); 
                    border: 1px solid rgba(255, 255, 255, 0.1); 
                    border-radius: 12px; 
                    padding: 14px 16px; 
                    color: white; 
                    font-size: 0.9375rem; 
                    transition: all 0.2s ease;
                    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
                }
                
                input:focus { 
                    outline: none; 
                    border-color: #6366f1; 
                    background: rgba(15, 23, 42, 0.9); 
                    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2), inset 0 2px 4px rgba(0, 0, 0, 0.1);
                }
                
                input::placeholder {
                    color: #475569;
                }
                
                .input-hint {
                    font-size: 0.75rem; 
                    color: #64748b;
                }
                
                .submit-btn { 
                    background: linear-gradient(135deg, #6366f1, #4f46e5);
                    color: white; 
                    border: none; 
                    border-radius: 12px; 
                    padding: 16px; 
                    font-size: 0.9375rem; 
                    font-weight: 600; 
                    cursor: pointer; 
                    transition: all 0.2s ease;
                    box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
                    margin-top: 8px;
                    position: relative;
                    overflow: hidden;
                }
                
                .submit-btn::after {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 50%;
                    background: linear-gradient(180deg, rgba(255, 255, 255, 0.15), transparent);
                }
                
                .submit-btn:hover:not(:disabled) { 
                    transform: translateY(-1px);
                    box-shadow: 0 6px 16px rgba(79, 70, 229, 0.4);
                    background: linear-gradient(135deg, #4f46e5, #4338ca);
                }
                
                .submit-btn:active:not(:disabled) {
                    transform: translateY(1px);
                    box-shadow: 0 2px 8px rgba(79, 70, 229, 0.3);
                }
                
                .submit-btn:disabled { 
                    opacity: 0.7; 
                    cursor: not-allowed; 
                    box-shadow: none;
                }
                
                .btn-content {
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    gap: 10px;
                    position: relative;
                    z-index: 2;
                }
                
                .error-message {
                    display: flex;
                    align-items: center;
                    color: #f87171; 
                    font-size: 0.875rem; 
                    padding: 12px 16px; 
                    background: rgba(239, 68, 68, 0.1); 
                    border: 1px solid rgba(239, 68, 68, 0.2);
                    border-radius: 10px; 
                    position: relative;
                }
                
                .error-indicator {
                    width: 4px;
                    height: calc(100% - 16px);
                    background: #ef4444;
                    position: absolute;
                    left: 0;
                    top: 8px;
                    border-radius: 0 4px 4px 0;
                }
                
                .success-state {
                    text-align: center; 
                    padding: 32px 16px;
                }
                
                .success-icon-wrapper {
                    width: 72px; 
                    height: 72px; 
                    border-radius: 36px;
                    background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.1)); 
                    color: #10b981;
                    display: flex; 
                    align-items: center; 
                    justify-content: center;
                    margin: 0 auto 24px;
                    box-shadow: 0 0 30px rgba(16, 185, 129, 0.15);
                    border: 1px solid rgba(16, 185, 129, 0.2);
                }
                
                .success-state h2 { 
                    font-size: 1.5rem; 
                    font-weight: 700; 
                    margin: 0 0 12px; 
                    color: #f8fafc; 
                }
                
                .success-state p { 
                    color: #94a3b8; 
                    margin: 0 0 32px;
                    line-height: 1.5;
                }
                
                .loading-bar {
                    height: 4px;
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 2px;
                    overflow: hidden;
                    width: 200px;
                    margin: 0 auto;
                }
                
                .loading-progress {
                    height: 100%;
                    width: 50%;
                    background: #10b981;
                    border-radius: 2px;
                    animation: loading 1.5s infinite ease-in-out;
                }
                
                @keyframes loading {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(200%); }
                }
                
                .spinner {
                    animation: spin 1s linear infinite;
                    height: 20px;
                    width: 20px;
                }
                
                .opacity-25 { opacity: 0.25; }
                .opacity-75 { opacity: 0.75; }
                
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
