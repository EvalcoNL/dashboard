"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    LayoutDashboard, Plus, Trash2, Copy, Clock, BarChart3,
    Loader2, TrendingUp, ShoppingCart, Search as SearchIcon, Megaphone, Target, Monitor,
} from "lucide-react";
import { useNotification } from "@/components/NotificationProvider";

interface DashboardItem {
    id: string;
    name: string;
    description: string | null;
    widgetCount: number;
    createdAt: string;
    updatedAt: string;
}

const TEMPLATES = [
    { id: "performance", name: "Performance Dashboard", desc: "Kosten, clicks, conversies en campagne overzicht", icon: TrendingUp, color: "#6366f1" },
    { id: "ecommerce", name: "E-commerce Dashboard", desc: "Omzet, ROAS, en conversie analyse", icon: ShoppingCart, color: "#10b981" },
    { id: "seo", name: "Analytics Dashboard", desc: "Sessies, gebruikers en pagina-statistieken", icon: BarChart3, color: "#f59e0b" },
    { id: "google-ads", name: "Google Ads", desc: "Spend, conversies, ROAS en campagne performance", icon: Megaphone, color: "#4285f4" },
    { id: "meta-ads", name: "Meta Ads", desc: "Impressies, clicks, kosten en campagne overzicht", icon: Target, color: "#0668E1" },
    { id: "microsoft-ads", name: "Microsoft Ads", desc: "Spend, clicks, conversies en CPC analyse", icon: Monitor, color: "#00B7C3" },
];

