"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface BusinessAccount {
    id: string;
    name: string;
    type: string;
}

export default function BusinessSelectionClient({
    clientId,
    sourceId,
    accounts,
}: {
    clientId: string;
    sourceId: string;
    accounts: BusinessAccount[];
}) {
    const router = useRouter();
    const [selecting, setSelecting] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleSelect = async (account: BusinessAccount) => {
        setSelecting(account.id);
        setError(null);
        try {
            const res = await fetch(`/api/projects/${clientId}/data-sources/${sourceId}/activate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    externalId: account.id,
                    name: account.name || `Google Business Profile (${account.id})`,
                }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || "Failed to activate source");
            }
            router.push(`/dashboard/projects/${clientId}/data/sources`);
            router.refresh();
        } catch (err: any) {
            setError(err.message);
            setSelecting(null);
        }
    };

    if (accounts.length === 0) {
        return (
            <div style={{
                padding: "32px", textAlign: "center",
                background: "var(--color-surface-elevated)",
                border: "1px dashed var(--color-border)",
                borderRadius: "12px", color: "var(--color-text-secondary)",
            }}>
                Geen Google Business Profile accounts gevonden.
            </div>
        );
    }

    return (
        <div style={{ display: "grid", gap: "16px" }}>
            {error && (
                <div style={{
                    color: "#ef4444", padding: "16px",
                    background: "rgba(239,68,68,0.1)", borderRadius: "8px",
                }}>
                    {error}
                </div>
            )}
            {accounts.map((account) => (
                <button
                    key={account.id}
                    onClick={() => handleSelect(account)}
                    disabled={selecting !== null}
                    style={{
                        padding: "24px",
                        background: "var(--color-surface-elevated)",
                        border: `1px solid ${selecting === account.id ? "var(--color-brand)" : "var(--color-border)"}`,
                        borderRadius: "12px",
                        textAlign: "left",
                        cursor: selecting ? "wait" : "pointer",
                        transition: "all 0.2s ease",
                        display: "flex",
                        alignItems: "center",
                        gap: "16px",
                        opacity: selecting && selecting !== account.id ? 0.5 : 1,
                    }}
                    className="account-card"
                >
                    <div style={{
                        width: "44px", height: "44px", borderRadius: "10px",
                        background: "linear-gradient(135deg, #4285f4, #ea4335)",
                        color: "white", display: "flex", alignItems: "center",
                        justifyContent: "center", fontSize: "0.65rem", fontWeight: 800,
                        flexShrink: 0,
                    }}>
                        GBP
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{
                            fontWeight: 600, color: "var(--color-text-primary)",
                            fontSize: "1.1rem",
                        }}>
                            {account.name}
                        </div>
                        <div style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>
                            Account ID: {account.id} · {account.type === "PERSONAL" ? "Persoonlijk" : account.type === "LOCATION_GROUP" ? "Locatiegroep" : account.type}
                        </div>
                    </div>
                    {selecting === account.id && (
                        <div style={{
                            fontSize: "0.8rem", color: "var(--color-brand)", fontWeight: 600,
                        }}>
                            Koppelen...
                        </div>
                    )}
                </button>
            ))}
            <style jsx>{`
                .account-card:hover:not(:disabled) {
                    border-color: var(--color-brand);
                    transform: translateY(-2px);
                }
            `}</style>
        </div>
    );
}
