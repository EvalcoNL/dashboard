"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
    Database, Plus, Loader2, ChevronDown, ChevronRight,
    Layers, BarChart3, Link2, RefreshCw
} from "lucide-react";
import { useNotification } from "@/components/NotificationProvider";

interface DatasetInfo {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    isSystem: boolean;
    config: { selectedDimensions?: string[]; selectedMetrics?: string[] } | null;
    connections: { id: string; name: string | null; connectorSlug: string; connectorName: string }[];
    recordCount: number;
    dimensionCount: number;
    metricCount: number;
    createdAt: string;
}

export default function DatasetsClient() {
    const params = useParams();
    const projectId = params.id as string;

    const [datasets, setDatasets] = useState<DatasetInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [expandedDataset, setExpandedDataset] = useState<string | null>(null);
    const { showToast } = useNotification();

    useEffect(() => { loadDatasets(); }, []);

    const loadDatasets = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/data-integration/datasets?clientId=${projectId}`);
            const data = await res.json();
            if (data.success) setDatasets(data.datasets);
        } finally { setLoading(false); }
    };

    const createSystemDatasets = async () => {
        setCreating(true);
        try {
            const res = await fetch("/api/data-integration/datasets", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ clientId: projectId }),
            });
            const data = await res.json();
            if (!data.success) {
                showToast("error", data.error || "Kon datasets niet aanmaken");
                return;
            }
            await loadDatasets();
        } finally { setCreating(false); }
    };

    const slugIcon: Record<string, string> = {
        "paid-performance": "💰",
        "cross-channel": "🔗",
        "seo-performance": "🔍",
        "social-performance": "📱",
        "ecommerce-performance": "🛒",
    };

    if (loading) {
        return <div style={{ maxWidth: 1200, margin: "0 auto", padding: 32, display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
            <Loader2 size={32} style={{ animation: "spin 1s linear infinite", color: "var(--color-brand)" }} />
        </div>;
    }

    return (
        <div className="animate-fade-in" style={{ maxWidth: 1200, margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                <div>
                    <h1 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "4px", display: "flex", alignItems: "center", gap: "12px" }}>
                        <Database size={28} /> Datasets
                    </h1>
                    <p style={{ color: "var(--color-text-muted)", fontSize: "0.95rem" }}>
                        Logische groeperingen van data voor dashboard rapportages. {datasets.length} datasets beschikbaar.
                    </p>
                </div>
                <button onClick={createSystemDatasets} disabled={creating} style={{
                    display: "flex", alignItems: "center", gap: "8px",
                    padding: "10px 20px", background: "var(--color-brand)", color: "white",
                    border: "none", borderRadius: "8px", fontWeight: 600,
                    cursor: creating ? "wait" : "pointer", opacity: creating ? 0.7 : 1,
                }}>
                    {creating ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Plus size={16} />}
                    Systeem Datasets Aanmaken
                </button>
            </div>

            {/* Summary cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "32px" }}>
                <div className="glass-card" style={{ padding: "20px", display: "flex", alignItems: "center", gap: "16px" }}>
                    <div style={{ padding: "10px", background: "rgba(99, 102, 241, 0.1)", borderRadius: "10px", color: "#818cf8" }}><Layers size={22} /></div>
                    <div>
                        <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{datasets.length}</div>
                        <div style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>Datasets</div>
                    </div>
                </div>
                <div className="glass-card" style={{ padding: "20px", display: "flex", alignItems: "center", gap: "16px" }}>
                    <div style={{ padding: "10px", background: "rgba(16, 185, 129, 0.1)", borderRadius: "10px", color: "#10b981" }}><Link2 size={22} /></div>
                    <div>
                        <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{new Set(datasets.flatMap(d => d.connections.map(c => c.id))).size}</div>
                        <div style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>Gekoppelde bronnen</div>
                    </div>
                </div>
                <div className="glass-card" style={{ padding: "20px", display: "flex", alignItems: "center", gap: "16px" }}>
                    <div style={{ padding: "10px", background: "rgba(245, 158, 11, 0.1)", borderRadius: "10px", color: "#f59e0b" }}><BarChart3 size={22} /></div>
                    <div>
                        <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{datasets.reduce((s, d) => s + d.recordCount, 0).toLocaleString()}</div>
                        <div style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>Totaal records</div>
                    </div>
                </div>
            </div>

            {/* Dataset cards */}
            {datasets.length === 0 ? (
                <div className="glass-card" style={{ padding: "64px", textAlign: "center", color: "var(--color-text-muted)" }}>
                    Geen datasets gevonden. Voeg eerst sample data toe en klik daarna op &quot;Systeem Datasets Aanmaken&quot;.
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {datasets.map(ds => (
                        <div key={ds.id} className="glass-card" style={{ overflow: "hidden" }}>
                            <button onClick={() => setExpandedDataset(expandedDataset === ds.id ? null : ds.id)} style={{
                                width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                                padding: "20px 24px", background: "none", border: "none", cursor: "pointer",
                                color: "var(--color-text-primary)", textAlign: "left",
                            }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "16px", flex: 1 }}>
                                    <span style={{ fontSize: "1.5rem" }}>{slugIcon[ds.slug] || "📦"}</span>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: "1.05rem", marginBottom: "2px" }}>{ds.name}</div>
                                        <div style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>{ds.description}</div>
                                    </div>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                                    <div style={{ textAlign: "center" }}>
                                        <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>{ds.connections.length}</div>
                                        <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", textTransform: "uppercase" }}>Bronnen</div>
                                    </div>
                                    <div style={{ textAlign: "center" }}>
                                        <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>{ds.recordCount.toLocaleString()}</div>
                                        <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", textTransform: "uppercase" }}>Records</div>
                                    </div>
                                    {ds.isSystem && (
                                        <span style={{ padding: "2px 8px", borderRadius: "6px", fontSize: "0.7rem", fontWeight: 600, background: "rgba(99, 102, 241, 0.1)", color: "#818cf8" }}>SYSTEEM</span>
                                    )}
                                    {expandedDataset === ds.id ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                </div>
                            </button>

                            {expandedDataset === ds.id && (
                                <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "20px 24px" }}>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                                        <div>
                                            <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", marginBottom: "8px" }}>Dimensies</div>
                                            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                                                {(ds.config?.selectedDimensions || []).map(d => (
                                                    <span key={d} style={{ padding: "4px 10px", borderRadius: "6px", fontSize: "0.8rem", background: "rgba(99, 102, 241, 0.1)", color: "#818cf8" }}>{d}</span>
                                                ))}
                                                {!(ds.config?.selectedDimensions?.length) && <span style={{ color: "var(--color-text-muted)", fontSize: "0.85rem", fontStyle: "italic" }}>Geen dimensies geconfigureerd</span>}
                                            </div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", marginBottom: "8px" }}>Metrics</div>
                                            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                                                {(ds.config?.selectedMetrics || []).map(m => (
                                                    <span key={m} style={{ padding: "4px 10px", borderRadius: "6px", fontSize: "0.8rem", background: "rgba(16, 185, 129, 0.1)", color: "#10b981" }}>{m}</span>
                                                ))}
                                                {!(ds.config?.selectedMetrics?.length) && <span style={{ color: "var(--color-text-muted)", fontSize: "0.85rem", fontStyle: "italic" }}>Geen metrics geconfigureerd</span>}
                                            </div>
                                        </div>
                                    </div>
                                    {ds.connections.length > 0 && (
                                        <div style={{ marginTop: "16px" }}>
                                            <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", marginBottom: "8px" }}>Gekoppelde Bronnen</div>
                                            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                                                {ds.connections.map(c => (
                                                    <span key={c.id} style={{ padding: "6px 12px", borderRadius: "8px", fontSize: "0.85rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                                                        {c.connectorName} {c.name && c.name !== "__sample__" ? `(${c.name})` : ""}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
