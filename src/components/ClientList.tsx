"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Users, Plus, ExternalLink, Trash2, Edit2, Target } from "lucide-react";

interface ClientItem {
    id: string;
    name: string;
    industryType: string;
    targetType: string;
    targetValue: unknown;
    tolerancePct: number;
    currency: string;
    dataSources: { id: string }[];
    _count: { campaignMetrics: number };
}

export default function ClientList({
    clients,
    userRole,
}: {
    clients: ClientItem[];
    userRole: string;
}) {
    const router = useRouter();
    const isAdmin = userRole === "ADMIN";

    const handleDelete = async (clientId: string, clientName: string) => {
        if (!confirm(`Weet je zeker dat je "${clientName}" wilt verwijderen? Dit kan niet ongedaan worden gemaakt.`)) return;

        const res = await fetch(`/api/clients/${clientId}`, { method: "DELETE" });
        if (res.ok) {
            router.refresh();
        } else {
            alert("Fout bij verwijderen. Probeer het opnieuw.");
        }
    };

    return (
        <div className="animate-fade-in">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "32px" }}>
                <div>
                    <h1 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "4px" }}>Klanten</h1>
                    <p style={{ color: "var(--color-text-secondary)", fontSize: "0.9rem" }}>
                        Beheer je klanten en hun targets
                    </p>
                </div>
                {isAdmin && (
                    <Link href="/dashboard/clients/new" className="btn btn-primary" style={{ textDecoration: "none" }}>
                        <Plus size={18} /> Nieuwe Klant
                    </Link>
                )}
            </div>

            {clients.length === 0 ? (
                <div className="glass-card" style={{ padding: "48px", textAlign: "center", color: "var(--color-text-muted)" }}>
                    <Users size={48} style={{ marginBottom: "16px", opacity: 0.5 }} />
                    <p>Nog geen klanten. Voeg je eerste klant toe om te beginnen.</p>
                </div>
            ) : (
                <div className="glass-card" style={{ overflow: "hidden" }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Klant</th>
                                <th>Type</th>
                                <th>Target</th>
                                <th>Tolerance</th>
                                <th>Google Ads</th>
                                <th>Data Punten</th>
                                {isAdmin && <th style={{ textAlign: "right" }}>Acties</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {clients.map((client) => (
                                <tr key={client.id}>
                                    <td>
                                        <Link
                                            href={`/dashboard/clients/${client.id}`}
                                            style={{
                                                color: "var(--color-text-primary)",
                                                textDecoration: "none",
                                                fontWeight: 600,
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "8px",
                                            }}
                                        >
                                            {client.name}
                                            <ExternalLink size={12} style={{ color: "var(--color-text-muted)" }} />
                                        </Link>
                                    </td>
                                    <td>
                                        <span
                                            style={{
                                                fontSize: "0.75rem",
                                                padding: "2px 8px",
                                                background: client.industryType === "ECOMMERCE"
                                                    ? "rgba(139, 92, 246, 0.1)"
                                                    : "rgba(99, 102, 241, 0.1)",
                                                borderRadius: "6px",
                                                color: client.industryType === "ECOMMERCE" ? "#a78bfa" : "#818cf8",
                                            }}
                                        >
                                            {client.industryType}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                            <Target size={14} color="var(--color-text-muted)" />
                                            <span style={{ fontWeight: 500 }}>
                                                {client.targetType} {Number(client.targetValue).toFixed(2)}
                                            </span>
                                        </div>
                                    </td>
                                    <td style={{ color: "var(--color-text-secondary)" }}>
                                        ±{client.tolerancePct}%
                                    </td>
                                    <td>
                                        {client.dataSources.length > 0 ? (
                                            <span style={{ color: "#10b981", display: "flex", alignItems: "center", gap: "4px", fontSize: "0.85rem" }}>
                                                ● Gekoppeld ({client.dataSources.length})
                                            </span>
                                        ) : (
                                            <span style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}>
                                                Niet gekoppeld
                                            </span>
                                        )}
                                    </td>
                                    <td style={{ color: "var(--color-text-secondary)" }}>
                                        {client._count.campaignMetrics.toLocaleString()}
                                    </td>
                                    {isAdmin && (
                                        <td style={{ textAlign: "right" }}>
                                            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                                                <Link
                                                    href={`/dashboard/clients/${client.id}/edit`}
                                                    className="btn btn-secondary btn-sm"
                                                    style={{ textDecoration: "none" }}
                                                >
                                                    <Edit2 size={14} />
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(client.id, client.name)}
                                                    className="btn btn-danger btn-sm"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
