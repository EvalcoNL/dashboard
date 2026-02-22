"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Activity, Eye, EyeOff, AlertCircle, ShieldCheck, ChevronLeft, ArrowRight } from "lucide-react";

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
            console.log("Attempting sign in for:", email);
            const result = await signIn("credentials", {
                email,
                password,
                twoFactorToken: show2FA ? twoFactorToken : undefined,
                redirect: false,
            });

            console.log("SignIn result:", result);

            if (result?.error) {
                // Auth.js v5 returns the custom CredentialsSignin code in result.code,
                // while result.error is always "CredentialsSignin" for credential errors.
                const code = result.code?.toUpperCase() || "";
                console.log("SignIn error code:", code, "error:", result.error);

                if (code.includes("TWO_FACTOR_REQUIRED")) {
                    setShow2FA(true);
                    setError("");
                } else if (code.includes("INVALID_2FA_TOKEN")) {
                    setError("Ongeldige verificatiecode. Probeer het opnieuw.");
                } else if (result.error === "Configuration") {
                    setError("Serverconfiguratie fout. Neem contact op met de beheerder.");
                } else {
                    setError("Ongeldig e-mailadres of wachtwoord.");
                }
            } else if (result?.ok) {
                console.log("Login successful, redirecting to /dashboard");
                router.push("/dashboard");
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
        <div className="login-container">
            {/* Animated Background Blobs */}
            <div className="blob blob-1"></div>
            <div className="blob blob-2"></div>
            <div className="blob blob-3"></div>

            <main className="content-wrapper">
                <div className="header">
                    <div className="logo-box">
                        <Activity size={32} strokeWidth={2.5} />
                    </div>
                    <h1>Evalco Dashboard</h1>
                    <p>AI Performance Analysis Platform</p>
                </div>

                <div className="card glass">
                    {!show2FA ? (
                        <div className="form-section">
                            <h2 className="section-title">Welkom terug</h2>
                            <p className="section-subtitle">Voer je gegevens in om in te loggen</p>

                            <form onSubmit={handleSubmit} className="form">
                                <div className="input-group">
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

                                <div className="input-group">
                                    <div className="label-row">
                                        <label htmlFor="password">Wachtwoord</label>
                                        <a href="#" className="forgot-link">Vergeten?</a>
                                    </div>
                                    <div className="password-wrapper">
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
                                            Inloggen <ArrowRight size={18} />
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    ) : (
                        <div className="form-section animate-slide-up">
                            <button className="back-btn" onClick={() => setShow2FA(false)}>
                                <ChevronLeft size={18} /> Terug
                            </button>
                            <div className="icon-badge">
                                <ShieldCheck size={28} />
                            </div>
                            <h2 className="section-title">2FA Verificatie</h2>
                            <p className="section-subtitle">Voer de 6-cijferige code in uit je authenticator app</p>

                            <form onSubmit={handleSubmit} className="form">
                                <div className="input-group">
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        placeholder="000 000"
                                        maxLength={6}
                                        value={twoFactorToken}
                                        onChange={(e) => setTwoFactorToken(e.target.value.replace(/\D/g, ""))}
                                        required
                                        autoFocus
                                        className="otp-input"
                                    />
                                </div>

                                {error && <ErrorMessage message={error} />}

                                <button type="submit" className="submit-btn" disabled={loading}>
                                    {loading ? <Spinner /> : "Verifiëren"}
                                </button>
                            </form>
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

                /* Animated Blobs */
                .blob {
                    position: absolute;
                    border-radius: 50%;
                    filter: blur(80px);
                    z-index: 0;
                    opacity: 0.15;
                    animation: float 20s infinite alternate;
                }
                .blob-1 {
                    width: 500px;
                    height: 500px;
                    background: #6366f1;
                    top: -100px;
                    left: -100px;
                }
                .blob-2 {
                    width: 400px;
                    height: 400px;
                    background: #a855f7;
                    bottom: -50px;
                    right: -50px;
                    animation-delay: -5s;
                }
                .blob-3 {
                    width: 300px;
                    height: 300px;
                    background: #2dd4bf;
                    top: 40%;
                    left: 60%;
                    animation-delay: -10s;
                }

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

                .header {
                    text-align: center;
                }

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
                    letter-spacing: -0.025em;
                    margin-bottom: 4px;
                    background: linear-gradient(to right, #f8fafc, #94a3b8);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }

                .header p {
                    color: #94a3b8;
                    font-size: 0.9375rem;
                }

                .glass {
                    background: rgba(15, 23, 42, 0.6);
                    backdrop-filter: blur(16px);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 24px;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                }

                .card {
                    padding: 40px;
                }

                .section-title {
                    font-size: 1.25rem;
                    font-weight: 700;
                    margin-bottom: 6px;
                }

                .section-subtitle {
                    color: #94a3b8;
                    font-size: 0.875rem;
                    margin-bottom: 32px;
                }

                .form {
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
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
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .forgot-link {
                    font-size: 0.75rem;
                    color: #6366f1;
                    text-decoration: none;
                }
                .forgot-link:hover { text-decoration: underline; }

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

                .password-wrapper {
                    position: relative;
                }

                .password-wrapper input {
                    width: 100%;
                    padding-right: 48px;
                }

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

                .otp-input {
                    text-align: center;
                    letter-spacing: 0.5em;
                    font-size: 1.5rem !important;
                    font-weight: 800;
                    height: 64px;
                }

                .icon-badge {
                    display: inline-flex;
                    padding: 16px;
                    background: rgba(99, 102, 241, 0.1);
                    color: #6366f1;
                    border-radius: 50%;
                    margin-bottom: 24px;
                }

                .back-btn {
                    background: none;
                    border: none;
                    color: #94a3b8;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    font-size: 0.875rem;
                    cursor: pointer;
                    margin-bottom: 24px;
                    padding: 0;
                }
                .back-btn:hover { color: #f8fafc; }

                .footer {
                    text-align: center;
                    color: #475569;
                    font-size: 0.75rem;
                }

                .animate-slide-up {
                    animation: slide-up 0.4s ease-out;
                }

                @keyframes slide-up {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                .spinner {
                    animation: spin 1s linear infinite;
                }
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
