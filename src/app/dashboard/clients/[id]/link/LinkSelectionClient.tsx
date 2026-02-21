"use client";

import { useState } from "react";
import { Building2, ArrowRight, Loader2, CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";

interface GoogleAccount {
    id: string;
    name: string;
    loginCustomerId?: string;
}

export default function LinkSelectionClient({
    clientId,
    sourceId,
    accounts
}: {
    clientId: string;
    sourceId: string;
    accounts: GoogleAccount[];
}) {
    const [linking, setLinking] = useState<string | null>(null);
    const [done, setDone] = useState(false);
    const router = useRouter();

    const handleLink = async (account: GoogleAccount) => {
        setLinking(account.id);
        try {
            const res = await fetch(`/api/data-sources/${sourceId}/link`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    externalId: account.id,
                    name: account.name,
                    loginCustomerId: account.loginCustomerId
                })
            });

            if (res.ok) {
                setDone(true);
                setTimeout(() => {
                    router.push(`/dashboard/clients/${clientId}?linked=success`);
                    router.refresh();
                }, 1500);
            }
        } catch (error) {
            console.error("Linking failed:", error);
            setLinking(null);
        }
    };

    if (done) {
        return (
            <div className="glass-card" style={{ padding: "48px", textAlign: "center" }}>
                <div style={{
                    width: "64px",
                    height: "64px",
                    borderRadius: "50%",
                    background: "rgba(16, 185, 129, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#10b981",
                    margin: "0 auto 20px"
                }}>
                    <CheckCircle size={32} />
                </div>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "8px" }}>Account Gekoppeld!</h2>
                <p style={{ color: "var(--color-text-secondary)", fontSize: "0.9rem" }}>
                    Je wordt nu teruggestuurd naar het dashboard...
                </p>
            </div>
        );
    }

    return (
        <div style={{ display: "grid", gap: "12px" }}>
            {accounts.map((acc) => (
                <button
                    key={acc.id}
                    onClick={() => handleLink(acc)}
                    disabled={linking !== null}
                    className="glass-card"
                    style={{
                        width: "100%",
                        padding: "20px",
                        display: "flex",
                        alignItems: "center",
                        gap: "16px",
                        textAlign: "left",
                        transition: "all 0.2s ease",
                        cursor: linking ? "not-allowed" : "pointer",
                        border: linking === acc.id ? "1px solid var(--color-primary)" : "1px solid rgba(255,255,255,0.05)",
                        background: linking === acc.id ? "rgba(99, 102, 241, 0.05)" : "rgba(255,255,255,0.03)"
                    }}
                >
                    <div style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "10px",
                        background: "rgba(99, 102, 241, 0.1)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#6366f1"
                    }}>
                        <Building2 size={20} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <h4 style={{ fontSize: "0.95rem", fontWeight: 600 }}>{acc.name}</h4>
                        <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>ID: {acc.id}</p>
                    </div>
                    {linking === acc.id ? (
                        <Loader2 size={18} className="animate-spin" color="var(--color-primary)" />
                    ) : (
                        <ArrowRight size={18} color="var(--color-text-muted)" />
                    )}
                </button>
            ))}

            {accounts.length === 0 && (
                <div className="glass-card" style={{ padding: "32px", textAlign: "center", color: "var(--color-text-muted)" }}>
                    Geen accounts gevonden voor deze koppeling.
                </div>
            )}
        </div>
    );
}
