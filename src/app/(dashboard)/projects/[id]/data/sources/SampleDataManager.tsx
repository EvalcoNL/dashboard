"use client";

import { useState, useEffect } from "react";
import { Database, Plus, Trash2, Loader2, CheckCircle2 } from "lucide-react";
import { useNotification } from "@/components/NotificationProvider";

export default function SampleDataManager({ projectId }: { projectId: string }) {
    const [status, setStatus] = useState<{ exists: boolean; count: number } | null>(null);
    const [loading, setLoading] = useState(false);
    const [actionType, setActionType] = useState<"seed" | "delete" | null>(null);
    const { confirm } = useNotification();

    useEffect(() => {
        checkStatus();
    }, [projectId]);

    const checkStatus = async () => {
        try {
            const res = await fetch(`/api/data-integration/sample?projectId=${projectId}`);
            const data = await res.json();
            if (data.success) setStatus({ exists: data.exists, count: data.count });
        } catch { /* ignore */ }
    };

    const seedData = async () => {
        setLoading(true);
        setActionType("seed");
        try {
            const res = await fetch("/api/data-integration/sample", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ projectId }),
            });
            const data = await res.json();
            if (data.success) {
                setStatus({ exists: true, count: data.count });
            }
        } finally {
            setLoading(false);
            setActionType(null);
        }
    };

    const deleteData = async () => {
        const confirmed = await confirm({
            title: "Sample data verwijderen",
            message: "Weet je zeker dat je alle sample data wilt verwijderen?",
            confirmLabel: "Ja, verwijderen",
            type: "danger",
        });
        if (!confirmed) return;
        setLoading(true);
        setActionType("delete");
        try {
            const res = await fetch(`/api/data-integration/sample?projectId=${projectId}`, { method: "DELETE" });
            const data = await res.json();
            if (data.success) {
                setStatus({ exists: false, count: 0 });
            }
        } finally {
            setLoading(false);
            setActionType(null);
        }
    };

    return (
        <div style={{
            padding: "20px",
            background: "var(--color-surface-elevated)",
            border: "1px solid var(--color-border)",
            borderRadius: "12px",
            marginBottom: "32px",
        }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{
                        padding: "8px",
                        background: "rgba(99, 102, 241, 0.1)",
                        borderRadius: "8px",
                        color: "#818cf8",
                    }}>
                        <Database size={20} />
                    </div>
                    <div>
                        <div style={{ fontWeight: 600, color: "var(--color-text-primary)" }}>
                            Sample Data (Google Ads)
                        </div>
                        <div style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>
                            {status?.exists
                                ? <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                    <CheckCircle2 size={14} style={{ color: "#10b981" }} />
                                    {status.count.toLocaleString()} records geladen — 30 dagen × 5 campagnes
                                </span>
                                : "Voeg demo data toe om de Data Explorer en Organize pagina\u0027s te testen"
                            }
                        </div>
                    </div>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                    {!status?.exists && (
                        <button
                            onClick={seedData}
                            disabled={loading}
                            style={{
                                display: "flex", alignItems: "center", gap: "8px",
                                padding: "8px 16px", borderRadius: "8px", border: "none",
                                background: "var(--color-brand)", color: "#fff",
                                fontWeight: 600, fontSize: "0.85rem",
                                cursor: loading ? "wait" : "pointer",
                                opacity: loading && actionType === "seed" ? 0.7 : 1,
                            }}
                        >
                            {loading && actionType === "seed"
                                ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                                : <Plus size={16} />
                            }
                            Sample Data Toevoegen
                        </button>
                    )}
                    {status?.exists && (
                        <button
                            onClick={deleteData}
                            disabled={loading}
                            style={{
                                display: "flex", alignItems: "center", gap: "8px",
                                padding: "8px 16px", borderRadius: "8px",
                                border: "1px solid rgba(239, 68, 68, 0.3)",
                                background: "rgba(239, 68, 68, 0.1)", color: "#ef4444",
                                fontWeight: 600, fontSize: "0.85rem",
                                cursor: loading ? "wait" : "pointer",
                                opacity: loading && actionType === "delete" ? 0.7 : 1,
                            }}
                        >
                            {loading && actionType === "delete"
                                ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                                : <Trash2 size={16} />
                            }
                            Sample Data Verwijderen
                        </button>
                    )}
                </div>
            </div>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