export default function DashboardsOverviewClient() {
    const params = useParams();
    const router = useRouter();
    const projectId = params.id as string;
    const { confirm, showToast } = useNotification();

    const [dashboards, setDashboards] = useState<DashboardItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);

    useEffect(() => { loadDashboards(); }, []);

    const loadDashboards = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/dashboards?projectId=${projectId}`);
            const data = await res.json();
            if (data.success) setDashboards(data.dashboards || []);
        } finally { setLoading(false); }
    };

    const createDashboard = async (name: string, templateId?: string) => {
        setCreating(true);
        try {
            const res = await fetch("/api/dashboards", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ projectId, name, templateId }),
            });
            const data = await res.json();
            if (data.success) {
                router.push(`/projects/${projectId}/reports/dashboards/${data.dashboard.id}`);
            }
        } finally { setCreating(false); }
    };

    const deleteDashboard = async (id: string, name: string) => {
        const ok = await confirm({
            title: "Dashboard verwijderen",
            message: `Weet je zeker dat je "${name}" wilt verwijderen? Dit kan niet ongedaan worden gemaakt.`,
            type: "danger",
        });
        if (!ok) return;
        await fetch(`/api/dashboards/${id}`, { method: "DELETE" });
        showToast("success", "Dashboard verwijderd");
        loadDashboards();
    };

    const duplicateDashboard = async (id: string) => {
        // Load existing, then create new with same widgets
        const res = await fetch(`/api/dashboards/${id}`);
        const data = await res.json();
        if (!data.success) return;

        const createRes = await fetch("/api/dashboards", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ projectId, name: `${data.dashboard.name} (kopie)` }),
        });
        const newDb = await createRes.json();
        if (!newDb.success) return;

        // Copy widgets
        if (data.dashboard.widgets?.length > 0) {
            await fetch(`/api/dashboards/${newDb.dashboard.id}/widgets`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: data.dashboard.widgets[0].type,
                    title: data.dashboard.widgets[0].title,
                    position: data.dashboard.widgets[0].position,
                    config: data.dashboard.widgets[0].config,
                }),
            });
            // Bulk copy remaining
            for (let i = 1; i < data.dashboard.widgets.length; i++) {
                const w = data.dashboard.widgets[i];
                await fetch(`/api/dashboards/${newDb.dashboard.id}/widgets`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ type: w.type, title: w.title, position: w.position, config: w.config }),
                });
            }
        }

        showToast("success", "Dashboard gedupliceerd");
        loadDashboards();
    };

    if (loading) {
        return (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
                <Loader2 size={32} style={{ animation: "spin 1s linear infinite", color: "var(--color-brand)" }} />
            </div>
        );
    }

    return (
        <div className="animate-fade-in" style={{ maxWidth: 1200, margin: "0 auto" }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
                <div>
                    <h1 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "4px", display: "flex", alignItems: "center", gap: "12px" }}>
                        <LayoutDashboard size={28} /> Dashboards
                    </h1>
                    <p style={{ color: "var(--color-text-muted)", fontSize: "0.95rem" }}>
                        Maak en beheer custom dashboards met je eigen data visualisaties.
                    </p>
                </div>
                <button
                    onClick={() => createDashboard("Nieuw Dashboard")}
                    disabled={creating}
                    style={{
                        display: "flex", alignItems: "center", gap: "8px",
                        padding: "10px 20px", background: "var(--color-brand)", color: "#fff",
                        border: "none", borderRadius: "8px", fontWeight: 600, cursor: "pointer",
                        opacity: creating ? 0.7 : 1,
                    }}
                >
                    {creating ? <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> : <Plus size={18} />}
                    Nieuw Dashboard
                </button>
            </div>

            {/* Existing Dashboards Grid */}
            {dashboards.length > 0 && (
                <div style={{ marginBottom: "40px" }}>
                    <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "16px", color: "var(--color-text-secondary)" }}>
                        Mijn Dashboards
                    </h2>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
                        {dashboards.map(db => (
                            <div
                                key={db.id}
                                style={{
                                    borderRadius: "12px", border: "1px solid var(--color-border)",
                                    background: "var(--color-surface-elevated)", overflow: "hidden",
                                    cursor: "pointer", transition: "all 0.2s ease",
                                }}
                                className="dashboard-card"
                                onClick={() => router.push(`/projects/${projectId}/reports/dashboards/${db.id}`)}
                            >
                                {/* Card Header */}
                                <div style={{ padding: "20px 20px 12px" }}>
                                    <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "4px" }}>{db.name}</h3>
                                    {db.description && (
                                        <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", margin: 0 }}>{db.description}</p>
                                    )}
                                </div>
                                {/* Card Footer */}
                                <div style={{
                                    display: "flex", justifyContent: "space-between", alignItems: "center",
                                    padding: "12px 20px", borderTop: "1px solid rgba(255,255,255,0.04)",
                                    background: "rgba(255,255,255,0.02)",
                                }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "16px", fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                                        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                            <BarChart3 size={12} /> {db.widgetCount} widgets
                                        </span>
                                        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                            <Clock size={12} /> {new Date(db.updatedAt).toLocaleDateString("nl-NL")}
                                        </span>
                                    </div>
                                    <div style={{ display: "flex", gap: "4px" }} onClick={e => e.stopPropagation()}>
                                        <button onClick={() => duplicateDashboard(db.id)} title="Dupliceren" style={iconBtn}>
                                            <Copy size={14} />
                                        </button>
                                        <button onClick={() => deleteDashboard(db.id, db.name)} title="Verwijderen" style={{ ...iconBtn, color: "#ef4444" }}>
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Template Gallery */}
            <div>
                <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "16px", color: "var(--color-text-secondary)" }}>
                    Template Gallery
                </h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
                    {TEMPLATES.map(tmpl => {
                        const Icon = tmpl.icon;
                        return (
                            <button
                                key={tmpl.id}
                                onClick={() => createDashboard(tmpl.name, tmpl.id)}
                                disabled={creating}
                                className="template-card"
                                style={{
                                    display: "flex", alignItems: "center", gap: "16px",
                                    padding: "20px", borderRadius: "12px",
                                    border: "1px solid var(--color-border)", background: "var(--color-surface-elevated)",
                                    cursor: "pointer", textAlign: "left", transition: "all 0.2s ease",
                                    color: "var(--color-text-primary)",
                                }}
                            >
                                <div style={{
                                    width: "48px", height: "48px", borderRadius: "12px",
                                    background: `${tmpl.color}20`, display: "flex",
                                    alignItems: "center", justifyContent: "center",
                                    color: tmpl.color, flexShrink: 0,
                                }}>
                                    <Icon size={24} />
                                </div>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "2px" }}>{tmpl.name}</div>
                                    <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>{tmpl.desc}</div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Empty State */}
            {dashboards.length === 0 && (
                <div style={{
                    textAlign: "center", padding: "48px", marginTop: "24px",
                    borderRadius: "12px", border: "2px dashed var(--color-border)",
                    color: "var(--color-text-muted)",
                }}>
                    <LayoutDashboard size={48} style={{ opacity: 0.3, marginBottom: "16px" }} />
                    <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "8px", color: "var(--color-text-primary)" }}>
                        Nog geen dashboards
                    </h3>
                    <p style={{ fontSize: "0.85rem", marginBottom: "20px" }}>
                        Maak je eerste dashboard aan of start vanuit een template.
                    </p>
                </div>
            )}

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .dashboard-card:hover { border-color: var(--color-brand); transform: translateY(-2px); box-shadow: 0 4px 20px rgba(0,0,0,0.2); }
                .template-card:hover { border-color: var(--color-brand); background: rgba(99,102,241,0.04); }
            `}</style>
        </div>
    );
}

const iconBtn: React.CSSProperties = {
    padding: "6px", background: "rgba(255,255,255,0.05)", border: "none",
    borderRadius: "6px", color: "var(--color-text-muted)", cursor: "pointer",
};
