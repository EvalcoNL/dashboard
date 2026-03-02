"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import {
    Hash, Search, Filter,
    Copy, Plus, Edit2, Trash2, Check, Loader2, Save, Calculator, X,
    Clock, Database, Settings
} from "lucide-react";
import { useNotification } from "@/components/NotificationProvider";

// ─── Types ───

interface MetricDef {
    id: string;
    slug: string;
    name: string;
    dataType: string;
    aggregationType: string;
    description: string | null;
    category?: string;
    isDefault: boolean;
    connectorId: string | null;
    connector: { slug: string; name: string } | null;
    source: 'imported' | 'builtin' | 'custom';
    hasData?: boolean;
}

interface DerivedMetricDef {
    id: string;
    slug: string;
    name: string;
    formula: string;
    outputType: string;
    description: string | null;
    connectorId: string | null;
    connector: { slug: string; name: string } | null;
    source: 'builtin' | 'custom';
}

type TabType = 'custom' | 'imported' | 'builtin';

// ─── Component ───

export default function MetricsClient() {
    const params = useParams();
    const projectId = params.id as string;

    // Data
    const [imported, setImported] = useState<MetricDef[]>([]);
    const [custom, setCustom] = useState<MetricDef[]>([]);
    const [builtin, setBuiltin] = useState<MetricDef[]>([]);

    const [derivedCustom, setDerivedCustom] = useState<DerivedMetricDef[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterDataType, setFilterDataType] = useState<string>("all");
    const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
    const [activeTab, setActiveTab] = useState<TabType>("custom");
    const [counts, setCounts] = useState({ imported: 0, custom: 0, builtin: 0 });

    // Sidebar state
    const [showSidebar, setShowSidebar] = useState(false);
    const [sidebarType, setSidebarType] = useState<"base" | "derived">("base");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({ slug: "", name: "", dataType: "NUMBER", aggregationType: "SUM", formula: "", outputType: "NUMBER", description: "" });
    const [saving, setSaving] = useState(false);
    const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
    const { confirm, showToast } = useNotification();

    useEffect(() => { loadMetrics(); }, []);

    const loadMetrics = async () => {
        setLoading(true);
        try {
            const [metRes, fieldsRes] = await Promise.all([
                fetch("/api/data-integration/metrics"),
                fetch(`/api/data-integration/explorer/fields?clientId=${projectId}`),
            ]);
            const data = await metRes.json();
            const fieldsData = await fieldsRes.json();

            // Build hasData map from explorer fields API
            const hdMap = new Map<string, boolean>();
            for (const f of [...(fieldsData.dimensions || []), ...(fieldsData.metrics || [])]) {
                hdMap.set(f.slug, f.hasData ?? true);
            }

            if (data.success) {
                setImported((data.imported || []).map((m: MetricDef) => ({ ...m, hasData: hdMap.get(m.slug) ?? true })));
                setCustom((data.custom || []).map((m: MetricDef) => ({ ...m, hasData: hdMap.get(m.slug) ?? true })));
                setBuiltin((data.builtin || []).map((m: MetricDef) => ({ ...m, hasData: true })));
                setDerivedCustom(data.derivedCustom || []);
                setCounts(data.counts || { imported: 0, custom: 0, builtin: 0 });
            }
        } finally { setLoading(false); }
    };

    // ─── Filtering ───

    const filterList = <T extends { name: string; slug: string; dataType?: string; outputType?: string; hasData?: boolean }>(list: T[]) =>
        list.filter(m => {
            const matchesSearch = !searchQuery ||
                m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                m.slug.toLowerCase().includes(searchQuery.toLowerCase());
            const type = ('outputType' in m ? m.outputType : m.dataType) || '';
            const matchesType = filterDataType === "all" || type === filterDataType;
            const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? m.hasData !== false : m.hasData === false);
            return matchesSearch && matchesType && matchesStatus;
        });

    const filteredImported = useMemo(() => filterList(imported), [imported, searchQuery, filterDataType, statusFilter]);
    const filteredCustom = useMemo(() => filterList(custom), [custom, searchQuery, filterDataType, statusFilter]);
    const filteredBuiltin = useMemo(() => filterList(builtin), [builtin, searchQuery, filterDataType, statusFilter]);

    const filteredDerivedCustom = useMemo(() => filterList(derivedCustom), [derivedCustom, searchQuery, filterDataType, statusFilter]);

    // ─── Actions ───

    const openCreate = (type: "base" | "derived") => {
        setSidebarType(type);
        setEditingId(null);
        setFormData({ slug: "", name: "", dataType: "NUMBER", aggregationType: "SUM", formula: "", outputType: "NUMBER", description: "" });
        setShowSidebar(true);
    };

    const openEdit = (metric: MetricDef | DerivedMetricDef, kind: "base" | "derived") => {
        setSidebarType(kind);
        setEditingId(metric.id);
        setFormData({
            slug: metric.slug,
            name: metric.name,
            dataType: 'dataType' in metric ? metric.dataType : "NUMBER",
            aggregationType: 'aggregationType' in metric ? metric.aggregationType : "SUM",
            formula: 'formula' in metric ? metric.formula : "",
            outputType: 'outputType' in metric ? metric.outputType : "NUMBER",
            description: metric.description || "",
        });
        setShowSidebar(true);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const isEdit = !!editingId;
            const payload = sidebarType === "derived"
                ? { type: "derived", slug: formData.slug, name: formData.name, formula: formData.formula, outputType: formData.outputType, description: formData.description || null }
                : { type: "base", slug: formData.slug, name: formData.name, dataType: formData.dataType, aggregationType: formData.aggregationType, description: formData.description || null };

            const res = await fetch("/api/data-integration/metrics", {
                method: isEdit ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(isEdit ? { ...payload, id: editingId, kind: sidebarType } : payload),
            });
            const data = await res.json();
            if (data.success) {
                showToast("success", isEdit ? "Metric bijgewerkt" : "Metric aangemaakt");
                setShowSidebar(false);
                loadMetrics();
            } else {
                showToast("error", data.error || "Er ging iets mis");
            }
        } catch {
            showToast("error", "Er ging iets mis bij het opslaan");
        } finally { setSaving(false); }
    };

    const handleDelete = async (id: string, kind: "base" | "derived") => {
        const confirmed = await confirm({ title: "Metric verwijderen", message: "Weet je zeker dat je deze metric wilt verwijderen?" });
        if (!confirmed) return;
        try {
            await fetch(`/api/data-integration/metrics?id=${id}&kind=${kind}`, { method: "DELETE" });
            showToast("success", "Metric verwijderd");
            loadMetrics();
        } catch {
            showToast("error", "Verwijderen mislukt");
        }
    };

    const copySlug = (slug: string) => {
        navigator.clipboard.writeText(slug);
        setCopyFeedback(slug);
        setTimeout(() => setCopyFeedback(null), 1500);
    };

    // ─── Badges ───

    const typeBadge = (type: string) => {
        const colors: Record<string, string> = { NUMBER: "#10b981", CURRENCY: "#f59e0b", PERCENTAGE: "#6366f1", DURATION: "#ec4899", RATIO: "#8b5cf6" };
        return <span style={{ padding: "2px 8px", borderRadius: "6px", fontSize: "0.7rem", fontWeight: 600, background: `${colors[type] || "#6b7280"}20`, color: colors[type] || "#6b7280", textTransform: "uppercase" }}>{type}</span>;
    };

    // ─── Tab styling ───

    const tabStyle = (tab: TabType): React.CSSProperties => ({
        display: "flex", alignItems: "center", gap: "8px",
        padding: "10px 18px", fontSize: "0.9rem", fontWeight: 600,
        border: "none", borderBottom: activeTab === tab ? "2px solid var(--color-brand)" : "2px solid transparent",
        background: "none", color: activeTab === tab ? "var(--color-brand)" : "var(--color-text-muted)",
        cursor: "pointer", transition: "all 0.15s ease",
    });

    // ─── Render ───

    if (loading) {
        return <div style={{ maxWidth: 1200, margin: "0 auto", padding: 32, display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
            <Loader2 size={32} style={{ animation: "spin 1s linear infinite", color: "var(--color-brand)" }} />
        </div>;
    }

    // Table for base metrics
    const renderBaseTable = (metrics: MetricDef[], showActions: boolean) => (
        <div className="glass-card" style={{ overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        {["Naam", "Beschrijving", "Type", ...(showActions ? [] : ["Platform"]), "Acties"].map(h => (
                            <th key={h} style={{ padding: "12px 20px", textAlign: h === "Acties" ? "right" : "left", fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {metrics.map(m => (
                        <tr key={m.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", opacity: m.hasData === false ? 0.45 : 1, transition: "opacity 0.15s ease" }}>
                            <td style={{ padding: "12px 20px", fontWeight: 500 }}>{m.name}</td>
                            <td style={{ padding: "12px 20px", color: "var(--color-text-muted)", fontSize: "0.85rem", maxWidth: 400 }}>{m.description || "—"}</td>
                            <td style={{ padding: "12px 20px" }}>{typeBadge(m.dataType)}</td>
                            {!showActions && (
                                <td style={{ padding: "12px 20px" }}>
                                    <span style={{ fontSize: "0.8rem", padding: "2px 8px", borderRadius: "4px", background: "rgba(255,255,255,0.05)", color: "var(--color-text-secondary)" }}>{m.connector?.name || "—"}</span>
                                </td>
                            )}
                            <td style={{ padding: "12px 20px", textAlign: "right" }}>
                                <div style={{ display: "flex", gap: "4px", justifyContent: "flex-end" }}>
                                    <button onClick={() => copySlug(m.slug)} style={iconBtnStyle(copyFeedback === m.slug ? "#10b981" : undefined)} title="Kopieer slug">
                                        {copyFeedback === m.slug ? <Check size={14} /> : <Copy size={14} />}
                                    </button>
                                    {showActions && (
                                        <>
                                            <button onClick={() => openEdit(m, "base")} style={iconBtnStyle("#818cf8")} title="Bewerken"><Edit2 size={14} /></button>
                                            <button onClick={() => handleDelete(m.id, "base")} style={iconBtnStyle("#ef4444")} title="Verwijderen"><Trash2 size={14} /></button>
                                        </>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                    {metrics.length === 0 && (
                        <tr><td colSpan={showActions ? 4 : 5} style={{ padding: "32px", textAlign: "center", color: "var(--color-text-muted)" }}>Geen metrics gevonden.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    );

    // Table for derived/formula metrics
    const renderDerivedTable = (metrics: DerivedMetricDef[], showActions: boolean) => (
        <div className="glass-card" style={{ overflow: "hidden", marginTop: "16px" }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: "10px" }}>
                <Calculator size={16} style={{ color: "var(--color-brand)" }} />
                <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>Berekende Metrics (Formules)</span>
                <span style={{ fontSize: "0.75rem", padding: "2px 8px", borderRadius: "10px", background: "rgba(99,102,241,0.1)", color: "#818cf8", fontWeight: 600 }}>{metrics.length}</span>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        {["Naam", "Beschrijving", "Formule", "Type", "Acties"].map(h => (
                            <th key={h} style={{ padding: "10px 20px", textAlign: h === "Acties" ? "right" : "left", fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {metrics.map(m => (
                        <tr key={m.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                            <td style={{ padding: "12px 20px", fontWeight: 500 }}>{m.name}</td>
                            <td style={{ padding: "12px 20px", color: "var(--color-text-muted)", fontSize: "0.85rem" }}>{m.description || "—"}</td>
                            <td style={{ padding: "12px 20px" }}><code style={{ fontSize: "0.8rem", color: "#818cf8" }}>{m.formula}</code></td>
                            <td style={{ padding: "12px 20px" }}>{typeBadge(m.outputType)}</td>
                            <td style={{ padding: "12px 20px", textAlign: "right" }}>
                                <div style={{ display: "flex", gap: "4px", justifyContent: "flex-end" }}>
                                    <button onClick={() => copySlug(m.slug)} style={iconBtnStyle(copyFeedback === m.slug ? "#10b981" : undefined)} title="Kopieer slug">
                                        {copyFeedback === m.slug ? <Check size={14} /> : <Copy size={14} />}
                                    </button>
                                    {showActions && (
                                        <>
                                            <button onClick={() => openEdit(m, "derived")} style={iconBtnStyle("#818cf8")} title="Bewerken"><Edit2 size={14} /></button>
                                            <button onClick={() => handleDelete(m.id, "derived")} style={iconBtnStyle("#ef4444")} title="Verwijderen"><Trash2 size={14} /></button>
                                        </>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                    {metrics.length === 0 && (
                        <tr><td colSpan={5} style={{ padding: "32px", textAlign: "center", color: "var(--color-text-muted)" }}>Geen berekende metrics gevonden.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    );

    return (
        <div className="animate-fade-in" style={{ maxWidth: 1200, margin: "0 auto" }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                <div>
                    <h1 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "4px", display: "flex", alignItems: "center", gap: "12px" }}>
                        <Hash size={28} /> Metrics
                    </h1>
                    <p style={{ color: "var(--color-text-muted)", fontSize: "0.95rem" }}>
                        Beheer metrics waarop data kan worden geaggregeerd en geanalyseerd.
                    </p>
                </div>
                <button onClick={() => openCreate("base")} style={{
                    display: "flex", alignItems: "center", gap: "8px",
                    padding: "10px 20px", background: "var(--color-brand)",
                    border: "none", borderRadius: "8px", color: "#fff",
                    fontWeight: 600, cursor: "pointer", fontSize: "0.9rem",
                }}>
                    <Plus size={16} /> Custom Metric
                </button>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: "4px", borderBottom: "1px solid var(--color-border)", marginBottom: "20px" }}>
                <button onClick={() => setActiveTab("custom")} style={tabStyle("custom")}>
                    <Settings size={16} /> Custom ({counts.custom})
                </button>
                <button onClick={() => setActiveTab("imported")} style={tabStyle("imported")}>
                    <Database size={16} /> Imported ({counts.imported})
                </button>
                <button onClick={() => setActiveTab("builtin")} style={tabStyle("builtin")}>
                    <Clock size={16} /> Built-in ({counts.builtin})
                </button>
            </div>

            {/* Search + Filter */}
            <div className="glass-card" style={{ padding: "16px", marginBottom: "20px", display: "flex", gap: "12px", alignItems: "center" }}>
                <div style={{ position: "relative", flex: 1 }}>
                    <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted)" }} />
                    <input type="text" placeholder="Zoek op naam of slug..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                        style={{ width: "100%", padding: "10px 12px 10px 36px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "var(--color-text-primary)", fontSize: "0.9rem" }}
                    />
                </div>
                <Filter size={16} style={{ color: "var(--color-text-muted)" }} />
                <select value={filterDataType} onChange={e => setFilterDataType(e.target.value)} style={{
                    padding: "10px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px", color: "var(--color-text-primary)", fontSize: "0.85rem", cursor: "pointer",
                }}>
                    <option value="all">Alle types</option>
                    <option value="NUMBER">Number</option>
                    <option value="CURRENCY">Currency</option>
                    <option value="PERCENTAGE">Percentage</option>
                    <option value="DURATION">Duration</option>
                </select>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as "all" | "active" | "inactive")} style={{
                    padding: "10px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px", color: "var(--color-text-primary)", fontSize: "0.85rem", cursor: "pointer",
                }}>
                    <option value="all">Alle status</option>
                    <option value="active">Actief (met data)</option>
                    <option value="inactive">Inactief (zonder data)</option>
                </select>
            </div>

            {/* Custom Tab */}
            {activeTab === "custom" && (
                <>
                    {filteredCustom.length > 0 ? (
                        renderBaseTable(filteredCustom, true)
                    ) : (
                        <div className="glass-card" style={{ padding: "48px 32px", textAlign: "center" }}>
                            <Hash size={48} style={{ color: "var(--color-text-muted)", opacity: 0.2, marginBottom: "16px" }} />
                            <p style={{ color: "var(--color-text-muted)", marginBottom: "16px" }}>Nog geen custom metrics aangemaakt.</p>
                            <button onClick={() => openCreate("base")} style={{
                                padding: "10px 20px", background: "var(--color-brand)", border: "none", borderRadius: "8px",
                                color: "#fff", fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "8px",
                            }}>
                                <Plus size={16} /> Nieuwe Custom Metric
                            </button>
                        </div>
                    )}

                    {/* Custom derived metrics */}
                    {filteredDerivedCustom.length > 0 && renderDerivedTable(filteredDerivedCustom, true)}

                    {/* Button to create a derived metric */}
                    <div style={{ marginTop: "16px" }}>
                        <button onClick={() => openCreate("derived")} style={{
                            display: "flex", alignItems: "center", gap: "8px",
                            padding: "10px 16px", background: "rgba(255,255,255,0.05)",
                            border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px",
                            color: "var(--color-text-primary)", fontWeight: 600, cursor: "pointer",
                        }}>
                            <Calculator size={16} /> Nieuwe Formule Metric
                        </button>
                    </div>
                </>
            )}

            {/* Imported Tab */}
            {activeTab === "imported" && renderBaseTable(filteredImported, false)}

            {/* Built-in Tab */}
            {activeTab === "builtin" && (
                <>
                    {renderBaseTable(filteredBuiltin, false)}

                </>
            )}

            {/* Sidebar Panel for Create/Edit */}
            {showSidebar && (
                <>
                    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 999 }} onClick={() => setShowSidebar(false)} />
                    <div style={{
                        position: "fixed", top: 0, right: 0, bottom: 0, width: "480px", maxWidth: "90vw",
                        background: "var(--color-surface-elevated)", borderLeft: "1px solid var(--color-border)",
                        zIndex: 1000, display: "flex", flexDirection: "column", overflow: "hidden",
                        animation: "slideIn 0.2s ease",
                    }}>
                        {/* Header */}
                        <div style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            padding: "20px 24px", borderBottom: "1px solid var(--color-border)",
                        }}>
                            <h3 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0 }}>
                                {editingId ? "Metric Bewerken" : sidebarType === "derived" ? "Nieuwe Formule Metric" : "Nieuwe Custom Metric"}
                            </h3>
                            <button onClick={() => setShowSidebar(false)} style={{ background: "none", border: "none", color: "var(--color-text-muted)", cursor: "pointer", padding: "4px" }}>
                                <X size={20} />
                            </button>
                        </div>

                        {/* Form */}
                        <div style={{ flex: 1, overflow: "auto", padding: "24px" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                                {!editingId && (
                                    <div>
                                        <label style={labelStyle}>Slug</label>
                                        <input type="text" value={formData.slug} onChange={e => setFormData(p => ({ ...p, slug: e.target.value.replace(/\s/g, "_").toLowerCase() }))}
                                            placeholder="bijv. custom_cpa" style={inputStyle} />
                                    </div>
                                )}
                                <div>
                                    <label style={labelStyle}>Naam</label>
                                    <input type="text" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                                        placeholder="bijv. Custom CPA" style={inputStyle} />
                                </div>

                                {sidebarType === "base" && (
                                    <>
                                        <div>
                                            <label style={labelStyle}>Data Type</label>
                                            <select value={formData.dataType} onChange={e => setFormData(p => ({ ...p, dataType: e.target.value }))} style={inputStyle}>
                                                <option value="NUMBER">Number</option>
                                                <option value="CURRENCY">Currency</option>
                                                <option value="PERCENTAGE">Percentage</option>
                                                <option value="DURATION">Duration</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label style={labelStyle}>Aggregatie Type</label>
                                            <select value={formData.aggregationType} onChange={e => setFormData(p => ({ ...p, aggregationType: e.target.value }))} style={inputStyle}>
                                                <option value="SUM">SUM</option>
                                                <option value="AVG">AVG</option>
                                                <option value="MIN">MIN</option>
                                                <option value="MAX">MAX</option>
                                                <option value="NONE">NONE</option>
                                            </select>
                                        </div>
                                    </>
                                )}

                                {sidebarType === "derived" && (
                                    <>
                                        <div>
                                            <label style={labelStyle}>Formule</label>
                                            <input type="text" value={formData.formula} onChange={e => setFormData(p => ({ ...p, formula: e.target.value }))}
                                                placeholder="bijv. cost / conversions" style={inputStyle} />
                                            <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: "4px" }}>
                                                Gebruik metric slugs: clicks, impressions, cost, conversions, conversion_value
                                            </p>
                                        </div>
                                        <div>
                                            <label style={labelStyle}>Output Type</label>
                                            <select value={formData.outputType} onChange={e => setFormData(p => ({ ...p, outputType: e.target.value }))} style={inputStyle}>
                                                <option value="NUMBER">Number</option>
                                                <option value="CURRENCY">Currency</option>
                                                <option value="PERCENTAGE">Percentage</option>
                                                <option value="RATIO">Ratio</option>
                                            </select>
                                        </div>
                                    </>
                                )}

                                <div>
                                    <label style={labelStyle}>Beschrijving (optioneel)</label>
                                    <input type="text" value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                                        placeholder="Korte beschrijving..." style={inputStyle} />
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div style={{
                            display: "flex", gap: "12px", padding: "16px 24px",
                            borderTop: "1px solid var(--color-border)", justifyContent: "flex-end",
                        }}>
                            <button onClick={() => setShowSidebar(false)} style={{
                                padding: "10px 20px", border: "1px solid var(--color-border)", borderRadius: "8px",
                                background: "transparent", color: "var(--color-text-primary)", cursor: "pointer", fontWeight: 500,
                            }}>Annuleren</button>
                            <button onClick={handleSave} disabled={saving || (!editingId && !formData.slug) || !formData.name} style={{
                                padding: "10px 20px", border: "none", borderRadius: "8px",
                                background: "var(--color-brand)", color: "#fff",
                                cursor: saving ? "wait" : "pointer", fontWeight: 600,
                                opacity: saving ? 0.7 : 1, display: "flex", alignItems: "center", gap: "8px",
                            }}>
                                {saving ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={16} />}
                                {editingId ? "Opslaan" : "Aanmaken"}
                            </button>
                        </div>
                    </div>
                </>
            )}

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
            `}</style>
        </div>
    );
}

// ─── Styles ───

const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px",
    color: "var(--color-text-primary)", fontSize: "0.9rem",
};

const labelStyle: React.CSSProperties = {
    fontSize: "0.85rem", fontWeight: 600, color: "var(--color-text-muted)", marginBottom: "6px", display: "block",
};

function iconBtnStyle(color?: string): React.CSSProperties {
    return {
        padding: "6px", background: color ? `${color}20` : "rgba(255,255,255,0.05)",
        border: "none", borderRadius: "6px", color: color || "var(--color-text-muted)", cursor: "pointer",
    };
}
