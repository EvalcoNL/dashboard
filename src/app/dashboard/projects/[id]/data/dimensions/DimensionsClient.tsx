"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import {
    Layers, Search, Filter,
    Copy, Plus, Edit2, Trash2, Check, Loader2, Save,
    Clock, Database, Settings
} from "lucide-react";
import { useNotification } from "@/components/NotificationProvider";

interface DimensionDef {
    id: string;
    slug: string;
    name: string;
    dataType: string;
    description: string | null;
    canonicalName: string | null;
    isDefault: boolean;
    connectorId: string;
    connector: { slug: string; name: string } | null;
    source: 'imported' | 'builtin' | 'custom';
    hasData?: boolean;
}

type TabType = 'imported' | 'builtin' | 'custom';

export default function DimensionsClient() {
    const params = useParams();

    const [imported, setImported] = useState<DimensionDef[]>([]);
    const [custom, setCustom] = useState<DimensionDef[]>([]);
    const [builtin, setBuiltin] = useState<DimensionDef[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterDataType, setFilterDataType] = useState<string>("all");
    const [activeTab, setActiveTab] = useState<TabType>("custom");
    const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
    const [hasDataMap, setHasDataMap] = useState<Map<string, boolean>>(new Map());
    const [counts, setCounts] = useState({ imported: 0, builtin: 0, custom: 0 });

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [editingDim, setEditingDim] = useState<DimensionDef | null>(null);
    const [formData, setFormData] = useState({ slug: "", name: "", dataType: "STRING", description: "" });
    const [saving, setSaving] = useState(false);
    const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
    const { confirm, showToast } = useNotification();

    useEffect(() => { loadDimensions(); }, []);

    const loadDimensions = async () => {
        setLoading(true);
        try {
            const [dimRes, fieldsRes] = await Promise.all([
                fetch("/api/data-integration/dimensions"),
                fetch(`/api/data-integration/explorer/fields?clientId=${params.id}`),
            ]);
            const data = await dimRes.json();
            const fieldsData = await fieldsRes.json();

            // Build hasData map from explorer fields API
            const hdMap = new Map<string, boolean>();
            for (const f of [...(fieldsData.dimensions || []), ...(fieldsData.metrics || [])]) {
                hdMap.set(f.slug, f.hasData ?? true);
            }
            setHasDataMap(hdMap);

            if (data.success) {
                const allImported = (data.imported || []).filter((d: DimensionDef) => d.slug !== 'date');
                const customDims = allImported.filter((d: DimensionDef) => !d.id.startsWith('auto-'));
                const importedDims = allImported.filter((d: DimensionDef) => d.id.startsWith('auto-'));
                setCustom(customDims.map((d: DimensionDef) => ({ ...d, source: 'custom' as const, hasData: hdMap.get(d.slug) ?? true })));
                setImported(importedDims.map((d: DimensionDef) => ({ ...d, hasData: hdMap.get(d.slug) ?? true })));
                setBuiltin((data.builtin || []).map((d: DimensionDef) => ({ ...d, hasData: true })));
                setCounts({
                    imported: importedDims.length,
                    builtin: (data.builtin || []).length,
                    custom: customDims.length,
                });
            }
        } finally { setLoading(false); }
    };

    // Filter dimensions for search/dataType
    const filteredImported = useMemo(() => {
        return imported.filter(d => {
            const matchesSearch = !searchQuery ||
                d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                d.slug.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesType = filterDataType === "all" || d.dataType === filterDataType;
            const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? d.hasData !== false : d.hasData === false);
            return matchesSearch && matchesType && matchesStatus;
        });
    }, [imported, searchQuery, filterDataType, statusFilter]);

    const filteredBuiltin = useMemo(() => {
        return builtin.filter(d => {
            const matchesSearch = !searchQuery ||
                d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                d.slug.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesType = filterDataType === "all" || d.dataType === filterDataType;
            const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? d.hasData !== false : d.hasData === false);
            return matchesSearch && matchesType && matchesStatus;
        });
    }, [builtin, searchQuery, filterDataType, statusFilter]);

    const filteredCustom = useMemo(() => {
        return custom.filter(d => {
            const matchesSearch = !searchQuery ||
                d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                d.slug.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesType = filterDataType === "all" || d.dataType === filterDataType;
            const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? d.hasData !== false : d.hasData === false);
            return matchesSearch && matchesType && matchesStatus;
        });
    }, [custom, searchQuery, filterDataType, statusFilter]);

    const openCreateModal = () => {
        setEditingDim(null);
        setFormData({ slug: "", name: "", dataType: "STRING", description: "" });
        setShowModal(true);
    };

    const openEditModal = (dim: DimensionDef) => {
        setEditingDim(dim);
        setFormData({ slug: dim.slug, name: dim.name, dataType: dim.dataType, description: dim.description || "" });
        setShowModal(true);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            if (editingDim) {
                await fetch("/api/data-integration/dimensions", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: editingDim.id, name: formData.name, dataType: formData.dataType, description: formData.description }),
                });
            } else {
                const connectorId = imported[0]?.connectorId;
                if (!connectorId) { showToast("error", "Geen connector gevonden."); return; }
                await fetch("/api/data-integration/dimensions", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ connectorId, ...formData }),
                });
            }
            setShowModal(false);
            await loadDimensions();
        } finally { setSaving(false); }
    };

    const handleDelete = async (dim: DimensionDef) => {
        const confirmed = await confirm({
            title: "Dimensie verwijderen",
            message: `Weet je zeker dat je "${dim.name}" wilt verwijderen?`,
            confirmLabel: "Ja, verwijderen",
            type: "danger",
        });
        if (!confirmed) return;
        await fetch(`/api/data-integration/dimensions?id=${dim.id}`, { method: "DELETE" });
        await loadDimensions();
    };

    const copySlug = (slug: string) => {
        navigator.clipboard.writeText(slug);
        setCopyFeedback(slug);
        setTimeout(() => setCopyFeedback(null), 1500);
    };

    const dataTypeBadge = (type: string) => {
        const colors: Record<string, string> = { STRING: "rgba(99, 102, 241, 0.15)", NUMBER: "rgba(16, 185, 129, 0.15)", DATE: "rgba(245, 158, 11, 0.15)", BOOLEAN: "rgba(236, 72, 153, 0.15)" };
        const textColors: Record<string, string> = { STRING: "#818cf8", NUMBER: "#10b981", DATE: "#f59e0b", BOOLEAN: "#ec4899" };
        return (
            <span style={{ padding: "2px 8px", borderRadius: "6px", fontSize: "0.7rem", fontWeight: 600, background: colors[type] || "rgba(255,255,255,0.05)", color: textColors[type] || "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{type}</span>
        );
    };

    const tabStyle = (tab: TabType): React.CSSProperties => ({
        padding: "10px 20px", border: "none", borderBottom: activeTab === tab ? "2px solid var(--color-brand)" : "2px solid transparent",
        background: "none", color: activeTab === tab ? "var(--color-brand)" : "var(--color-text-muted)",
        fontWeight: activeTab === tab ? 600 : 400, cursor: "pointer", fontSize: "0.95rem",
        transition: "all 0.2s",
    });

    if (loading) {
        return (
            <div style={{ maxWidth: 1200, margin: "0 auto", padding: 32, display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
                <Loader2 size={32} style={{ animation: "spin 1s linear infinite", color: "var(--color-brand)" }} />
            </div>
        );
    }

    // Render a flat dimension table
    const renderDimTable = (dims: DimensionDef[], showPlatform: boolean) => (
        <div className="glass-card" style={{ overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        {[
                            "Naam", "Beschrijving", "Type",
                            ...(showPlatform ? ["Platform"] : []),
                            "Acties"
                        ].map(h => (
                            <th key={h} style={{ padding: "10px 20px", textAlign: h === "Acties" ? "right" : "left", fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {dims.map(dim => (
                        <tr key={dim.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", opacity: dim.hasData === false ? 0.45 : 1, transition: "opacity 0.15s ease" }}>
                            <td style={{ padding: "12px 20px", fontWeight: 500, fontSize: "0.9rem" }}>{dim.name}</td>
                            <td style={{ padding: "12px 20px", color: "var(--color-text-muted)", fontSize: "0.85rem", maxWidth: 400 }}>
                                {dim.description || "—"}
                            </td>
                            <td style={{ padding: "12px 20px" }}>{dataTypeBadge(dim.dataType)}</td>
                            {showPlatform && (
                                <td style={{ padding: "12px 20px" }}>
                                    <span style={{ fontSize: "0.8rem", padding: "2px 8px", borderRadius: "4px", background: "rgba(255,255,255,0.05)", color: "var(--color-text-secondary)" }}>
                                        {dim.connector?.name || "Auto-detected"}
                                    </span>
                                </td>
                            )}
                            <td style={{ padding: "12px 20px", textAlign: "right" }}>
                                <div style={{ display: "flex", gap: "4px", justifyContent: "flex-end" }}>
                                    <button onClick={() => copySlug(dim.slug)} style={{ padding: "6px", background: "rgba(255,255,255,0.05)", border: "none", borderRadius: "6px", color: copyFeedback === dim.slug ? "#10b981" : "var(--color-text-muted)", cursor: "pointer" }} title="Kopieer slug">
                                        {copyFeedback === dim.slug ? <Check size={14} /> : <Copy size={14} />}
                                    </button>
                                    {dim.source === 'custom' && (
                                        <>
                                            <button onClick={() => openEditModal(dim)} style={{ padding: "6px", background: "rgba(99, 102, 241, 0.1)", border: "none", borderRadius: "6px", color: "#818cf8", cursor: "pointer" }} title="Bewerken">
                                                <Edit2 size={14} />
                                            </button>
                                            <button onClick={() => handleDelete(dim)} style={{ padding: "6px", background: "rgba(239, 68, 68, 0.1)", border: "none", borderRadius: "6px", color: "#ef4444", cursor: "pointer" }} title="Verwijderen">
                                                <Trash2 size={14} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
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
                        <Layers size={28} /> Dimensies
                    </h1>
                    <p style={{ color: "var(--color-text-muted)", fontSize: "0.95rem" }}>
                        Beheer dimensies waarop data kan worden opgesplitst en gefilterd.
                    </p>
                </div>
                <button onClick={openCreateModal} style={{
                    display: "flex", alignItems: "center", gap: "8px",
                    padding: "10px 20px", background: "var(--color-brand)", color: "white",
                    border: "none", borderRadius: "8px", fontWeight: 600, cursor: "pointer"
                }}>
                    <Plus size={18} /> Custom Dimensie
                </button>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.08)", marginBottom: "24px" }}>
                <button onClick={() => setActiveTab("custom")} style={tabStyle("custom")}>
                    <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <Settings size={16} /> Custom ({counts.custom})
                    </span>
                </button>
                <button onClick={() => setActiveTab("imported")} style={tabStyle("imported")}>
                    <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <Database size={16} /> Imported ({counts.imported})
                    </span>
                </button>
                <button onClick={() => setActiveTab("builtin")} style={tabStyle("builtin")}>
                    <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <Clock size={16} /> Built-in ({counts.builtin})
                    </span>
                </button>
            </div>

            {/* Filters bar */}
            <div className="glass-card" style={{ padding: "16px", marginBottom: "24px", display: "flex", gap: "12px", alignItems: "center" }}>
                <div style={{ position: "relative", flex: 1 }}>
                    <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted)" }} />
                    <input type="text" placeholder="Zoek op naam of slug..." value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        style={{ width: "100%", padding: "10px 12px 10px 36px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "var(--color-text-primary)", fontSize: "0.9rem" }}
                    />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Filter size={14} style={{ color: "var(--color-text-muted)" }} />
                    <select value={filterDataType} onChange={e => setFilterDataType(e.target.value)}
                        style={{ padding: "10px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "var(--color-text-primary)", fontSize: "0.9rem" }}>
                        <option value="all">Alle types</option>
                        <option value="STRING">String</option>
                        <option value="NUMBER">Number</option>
                        <option value="DATE">Date</option>
                        <option value="BOOLEAN">Boolean</option>
                    </select>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
                        style={{ padding: "10px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "var(--color-text-primary)", fontSize: "0.9rem" }}>
                        <option value="all">Alle status</option>
                        <option value="active">Actief (met data)</option>
                        <option value="inactive">Inactief (zonder data)</option>
                    </select>
                </div>
            </div>

            {/* Tab Content: Imported — flat list */}
            {activeTab === "imported" && (
                filteredImported.length === 0 ? (
                    <div className="glass-card" style={{ padding: "64px", textAlign: "center", color: "var(--color-text-muted)" }}>
                        {imported.length === 0
                            ? "Geen geïmporteerde dimensies gevonden. Voer eerst een data sync uit."
                            : "Geen resultaten gevonden voor deze zoekopdracht."
                        }
                    </div>
                ) : renderDimTable(filteredImported, true)
            )}

            {/* Tab Content: Built-in — flat list */}
            {activeTab === "builtin" && (
                filteredBuiltin.length === 0 ? (
                    <div className="glass-card" style={{ padding: "64px", textAlign: "center", color: "var(--color-text-muted)" }}>
                        Geen resultaten gevonden voor deze zoekopdracht.
                    </div>
                ) : (
                    <div>
                        <div className="glass-card" style={{ padding: "12px 20px", marginBottom: "16px" }}>
                            <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", margin: 0 }}>
                                Built-in dimensies worden automatisch berekend uit bestaande data. Ze zijn altijd beschikbaar.
                            </p>
                        </div>
                        {renderDimTable(filteredBuiltin, false)}
                    </div>
                )
            )}

            {/* Tab Content: Custom */}
            {activeTab === "custom" && (
                filteredCustom.length === 0 ? (
                    <div className="glass-card" style={{ padding: "64px", textAlign: "center" }}>
                        <Settings size={48} style={{ color: "var(--color-text-muted)", marginBottom: "16px", opacity: 0.5 }} />
                        <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "8px" }}>Custom Dimensies</h3>
                        <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem", marginBottom: "20px", maxWidth: 400, margin: "0 auto 20px" }}>
                            {custom.length === 0
                                ? "Maak je eigen dimensies aan. Combineer data van verschillende bronnen of maak berekende dimensies."
                                : "Geen resultaten gevonden voor deze zoekopdracht."
                            }
                        </p>
                        {custom.length === 0 && (
                            <button onClick={openCreateModal} style={{
                                display: "inline-flex", alignItems: "center", gap: "8px",
                                padding: "10px 20px", background: "var(--color-brand)", color: "white",
                                border: "none", borderRadius: "8px", fontWeight: 600, cursor: "pointer"
                            }}>
                                <Plus size={18} /> Nieuwe Custom Dimensie
                            </button>
                        )}
                    </div>
                ) : renderDimTable(filteredCustom, false)
            )}

            {/* Create/Edit Sidebar Panel */}
            {showModal && (
                <>
                    {/* Overlay */}
                    <div onClick={() => setShowModal(false)} style={{
                        position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
                        zIndex: 1000, transition: "opacity 0.3s ease",
                    }} />
                    {/* Sidebar */}
                    <div style={{
                        position: "fixed", top: 0, right: 0, bottom: 0,
                        width: "440px", maxWidth: "90vw",
                        background: "var(--color-surface-elevated)",
                        borderLeft: "1px solid var(--color-border)",
                        zIndex: 1001, display: "flex", flexDirection: "column",
                        boxShadow: "-8px 0 32px rgba(0,0,0,0.3)",
                        animation: "slideInRight 0.3s ease",
                    }}>
                        {/* Header */}
                        <div style={{
                            padding: "24px 28px", borderBottom: "1px solid rgba(255,255,255,0.06)",
                            display: "flex", justifyContent: "space-between", alignItems: "center",
                        }}>
                            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0 }}>
                                {editingDim ? "Dimensie Bewerken" : "Nieuwe Custom Dimensie"}
                            </h3>
                            <button onClick={() => setShowModal(false)} style={{
                                padding: "6px 10px", background: "rgba(255,255,255,0.05)",
                                border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px",
                                color: "var(--color-text-muted)", cursor: "pointer", fontSize: "0.85rem",
                            }}>
                                Esc
                            </button>
                        </div>

                        {/* Body */}
                        <div style={{ padding: "28px", flex: 1, overflowY: "auto" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                                {!editingDim && (
                                    <div>
                                        <label style={labelStyle}>Slug</label>
                                        <input type="text" value={formData.slug} onChange={e => setFormData(p => ({ ...p, slug: e.target.value.replace(/\s/g, "_").toLowerCase() }))}
                                            placeholder="bijv. custom_label_1" style={inputStyle} />
                                        <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: "6px" }}>
                                            Unieke identifier voor de dimensie. Gebruik underscores.
                                        </p>
                                    </div>
                                )}
                                <div>
                                    <label style={labelStyle}>Naam</label>
                                    <input type="text" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                                        placeholder="bijv. Custom Label 1" style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Data Type</label>
                                    <select value={formData.dataType} onChange={e => setFormData(p => ({ ...p, dataType: e.target.value }))} style={inputStyle}>
                                        <option value="STRING">String</option>
                                        <option value="NUMBER">Number</option>
                                        <option value="DATE">Date</option>
                                        <option value="BOOLEAN">Boolean</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={labelStyle}>Beschrijving (optioneel)</label>
                                    <textarea value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                                        placeholder="Korte beschrijving van deze dimensie..."
                                        rows={3}
                                        style={{ ...inputStyle, resize: "vertical" }} />
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div style={{
                            padding: "20px 28px", borderTop: "1px solid rgba(255,255,255,0.06)",
                            display: "flex", gap: "12px", justifyContent: "flex-end",
                        }}>
                            <button onClick={() => setShowModal(false)} style={{
                                padding: "10px 20px", border: "1px solid var(--color-border)",
                                borderRadius: "8px", background: "transparent",
                                color: "var(--color-text-primary)", cursor: "pointer", fontWeight: 500,
                            }}>
                                Annuleren
                            </button>
                            <button onClick={handleSave} disabled={saving || (!editingDim && !formData.slug) || !formData.name} style={{
                                padding: "10px 20px", border: "none", borderRadius: "8px",
                                background: "var(--color-brand)", color: "#fff",
                                cursor: saving ? "wait" : "pointer", fontWeight: 600,
                                opacity: saving ? 0.7 : 1, display: "flex", alignItems: "center", gap: "8px",
                            }}>
                                {saving ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={16} />}
                                {editingDim ? "Opslaan" : "Aanmaken"}
                            </button>
                        </div>
                    </div>
                </>
            )}
            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
            `}</style>
        </div>
    );
}

const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px",
    color: "var(--color-text-primary)", fontSize: "0.9rem",
};

const labelStyle: React.CSSProperties = {
    fontSize: "0.85rem", fontWeight: 600, color: "var(--color-text-muted)",
    marginBottom: "6px", display: "block",
};
