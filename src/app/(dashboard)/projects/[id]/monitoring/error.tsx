"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

export default function MonitoringError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            minHeight: "50vh", padding: "32px"
        }}>
            <div style={{
                padding: "40px", textAlign: "center", maxWidth: "420px", width: "100%",
                borderRadius: "16px", background: "var(--color-surface-elevated)",
                border: "1px solid var(--color-border)"
            }}>
                <div style={{
                    width: "56px", height: "56px", borderRadius: "14px",
                    background: "rgba(239, 68, 68, 0.1)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    margin: "0 auto 20px", border: "1px solid rgba(239, 68, 68, 0.2)"
                }}>
                    <AlertTriangle size={24} color="#ef4444" />
                </div>
                <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "8px", color: "var(--color-text-primary)" }}>
                    Er is iets misgegaan
                </h2>
                <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem", marginBottom: "24px", lineHeight: 1.5 }}>
                    Deze sectie kon niet geladen worden. Probeer het opnieuw.
                </p>
                {process.env.NODE_ENV === "development" && error?.message && (
                    <div style={{
                        padding: "10px 14px", background: "rgba(239,68,68,0.05)",
                        border: "1px solid rgba(239,68,68,0.15)", borderRadius: "8px",
                        marginBottom: "20px", textAlign: "left", fontSize: "0.7rem",
                        color: "#f87171", fontFamily: "monospace", wordBreak: "break-word"
                    }}>
                        {error.message}
                    </div>
                )}
                <button onClick={reset} style={{
                    display: "inline-flex", alignItems: "center", gap: "8px",
                    padding: "10px 24px", background: "var(--color-brand)", color: "#fff",
                    border: "none", borderRadius: "10px", fontWeight: 600,
                    cursor: "pointer", fontSize: "0.85rem"
                }}>
                    <RefreshCw size={16} /> Opnieuw proberen
                </button>
            </div>
        </div>
    );
}
