"use client";

import { signOut } from "next-auth/react";
import { CheckCircle2 } from "lucide-react";

export default function TwoFactorSuccess() {
    return (
        <div style={{ textAlign: "center" }}>
            <div style={{
                width: "64px",
                height: "64px",
                borderRadius: "16px",
                background: "rgba(16, 185, 129, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#10b981",
                margin: "0 auto 16px"
            }}>
                <CheckCircle2 size={32} />
            </div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "8px" }}>
                2FA is ingeschakeld!
            </h1>
            <p style={{
                color: "var(--color-text-secondary)",
                fontSize: "0.9rem",
                maxWidth: "400px",
                margin: "0 auto 24px"
            }}>
                Twee-factor authenticatie is succesvol ingesteld. Log opnieuw in om je sessie te vernieuwen.
            </p>
            <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                style={{
                    padding: "12px 32px",
                    background: "var(--color-brand)",
                    color: "white",
                    border: "none",
                    borderRadius: "10px",
                    fontSize: "0.95rem",
                    fontWeight: 600,
                    cursor: "pointer",
                }}
            >
                Opnieuw inloggen
            </button>
        </div>
    );
}
