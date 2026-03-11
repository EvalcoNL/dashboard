"use client";

import { AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function SettingsError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const params = useParams();
    const projectId = params?.id || "";

    return (
        <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "60vh",
            padding: "32px"
        }}>
            <div className="glass-card" style={{
                padding: "48px",
                textAlign: "center",
                maxWidth: "480px",
                width: "100%"
            }}>
                <div style={{
                    width: "64px",
                    height: "64px",
                    borderRadius: "16px",
                    background: "rgba(239, 68, 68, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 24px",
                    border: "1px solid rgba(239, 68, 68, 0.2)"
                }}>
                    <AlertTriangle size={28} color="#ef4444" />
                </div>

                <h2 style={{
                    fontSize: "1.25rem",
                    fontWeight: 700,
                    marginBottom: "8px",
                    color: "var(--color-text-primary)"
                }}>
                    Instellingen konden niet worden geladen
                </h2>

                <p style={{
                    color: "var(--color-text-muted)",
                    fontSize: "0.875rem",
                    marginBottom: "32px",
                    lineHeight: 1.6
                }}>
                    Er is een fout opgetreden bij het laden van de instellingen.
                </p>

                {process.env.NODE_ENV === "development" && error?.message && (
                    <div style={{
                        padding: "12px 16px",
                        background: "rgba(239, 68, 68, 0.05)",
                        border: "1px solid rgba(239, 68, 68, 0.15)",
                        borderRadius: "8px",
                        marginBottom: "24px",
                        textAlign: "left",
                        fontSize: "0.75rem",
                        color: "#f87171",
                        fontFamily: "monospace",
                        wordBreak: "break-word"
                    }}>
                        {error.message}
                    </div>
                )}

                <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                    <button
                        onClick={reset}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "10px 24px",
                            background: "var(--color-brand)",
                            color: "white",
                            border: "none",
                            borderRadius: "10px",
                            fontWeight: 600,
                            cursor: "pointer",
                            fontSize: "0.875rem"
                        }}
                    >
                        <RefreshCw size={16} />
                        Opnieuw Proberen
                    </button>

                    <Link href={`/projects/${projectId}`} style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "10px 24px",
                        background: "rgba(51, 65, 85, 0.3)",
                        color: "var(--color-text-primary)",
                        border: "1px solid var(--color-border)",
                        borderRadius: "10px",
                        fontWeight: 600,
                        textDecoration: "none",
                        fontSize: "0.875rem"
                    }}>
                        <ArrowLeft size={16} />
                        Terug
                    </Link>
                </div>
            </div>
        </div>
    );
}
