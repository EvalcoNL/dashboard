"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function MerchantSelectionClient({ clientId, sourceId }: { clientId: string, sourceId: string }) {
    const router = useRouter();
    const [accounts, setAccounts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchAccounts() {
            try {
                const res = await fetch(`/api/projects/${clientId}/data-sources/${sourceId}/merchant-accounts`);
                if (!res.ok) throw new Error("Kon accounts niet laden.");
                const data = await res.json();
                setAccounts(data.accounts || []);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
        fetchAccounts();
    }, [clientId, sourceId]);

    const handleSelect = async (accountId: string, name: string) => {
        try {
            const res = await fetch(`/api/projects/${clientId}/data-sources/${sourceId}/activate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ externalId: accountId, name: name })
            });
            if (!res.ok) throw new Error("Failed to activate source");
            router.push(`/dashboard/projects/${clientId}/data/sources`);
            router.refresh();
        } catch (err: any) {
            setError(err.message);
        }
    }

    if (loading) {
        return <div style={{ color: "var(--color-text-secondary)" }}>Accounts laden...</div>;
    }

    if (error) {
        return <div style={{ color: "#ef4444", padding: "16px", background: "rgba(239,68,68,0.1)", borderRadius: "8px" }}>
            {error}
        </div>;
    }

    if (accounts.length === 0) {
        return (
            <div style={{ padding: "32px", textAlign: "center", background: "var(--color-surface-elevated)", border: "1px dashed var(--color-border)", borderRadius: "12px", color: "var(--color-text-secondary)" }}>
                Geen Google Merchant Center accounts gevonden.
            </div>
        );
    }

    return (
        <div style={{ display: "grid", gap: "16px" }}>
            {accounts.map(account => (
                <button
                    key={account.id}
                    onClick={() => handleSelect(account.id, account.name)}
                    style={{
                        padding: "24px",
                        background: "var(--color-surface-elevated)",
                        border: "1px solid var(--color-border)",
                        borderRadius: "12px",
                        textAlign: "left",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        display: "flex",
                        alignItems: "center",
                        gap: "16px"
                    }}
                    className="account-card"
                >
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, color: "var(--color-text-primary)", fontSize: "1.1rem" }}>{account.name}</div>
                        <div style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>Account ID: {account.id}</div>
                    </div>
                </button>
            ))}
            <style jsx>{`
                .account-card:hover {
                    border-color: var(--color-brand);
                    transform: translateY(-2px);
                }
            `}</style>
        </div>
    );
}
