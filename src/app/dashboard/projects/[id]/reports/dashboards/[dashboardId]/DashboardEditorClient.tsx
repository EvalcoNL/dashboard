"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    ArrowLeft, Plus, Save, Settings, Trash2, X, GripVertical,
    BarChart3, LineChart, PieChart, Hash, Table2, Type, Eye, Pencil,
    Filter, Loader2, Check, Database, Star,
} from "lucide-react";
import DateRangePicker, { type CompareConfig } from "@/components/ui/DateRangePicker";
import FieldPicker, { type FieldDef } from "@/components/data/FieldPicker";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer,
} from "recharts";

// Dynamic import flag — Recharts needs to render client-side only
const CHART_COLORS = ["#6366f1", "#10b981", "#ec4899", "#f59e0b", "#3b82f6", "#8b5cf6"];

// ─── Types ───

type WidgetType = "kpi" | "line_chart" | "bar_chart" | "pie_chart" | "table" | "text";

interface WidgetData {
    id: string;
    type: WidgetType;
    title: string;
    position: { x: number; y: number; w: number; h: number };
    sortOrder: number;
    config: {
        metric?: string;
        metrics?: string[];
        dimensions?: string[];
        compareMode?: string;
        limit?: number;
        text?: string;
    };
}

interface DashboardFilter {
    dimension: string;
    operator: string;
    values: string[];
}

const WIDGET_TYPES: { type: WidgetType; label: string; icon: React.ElementType; desc: string }[] = [
    { type: "kpi", label: "KPI Kaart", icon: Hash, desc: "Enkele metric met verandering" },
    { type: "line_chart", label: "Lijngrafiek", icon: LineChart, desc: "Trends over tijd" },
    { type: "bar_chart", label: "Staafdiagram", icon: BarChart3, desc: "Vergelijk per dimensie" },
    { type: "pie_chart", label: "Cirkeldiagram", icon: PieChart, desc: "Verdeling weergave" },
    { type: "table", label: "Tabel", icon: Table2, desc: "Data in rijen en kolommen" },
    { type: "text", label: "Tekst", icon: Type, desc: "Vrije tekst of notitie" },
];

// ─── Helpers ───

function getDateString(daysOffset: number): string {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    return d.toISOString().split("T")[0];
}

// ─── Component ───

export default function DashboardEditorClient() {
    const params = useParams();
    const router = useRouter();
    const clientId = params.id as string;
    const dashboardId = params.dashboardId as string;

    // Dashboard state
    const [dashboardName, setDashboardName] = useState("");
    const [widgets, setWidgets] = useState<WidgetData[]>([]);
    const [dashFilters, setDashFilters] = useState<DashboardFilter[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [starred, setStarred] = useState(false);

    // UI state
    const [editMode, setEditMode] = useState(false);
    const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);
    const [showAddPanel, setShowAddPanel] = useState(false);
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [showFieldPicker, setShowFieldPicker] = useState(false);
    const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

    // Date range — uses the same {from, to} format as DateRangePicker
    const [dateRange, setDateRange] = useState({ from: getDateString(-30), to: getDateString(0) });
    const [compareMode, setCompareMode] = useState("");

    // Fields for FieldPicker (same FieldDef type)
    const [allDimensions, setAllDimensions] = useState<FieldDef[]>([]);
    const [allMetrics, setAllMetrics] = useState<FieldDef[]>([]);

    // Connections for FieldPicker
    const [connections, setConnections] = useState<{ id: string; name: string; connectorName: string }[]>([]);
    const [selectedSources, setSelectedSources] = useState<string[]>([]);

    // Widget data results
    const [widgetResults, setWidgetResults] = useState<Record<string, { loading: boolean; data: Record<string, unknown>[] | null; error?: string }>>({});

    // ─── Load dashboard + fields + connections ───
    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const [dbRes, fieldsRes, connsRes] = await Promise.all([
                    fetch(`/api/dashboards/${dashboardId}`),
                    fetch(`/api/data-integration/explorer/fields?clientId=${clientId}`),
                    fetch(`/api/data-integration/connections?clientId=${clientId}`),
                ]);
                const dbData = await dbRes.json();
                const fieldsData = await fieldsRes.json();
                const connsData = await connsRes.json();

                if (dbData.success && dbData.dashboard) {
                    setDashboardName(dbData.dashboard.name);
                    setWidgets(dbData.dashboard.widgets || []);
                    setDashFilters((dbData.dashboard.filters as DashboardFilter[]) || []);
                    setStarred(dbData.dashboard.starred || false);
                }

                if (fieldsData.success) {
                    const dims: FieldDef[] = (fieldsData.dimensions || []).map((d: FieldDef & { hasData?: boolean }) => ({
                        slug: d.slug, name: d.name, type: "dimension" as const,
                        category: d.category || "Overig", dataType: d.dataType || "STRING",
                        description: d.description,
                        connectorSlug: d.connectorSlug, connectorName: d.connectorName,
                        hasData: d.hasData !== false,
                    }));
                    const mets: FieldDef[] = (fieldsData.metrics || []).map((m: FieldDef & { hasData?: boolean }) => ({
                        slug: m.slug, name: m.name, type: "metric" as const,
                        category: m.category || "Overig", dataType: m.dataType || "NUMBER",
                        description: m.description,
                        connectorSlug: m.connectorSlug, connectorName: m.connectorName,
                        hasData: m.hasData !== false,
                    }));
                    setAllDimensions(dims);
                    setAllMetrics(mets);
                }

                if (connsData.success && connsData.connections) {
                    setConnections(connsData.connections.map((c: { id: string; name: string; connector?: { name: string } }) => ({
                        id: c.id, name: c.name,
                        connectorName: c.connector?.name || c.name,
                    })));
                }
            } finally { setLoading(false); }
        };
        load();
    }, [dashboardId, clientId]);

    // ─── Load widget data ───
    const loadWidgetData = useCallback(async (widget: WidgetData) => {
        if (widget.type === "text") return;
        const dims = widget.config.dimensions || [];
        const mets = widget.type === "kpi" ? (widget.config.metric ? [widget.config.metric] : []) : (widget.config.metrics || []);
        if (dims.length === 0 && mets.length === 0) return;
        const queryDims = dims.length > 0 ? dims : ["date"];

        setWidgetResults(prev => ({ ...prev, [widget.id]: { loading: true, data: null } }));

        try {
            const res = await fetch("/api/data-integration/explorer", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    projectId: clientId,
                    dimensions: queryDims,
                    metrics: mets,
                    dateFrom: dateRange.from,
                    dateTo: dateRange.to,
                    compare: compareMode || undefined,
                    filters: dashFilters.filter(f => f.values.length > 0).map(f => ({
                        field: f.dimension, operator: "in", value: f.values.join(","),
                    })),
                    limit: widget.config.limit || 100,
                }),
            });
            const data = await res.json();
            if (data.success) {
                setWidgetResults(prev => ({ ...prev, [widget.id]: { loading: false, data: data.rows || [] } }));
            } else {
                setWidgetResults(prev => ({ ...prev, [widget.id]: { loading: false, data: null, error: data.error || "Query failed" } }));
            }
        } catch {
            setWidgetResults(prev => ({ ...prev, [widget.id]: { loading: false, data: null, error: "Network error" } }));
        }
    }, [clientId, dateRange, dashFilters, compareMode]);

    // Reload all widget data when date range, compare mode, or filters change
    useEffect(() => {
        if (!loading && widgets.length > 0) {
            widgets.forEach(w => loadWidgetData(w));
        }
    }, [dateRange, dashFilters, compareMode, loading]);

    // ─── Widget CRUD ───
    const addWidget = useCallback((type: WidgetType) => {
        const defaults: Record<WidgetType, Partial<WidgetData["config"]>> = {
            kpi: { metric: "cost" },
            line_chart: { metrics: ["cost"], dimensions: ["date"] },
            bar_chart: { metrics: ["cost"], dimensions: ["campaign_name"], limit: 10 },
            pie_chart: { metrics: ["cost"], dimensions: ["campaign_name"], limit: 8 },
            table: { metrics: ["impressions", "clicks", "cost", "conversions"], dimensions: ["campaign_name"], limit: 20 },
            text: { text: "Voeg hier je notities toe..." },
        };

        const newWidget: WidgetData = {
            id: `temp_${Date.now()}`,
            type,
            title: WIDGET_TYPES.find(w => w.type === type)?.label || type,
            position: { x: 0, y: 99, w: type === "kpi" ? 4 : type === "table" ? 12 : 6, h: type === "kpi" ? 1 : 2 },
            sortOrder: widgets.length,
            config: defaults[type] || {},
        };

        setWidgets(prev => [...prev, newWidget]);
        setShowAddPanel(false);
        setSelectedWidgetId(newWidget.id);
        setHasChanges(true);
    }, [widgets.length]);

    const removeWidget = useCallback((id: string) => {
        setWidgets(prev => prev.filter(w => w.id !== id));
        if (selectedWidgetId === id) setSelectedWidgetId(null);
        setHasChanges(true);
    }, [selectedWidgetId]);

    const updateWidget = useCallback((id: string, updates: Partial<WidgetData>) => {
        setWidgets(prev => prev.map(w => w.id === id ? { ...w, ...updates } : w));
        setHasChanges(true);
    }, []);

    const updateWidgetConfig = useCallback((id: string, configUpdates: Partial<WidgetData["config"]>) => {
        setWidgets(prev => prev.map(w =>
            w.id === id ? { ...w, config: { ...w.config, ...configUpdates } } : w
        ));
        setHasChanges(true);
    }, []);

    const moveWidget = useCallback((fromIdx: number, toIdx: number) => {
        setWidgets(prev => {
            const next = [...prev];
            const [moved] = next.splice(fromIdx, 1);
            next.splice(toIdx, 0, moved);
            return next.map((w, i) => ({ ...w, sortOrder: i }));
        });
        setHasChanges(true);
    }, []);

    // ─── FieldPicker toggle handler ───
    const handleFieldToggle = useCallback((slug: string, type: "dimension" | "metric") => {
        if (!selectedWidgetId) return;
        const widget = widgets.find(w => w.id === selectedWidgetId);
        if (!widget) return;

        if (type === "dimension") {
            const current = widget.config.dimensions || [];
            const updated = current.includes(slug) ? current.filter(s => s !== slug) : [...current, slug];
            updateWidgetConfig(selectedWidgetId, { dimensions: updated });
        } else {
            if (widget.type === "kpi") {
                // KPI uses single metric
                updateWidgetConfig(selectedWidgetId, { metric: slug });
            } else {
                const current = widget.config.metrics || [];
                const updated = current.includes(slug) ? current.filter(s => s !== slug) : [...current, slug];
                updateWidgetConfig(selectedWidgetId, { metrics: updated });
            }
        }
    }, [selectedWidgetId, widgets, updateWidgetConfig]);

    // ─── Save ───
    const saveDashboard = async () => {
        setSaving(true);
        try {
            await fetch(`/api/dashboards/${dashboardId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: dashboardName, filters: dashFilters }),
            });

            const existingWidgets = widgets.filter(w => !w.id.startsWith("temp_"));
            const newWidgets = widgets.filter(w => w.id.startsWith("temp_"));

            // Delete removed widgets
            const dbRes = await fetch(`/api/dashboards/${dashboardId}`);
            const dbData = await dbRes.json();
            const currentWidgetIds = new Set(widgets.map(w => w.id));
            for (const w of (dbData.dashboard?.widgets || [])) {
                if (!currentWidgetIds.has(w.id)) {
                    await fetch(`/api/dashboards/${dashboardId}/widgets?widgetId=${w.id}`, { method: "DELETE" });
                }
            }

            // Bulk update existing
            if (existingWidgets.length > 0) {
                await fetch(`/api/dashboards/${dashboardId}/widgets`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        widgets: existingWidgets.map((w, i) => ({
                            id: w.id, title: w.title, type: w.type,
                            position: w.position, config: w.config, sortOrder: i,
                        })),
                    }),
                });
            }

            // Create new widgets
            const createdWidgets: WidgetData[] = [];
            for (const w of newWidgets) {
                const res = await fetch(`/api/dashboards/${dashboardId}/widgets`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ type: w.type, title: w.title, position: w.position, config: w.config }),
                });
                const data = await res.json();
                if (data.success) createdWidgets.push({ ...w, id: data.widget.id });
            }

            if (createdWidgets.length > 0) {
                setWidgets(prev => prev.map(w => {
                    const created = createdWidgets.find(c =>
                        c.title === w.title && c.type === w.type && w.id.startsWith("temp_")
                    );
                    return created ? { ...w, id: created.id } : w;
                }));
            }

            setHasChanges(false);
        } finally { setSaving(false); }
    };

    // ─── Derived state ───
    const selectedWidget = widgets.find(w => w.id === selectedWidgetId);
    const selectedWidgetDimensions = useMemo(() => {
        if (!selectedWidget || selectedWidget.type === "text") return [];
        return selectedWidget.config.dimensions || [];
    }, [selectedWidget]);
    const selectedWidgetMetrics = useMemo(() => {
        if (!selectedWidget || selectedWidget.type === "text") return [];
        if (selectedWidget.type === "kpi") return selectedWidget.config.metric ? [selectedWidget.config.metric] : [];
        return selectedWidget.config.metrics || [];
    }, [selectedWidget]);

    const getFieldLabel = useCallback((slug: string) => {
        const dim = allDimensions.find(d => d.slug === slug);
        if (dim) return dim.name;
        const met = allMetrics.find(m => m.slug === slug);
        if (met) return met.name;
        return slug;
    }, [allDimensions, allMetrics]);

    const widthMap: Record<number, string> = { 3: "span 3", 4: "span 4", 6: "span 6", 8: "span 8", 12: "1 / -1" };

    if (loading) {
        return (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
                <Loader2 size={32} style={{ animation: "spin 1s linear infinite", color: "var(--color-brand)" }} />
            </div>
        );
    }

    return (
        <div style={{ display: "flex", height: "calc(100vh - 56px)" }}>
            {/* Main Area */}
            <div style={{ flex: 1, overflow: "auto", padding: "24px" }}>
                {/* Toolbar */}
                <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    marginBottom: "24px", gap: "12px", flexWrap: "wrap",
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <button
                            onClick={() => router.push(`/dashboard/projects/${clientId}/reports/dashboards`)}
                            style={{ ...iconBtnStyle, width: 36, height: 36 }}
                            title="Terug"
                        >
                            <ArrowLeft size={18} />
                        </button>
                        {editMode ? (
                            <input
                                type="text" value={dashboardName}
                                onChange={e => { setDashboardName(e.target.value); setHasChanges(true); }}
                                style={{
                                    fontSize: "1.5rem", fontWeight: 700, border: "none",
                                    borderBottom: "2px dashed var(--color-border)",
                                    background: "transparent", color: "var(--color-text-primary)",
                                    outline: "none", padding: "0 0 4px 0", minWidth: "200px",
                                }}
                            />
                        ) : (
                            <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>{dashboardName}</h1>
                        )}
                        {/* Star / Favorite */}
                        <button
                            onClick={async () => {
                                const newVal = !starred;
                                setStarred(newVal);
                                await fetch(`/api/dashboards/${dashboardId}`, {
                                    method: "PATCH",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ starred: newVal }),
                                });
                            }}
                            style={{ ...iconBtnStyle, width: 36, height: 36 }}
                            title={starred ? "Verwijder uit favorieten" : "Toevoegen aan favorieten"}
                        >
                            <Star size={18} fill={starred ? "#f59e0b" : "none"} color={starred ? "#f59e0b" : "var(--color-text-muted)"} />
                        </button>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        {/* Date Range Picker */}
                        <DateRangePicker
                            dateRange={dateRange}
                            onApply={(range, compare) => {
                                setDateRange(range);
                                if (compare) setCompareMode(compare.enabled ? compare.mode : "");
                            }}
                            compare={compareMode ? { enabled: true, mode: compareMode as CompareConfig["mode"] } : undefined}
                            showCompare={true}
                        />

                        {/* Dashboard Filters */}
                        <button onClick={() => setShowFilterModal(true)} style={{
                            ...btnStyle, gap: "6px",
                            background: dashFilters.length > 0 ? "rgba(99,102,241,0.1)" : "var(--color-surface)",
                            color: dashFilters.length > 0 ? "var(--color-brand)" : "var(--color-text-primary)",
                        }}>
                            <Filter size={15} />
                            Filters
                            {dashFilters.length > 0 && (
                                <span style={{
                                    background: "var(--color-brand)", color: "#fff", borderRadius: "10px",
                                    padding: "0 6px", fontSize: "0.7rem", fontWeight: 700,
                                }}>{dashFilters.length}</span>
                            )}
                        </button>

                        {/* Mode Toggle */}
                        <button onClick={() => setEditMode(!editMode)} style={{
                            ...btnStyle,
                            background: editMode ? "rgba(99,102,241,0.1)" : "var(--color-surface)",
                            color: editMode ? "var(--color-brand)" : "var(--color-text-primary)",
                        }}>
                            {editMode ? <Eye size={15} /> : <Pencil size={15} />}
                            {editMode ? "Voorbeeld" : "Bewerken"}
                        </button>

                        {/* Add Widget */}
                        {editMode && (
                            <button onClick={() => setShowAddPanel(!showAddPanel)} style={{
                                ...btnStyle, background: "var(--color-brand)", color: "#fff", border: "none",
                            }}>
                                <Plus size={15} /> Widget
                            </button>
                        )}

                        {/* Save — only visible in edit mode */}
                        {editMode && (
                            <button onClick={saveDashboard} disabled={saving || !hasChanges} style={{
                                ...btnStyle,
                                background: hasChanges ? "var(--color-brand)" : "var(--color-surface)",
                                color: hasChanges ? "#fff" : "var(--color-text-muted)",
                                border: hasChanges ? "none" : "1px solid var(--color-border)",
                                opacity: saving ? 0.7 : 1,
                            }}>
                                {saving ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={15} />}
                                Opslaan
                            </button>
                        )}
                    </div>
                </div>

                {/* Add Widget Chooser */}
                {showAddPanel && editMode && (
                    <div style={{
                        padding: "20px", borderRadius: "12px", marginBottom: "20px",
                        background: "var(--color-surface-elevated)", border: "1px solid var(--color-border)",
                        animation: "fadeInDown 0.15s ease",
                    }}>
                        <h3 style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: "16px" }}>Widget type kiezen</h3>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "10px" }}>
                            {WIDGET_TYPES.map(wt => {
                                const Icon = wt.icon;
                                return (
                                    <button key={wt.type} onClick={() => addWidget(wt.type)}
                                        className="widget-type-btn"
                                        style={{
                                            display: "flex", alignItems: "center", gap: "10px",
                                            padding: "14px", borderRadius: "10px",
                                            border: "1px solid var(--color-border)", background: "var(--color-surface)",
                                            cursor: "pointer", textAlign: "left", color: "var(--color-text-primary)",
                                            transition: "all 0.15s ease",
                                        }}
                                    >
                                        <div style={{
                                            width: "36px", height: "36px", borderRadius: "8px",
                                            background: "rgba(99,102,241,0.1)", display: "flex",
                                            alignItems: "center", justifyContent: "center", color: "var(--color-brand)",
                                        }}><Icon size={18} /></div>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: "0.8rem" }}>{wt.label}</div>
                                            <div style={{ fontSize: "0.65rem", color: "var(--color-text-muted)" }}>{wt.desc}</div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Widget Grid */}
                <div style={{
                    display: "grid", gridTemplateColumns: "repeat(12, 1fr)",
                    gap: "16px", minHeight: widgets.length === 0 ? "300px" : "auto",
                }}>
                    {widgets.map((widget, idx) => (
                        <div
                            key={widget.id}
                            draggable={editMode}
                            onDragStart={() => setDraggedIdx(idx)}
                            onDragOver={e => e.preventDefault()}
                            onDrop={() => { if (draggedIdx !== null) moveWidget(draggedIdx, idx); setDraggedIdx(null); }}
                            style={{
                                gridColumn: widthMap[widget.position.w] || "span 6",
                                borderRadius: "12px",
                                border: selectedWidgetId === widget.id ? "2px solid var(--color-brand)" : "1px solid var(--color-border)",
                                background: "var(--color-surface-elevated)", overflow: "hidden",
                                transition: "all 0.2s ease",
                            }}
                        >
                            {/* Widget Header */}
                            <div style={{
                                display: "flex", alignItems: "center", justifyContent: "space-between",
                                padding: "10px 14px", borderBottom: "1px solid var(--color-border)",
                                background: "var(--color-surface)",
                            }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    {editMode && <GripVertical size={14} style={{ color: "var(--color-text-muted)", cursor: "grab" }} />}
                                    <span style={{ fontSize: "0.8rem", fontWeight: 600 }}>{widget.title}</span>
                                </div>
                                {editMode && (
                                    <div style={{ display: "flex", gap: "2px" }}>
                                        <button onClick={() => setSelectedWidgetId(selectedWidgetId === widget.id ? null : widget.id)}
                                            style={iconBtnStyle} title="Configureren">
                                            <Settings size={14} />
                                        </button>
                                        <button onClick={() => removeWidget(widget.id)} style={{ ...iconBtnStyle, color: "#ef4444" }}
                                            title="Verwijderen">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Widget Content */}
                            <div style={{ padding: "16px", minHeight: widget.type === "kpi" ? "80px" : "180px" }}>
                                <WidgetContent widget={widget} result={widgetResults[widget.id]} getLabel={getFieldLabel} />
                            </div>
                        </div>
                    ))}

                    {/* Empty state */}
                    {widgets.length === 0 && (
                        <div style={{
                            gridColumn: "1 / -1", display: "flex", flexDirection: "column",
                            alignItems: "center", justifyContent: "center", padding: "60px",
                            borderRadius: "12px", border: "2px dashed var(--color-border)",
                            color: "var(--color-text-muted)",
                        }}>
                            <BarChart3 size={40} style={{ marginBottom: "16px", opacity: 0.3 }} />
                            <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "8px" }}>Begin met bouwen</h3>
                            <p style={{ fontSize: "0.85rem", marginBottom: "20px" }}>
                                Klik op &quot;Widget&quot; om je eerste visualisatie toe te voegen.
                            </p>
                            <button onClick={() => setShowAddPanel(true)}
                                style={{ ...btnStyle, background: "var(--color-brand)", color: "#fff", border: "none" }}>
                                <Plus size={16} /> Widget toevoegen
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Side Panel */}
            {editMode && selectedWidget && (
                <div style={{
                    width: "380px", borderLeft: "1px solid var(--color-border)",
                    background: "var(--color-surface-elevated)", overflow: "auto",
                    animation: "slideInRight 0.2s ease", flexShrink: 0,
                }}>
                    <div style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "16px 20px", borderBottom: "1px solid var(--color-border)",
                    }}>
                        <h3 style={{ fontSize: "0.9rem", fontWeight: 700, margin: 0 }}>Widget Instellingen</h3>
                        <button onClick={() => setSelectedWidgetId(null)} style={iconBtnStyle}><X size={16} /></button>
                    </div>
                    <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "20px" }}>
                        {/* Title */}
                        <div>
                            <label style={labelStyle}>Titel</label>
                            <input type="text" value={selectedWidget.title}
                                onChange={e => updateWidget(selectedWidget.id, { title: e.target.value })}
                                style={inputStyle} />
                        </div>

                        {/* Type */}
                        <div>
                            <label style={labelStyle}>Type</label>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px" }}>
                                {WIDGET_TYPES.map(wt => {
                                    const Icon = wt.icon;
                                    const active = selectedWidget.type === wt.type;
                                    return (
                                        <button key={wt.type} onClick={() => updateWidget(selectedWidget.id, { type: wt.type })}
                                            style={{
                                                display: "flex", flexDirection: "column", alignItems: "center", gap: "4px",
                                                padding: "8px", borderRadius: "8px",
                                                border: active ? "2px solid var(--color-brand)" : "1px solid var(--color-border)",
                                                background: active ? "rgba(99,102,241,0.1)" : "var(--color-surface)",
                                                color: active ? "var(--color-brand)" : "var(--color-text-muted)",
                                                cursor: "pointer", fontSize: "0.65rem",
                                            }}>
                                            <Icon size={16} />
                                            {wt.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Width */}
                        <div>
                            <label style={labelStyle}>Breedte</label>
                            <div style={{ display: "flex", gap: "6px" }}>
                                {([{ w: 3, l: "1/4" }, { w: 4, l: "1/3" }, { w: 6, l: "1/2" }, { w: 8, l: "2/3" }, { w: 12, l: "Vol" }] as const).map(opt => (
                                    <button key={opt.w}
                                        onClick={() => updateWidget(selectedWidget.id, { position: { ...selectedWidget.position, w: opt.w } })}
                                        style={{
                                            flex: 1, padding: "6px", borderRadius: "6px", cursor: "pointer",
                                            border: selectedWidget.position.w === opt.w ? "2px solid var(--color-brand)" : "1px solid var(--color-border)",
                                            background: selectedWidget.position.w === opt.w ? "rgba(99,102,241,0.1)" : "var(--color-surface)",
                                            color: selectedWidget.position.w === opt.w ? "var(--color-brand)" : "var(--color-text-muted)",
                                            fontSize: "0.75rem", fontWeight: 600,
                                        }}>
                                        {opt.l}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {selectedWidget.type !== "text" && (
                            <>
                                {/* Dimensions & Metrics — shows selected fields + button to open FieldPicker */}
                                <div>
                                    <label style={labelStyle}>Dimensies & Metrics</label>

                                    {/* Selected fields display */}
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "10px" }}>
                                        {selectedWidgetDimensions.map(slug => (
                                            <span key={slug} style={{
                                                padding: "4px 8px", borderRadius: "6px", fontSize: "0.7rem",
                                                background: "rgba(148,163,184,0.12)", color: "var(--color-text-secondary)",
                                                display: "flex", alignItems: "center", gap: "4px",
                                            }}>
                                                <span style={{
                                                    width: "6px", height: "6px", borderRadius: "2px",
                                                    background: "#94a3b8", flexShrink: 0,
                                                }} />
                                                {getFieldLabel(slug)}
                                                <button onClick={() => handleFieldToggle(slug, "dimension")}
                                                    style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "var(--color-text-muted)" }}>
                                                    <X size={10} />
                                                </button>
                                            </span>
                                        ))}
                                        {selectedWidgetMetrics.map(slug => (
                                            <span key={slug} style={{
                                                padding: "4px 8px", borderRadius: "6px", fontSize: "0.7rem",
                                                background: "rgba(99,102,241,0.12)", color: "var(--color-brand)",
                                                display: "flex", alignItems: "center", gap: "4px",
                                            }}>
                                                <span style={{
                                                    width: "6px", height: "6px", borderRadius: "50%",
                                                    background: "var(--color-brand)", flexShrink: 0,
                                                }} />
                                                {getFieldLabel(slug)}
                                                <button onClick={() => handleFieldToggle(slug, "metric")}
                                                    style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "var(--color-text-muted)" }}>
                                                    <X size={10} />
                                                </button>
                                            </span>
                                        ))}
                                        {selectedWidgetDimensions.length === 0 && selectedWidgetMetrics.length === 0 && (
                                            <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Geen velden geselecteerd</span>
                                        )}
                                    </div>

                                    {/* Open FieldPicker button */}
                                    <button onClick={() => setShowFieldPicker(true)} style={{
                                        ...btnStyle, width: "100%", justifyContent: "center", gap: "8px",
                                        background: "rgba(99,102,241,0.08)", color: "var(--color-brand)", border: "1px solid rgba(99,102,241,0.2)",
                                    }}>
                                        <Database size={14} />
                                        Dimensies & Metrics kiezen
                                        <span style={{
                                            background: "var(--color-brand)", color: "#fff", borderRadius: "10px",
                                            padding: "0 6px", fontSize: "0.65rem", fontWeight: 700,
                                        }}>{selectedWidgetDimensions.length + selectedWidgetMetrics.length}</span>
                                    </button>
                                </div>



                                {/* Limit */}
                                {["bar_chart", "pie_chart", "table"].includes(selectedWidget.type) && (
                                    <div>
                                        <label style={labelStyle}>Maximum rijen</label>
                                        <input type="number" value={selectedWidget.config.limit || 10}
                                            onChange={e => updateWidgetConfig(selectedWidget.id, { limit: parseInt(e.target.value) || 10 })}
                                            style={inputStyle} min={1} max={100} />
                                    </div>
                                )}

                                {/* Reload data */}
                                <button onClick={() => loadWidgetData(selectedWidget)}
                                    style={{ ...btnStyle, justifyContent: "center", background: "rgba(99,102,241,0.1)", color: "var(--color-brand)", border: "none" }}>
                                    Data vernieuwen
                                </button>
                            </>
                        )}

                        {/* Text widget */}
                        {selectedWidget.type === "text" && (
                            <div>
                                <label style={labelStyle}>Tekst</label>
                                <textarea value={selectedWidget.config.text || ""}
                                    onChange={e => updateWidgetConfig(selectedWidget.id, { text: e.target.value })}
                                    style={{ ...inputStyle, minHeight: "120px", resize: "vertical" }} />
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* FieldPicker — reusable component from @/components/data/FieldPicker */}
            <FieldPicker
                open={showFieldPicker}
                onClose={() => setShowFieldPicker(false)}
                dimensions={allDimensions}
                metrics={allMetrics}
                selectedDimensions={selectedWidgetDimensions}
                selectedMetrics={selectedWidgetMetrics}
                onToggle={handleFieldToggle}
                onLoadData={() => { if (selectedWidget) loadWidgetData(selectedWidget); setShowFieldPicker(false); }}
                loading={false}
                connections={connections}
                selectedSources={selectedSources}
                onSourceChange={setSelectedSources}
            />

            {/* Filter Modal */}
            {showFilterModal && (
                <FilterModal
                    filters={dashFilters}
                    dimensions={allDimensions}
                    onApply={(f) => { setDashFilters(f); setShowFilterModal(false); setHasChanges(true); }}
                    onClose={() => setShowFilterModal(false)}
                />
            )}

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes fadeInDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes slideInRight { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
                .widget-type-btn:hover { border-color: var(--color-brand) !important; background: rgba(99,102,241,0.05) !important; }
            `}</style>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════
// Widget Content Renderer
// ═══════════════════════════════════════════════════════════════════

function WidgetContent({ widget, result, getLabel }: {
    widget: WidgetData;
    result?: { loading: boolean; data: Record<string, unknown>[] | null; error?: string };
    getLabel: (slug: string) => string;
}) {
    if (widget.type === "text") {
        return (
            <div style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                {widget.config.text || "Geen tekst"}
            </div>
        );
    }

    if (!result || result.loading) {
        return (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%", minHeight: 60 }}>
                <Loader2 size={20} style={{ animation: "spin 1s linear infinite", color: "var(--color-text-muted)" }} />
            </div>
        );
    }

    if (result.error) {
        return <div style={{ fontSize: "0.75rem", color: "#ef4444", textAlign: "center", padding: "20px" }}>⚠ {result.error}</div>;
    }

    const data = result.data || [];
    if (data.length === 0) {
        return <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", textAlign: "center", padding: "20px" }}>Geen data beschikbaar</div>;
    }

    switch (widget.type) {
        case "kpi": {
            const metric = widget.config.metric || "";
            let total = 0;
            for (const row of data) total += Number(row[metric] || 0);
            const formatted = metric.includes("cost") || metric.includes("value") || metric === "cpc" || metric === "cpm"
                ? `€ ${total.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : metric.includes("rate") || metric === "ctr"
                    ? `${total.toFixed(2)}%`
                    : total.toLocaleString("nl-NL");
            return (
                <div>
                    <div style={{ fontSize: "1.8rem", fontWeight: 700 }}>{formatted}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: "4px" }}>{getLabel(metric)}</div>
                </div>
            );
        }

        case "line_chart": {
            const mets = widget.config.metrics || [];
            const dim = widget.config.dimensions?.[0] || "date";
            if (mets.length === 0) return <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", textAlign: "center" }}>Selecteer metrics</div>;

            const sortedData = [...data].sort((a, b) => String(a[dim]).localeCompare(String(b[dim])));
            const chartData = sortedData.map(d => {
                const row: Record<string, unknown> = {
                    label: dim === "date"
                        ? new Date(String(d[dim])).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })
                        : String(d[dim] || "—"),
                };
                mets.forEach(m => { row[m] = Number(d[m] || 0); });
                return row;
            });

            return (
                <div>
                    <div style={{ width: "100%", height: 180, minWidth: 0 }}>
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                <defs>
                                    {mets.map((m, i) => (
                                        <linearGradient key={m} id={`grad_${widget.id}_${i}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0.3} />
                                            <stop offset="95%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0} />
                                        </linearGradient>
                                    ))}
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(51, 65, 85, 0.3)" />
                                <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} />
                                <YAxis stroke="#64748b" fontSize={11} tickLine={false} width={45} />
                                <Tooltip
                                    contentStyle={{
                                        background: "var(--color-surface-elevated)",
                                        border: "1px solid var(--color-border)",
                                        borderRadius: "10px",
                                        fontSize: "0.8rem",
                                    }}
                                />
                                {mets.map((m, i) => (
                                    <Area
                                        key={m}
                                        type="monotone"
                                        dataKey={m}
                                        stroke={CHART_COLORS[i % CHART_COLORS.length]}
                                        fill={`url(#grad_${widget.id}_${i})`}
                                        strokeWidth={2}
                                        name={getLabel(m)}
                                    />
                                ))}
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                    <div style={{ display: "flex", gap: "12px", marginTop: "8px", justifyContent: "center" }}>
                        {mets.map((m, i) => (
                            <div key={m} style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.65rem", color: "var(--color-text-muted)" }}>
                                <div style={{ width: 8, height: 8, borderRadius: "50%", background: CHART_COLORS[i % CHART_COLORS.length] }} />
                                {getLabel(m)}
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        case "bar_chart": {
            const met = (widget.config.metrics || [])[0] || "";
            const dim = widget.config.dimensions?.[0] || "";
            if (!met || !dim) return <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", textAlign: "center" }}>Selecteer metric en dimensie</div>;

            const sortedData = [...data].sort((a, b) => Number(b[met] || 0) - Number(a[met] || 0)).slice(0, widget.config.limit || 10);
            const maxVal = Math.max(...sortedData.map(d => Number(d[met] || 0)), 1);

            return (
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    {sortedData.map((d, i) => {
                        const val = Number(d[met] || 0);
                        const pct = (val / maxVal) * 100;
                        return (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.7rem" }}>
                                <div style={{ width: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--color-text-secondary)" }}>
                                    {String(d[dim] || "—")}
                                </div>
                                <div style={{ flex: 1, height: "20px", background: "rgba(99,102,241,0.08)", borderRadius: "4px", overflow: "hidden" }}>
                                    <div style={{ width: `${pct}%`, height: "100%", background: "var(--color-brand)", borderRadius: "4px", transition: "width 0.3s ease" }} />
                                </div>
                                <div style={{ width: "60px", textAlign: "right", fontSize: "0.65rem", color: "var(--color-text-muted)" }}>
                                    {val.toLocaleString("nl-NL")}
                                </div>
                            </div>
                        );
                    })}
                </div>
            );
        }

        case "pie_chart": {
            const met = (widget.config.metrics || [])[0] || "";
            const dim = widget.config.dimensions?.[0] || "";
            if (!met || !dim) return <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", textAlign: "center" }}>Selecteer metric en dimensie</div>;

            const colors = ["#6366f1", "#ec4899", "#10b981", "#f59e0b", "#3b82f6", "#8b5cf6", "#14b8a6", "#f97316"];
            const sorted = [...data].sort((a, b) => Number(b[met] || 0) - Number(a[met] || 0)).slice(0, widget.config.limit || 8);
            const total = sorted.reduce((s, d) => s + Number(d[met] || 0), 0);
            let cumAngle = 0;

            return (
                <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
                    <svg width="120" height="120" viewBox="0 0 120 120" style={{ flexShrink: 0 }}>
                        {sorted.map((d, i) => {
                            const pct = Number(d[met] || 0) / (total || 1);
                            const angle = pct * 360;
                            const start = cumAngle; cumAngle += angle;
                            if (angle <= 0) return null;
                            const r = 50;
                            const sr = (start - 90) * Math.PI / 180;
                            const er = (cumAngle - 90) * Math.PI / 180;
                            const large = angle > 180 ? 1 : 0;
                            return (
                                <path key={i}
                                    d={`M60,60 L${60 + r * Math.cos(sr)},${60 + r * Math.sin(sr)} A${r},${r} 0 ${large},1 ${60 + r * Math.cos(er)},${60 + r * Math.sin(er)} Z`}
                                    fill={colors[i % colors.length]} opacity={0.85} />
                            );
                        })}
                        <circle cx={60} cy={60} r={25} fill="var(--color-surface-elevated)" />
                    </svg>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px", overflow: "hidden" }}>
                        {sorted.map((d, i) => (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.65rem" }}>
                                <div style={{ width: 8, height: 8, borderRadius: "50%", background: colors[i % colors.length], flexShrink: 0 }} />
                                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--color-text-secondary)" }}>
                                    {String(d[dim] || "—")}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        case "table": {
            const mets = widget.config.metrics || [];
            const dims = widget.config.dimensions || [];
            const allCols = [...dims, ...mets];
            const limitedData = data.slice(0, widget.config.limit || 20);

            return (
                <div style={{ overflow: "auto", maxHeight: "300px" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.75rem" }}>
                        <thead>
                            <tr>
                                {allCols.map(col => (
                                    <th key={col} style={{
                                        textAlign: dims.includes(col) ? "left" : "right",
                                        padding: "6px 8px", borderBottom: "1px solid var(--color-border)",
                                        fontWeight: 600, color: "var(--color-text-muted)", fontSize: "0.7rem",
                                        position: "sticky", top: 0, background: "var(--color-surface-elevated)",
                                    }}>{getLabel(col)}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {limitedData.map((row, i) => (
                                <tr key={i}>
                                    {allCols.map(col => (
                                        <td key={col} style={{
                                            textAlign: dims.includes(col) ? "left" : "right",
                                            padding: "6px 8px", borderBottom: "1px solid rgba(255,255,255,0.04)",
                                            color: dims.includes(col) ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                                        }}>
                                            {dims.includes(col)
                                                ? String(row[col] ?? "—")
                                                : Number(row[col] || 0).toLocaleString("nl-NL", { maximumFractionDigits: 2 })
                                            }
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );
        }

        default:
            return <div style={{ color: "var(--color-text-muted)" }}>Widget type niet ondersteund</div>;
    }
}

// ═══════════════════════════════════════════════════════════════════
// Filter Modal
// ═══════════════════════════════════════════════════════════════════

function FilterModal({ filters, dimensions, onApply, onClose }: {
    filters: DashboardFilter[];
    dimensions: FieldDef[];
    onApply: (f: DashboardFilter[]) => void;
    onClose: () => void;
}) {
    const [localFilters, setLocalFilters] = useState<DashboardFilter[]>(
        filters.length > 0 ? filters : [{ dimension: "", operator: "in", values: [] }]
    );

    const addFilter = () => {
        setLocalFilters(prev => [...prev, { dimension: "", operator: "in", values: [] }]);
    };

    const removeFilter = (idx: number) => {
        setLocalFilters(prev => prev.filter((_, i) => i !== idx));
    };

    const updateFilter = (idx: number, updates: Partial<DashboardFilter>) => {
        setLocalFilters(prev => prev.map((f, i) => i === idx ? { ...f, ...updates } : f));
    };

    return (
        <div style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
        }} onClick={onClose}>
            <div onClick={e => e.stopPropagation()} style={{
                background: "var(--color-surface-elevated)", borderRadius: "16px",
                width: "600px", maxHeight: "80vh", overflow: "auto",
                border: "1px solid var(--color-border)", boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
            }}>
                <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "20px 24px", borderBottom: "1px solid var(--color-border)",
                }}>
                    <div>
                        <h2 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>
                            <Filter size={18} style={{ display: "inline", verticalAlign: "middle", marginRight: "8px" }} />
                            Dashboard Filters
                        </h2>
                        <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", margin: "4px 0 0" }}>
                            Kies dimensies om op te filteren in het dashboard.
                        </p>
                    </div>
                    <button onClick={onClose} style={iconBtnStyle}><X size={18} /></button>
                </div>
                <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "12px" }}>
                    {localFilters.map((f, idx) => (
                        <div key={idx} style={{
                            display: "flex", alignItems: "center", gap: "8px",
                            padding: "12px", background: "var(--color-surface)", borderRadius: "10px",
                            border: "1px solid var(--color-border)",
                        }}>
                            <select value={f.dimension} onChange={e => updateFilter(idx, { dimension: e.target.value })}
                                style={{ ...selectStyle, flex: 1 }}>
                                <option value="">Kies dimensie...</option>
                                {dimensions.map(d => <option key={d.slug} value={d.slug}>{d.name}</option>)}
                            </select>
                            <input type="text" placeholder="Waarden (komma-gescheiden)"
                                value={f.values.join(", ")}
                                onChange={e => updateFilter(idx, { values: e.target.value.split(",").map(v => v.trim()).filter(Boolean) })}
                                style={{ ...inputStyle, flex: 2 }} />
                            <button onClick={() => removeFilter(idx)} style={{ ...iconBtnStyle, color: "#ef4444" }}>
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                    <button onClick={addFilter} style={{
                        ...btnStyle, justifyContent: "center", color: "var(--color-brand)",
                        background: "transparent", border: "1px dashed var(--color-brand)",
                    }}>
                        <Plus size={14} /> Filter toevoegen
                    </button>
                </div>
                <div style={{
                    display: "flex", justifyContent: "flex-end", gap: "8px",
                    padding: "16px 24px", borderTop: "1px solid var(--color-border)",
                }}>
                    <button onClick={onClose} style={btnStyle}>Annuleren</button>
                    <button onClick={() => onApply(localFilters.filter(f => f.dimension))}
                        style={{ ...btnStyle, background: "var(--color-brand)", color: "#fff", border: "none" }}>
                        <Check size={14} /> Toepassen
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Shared Styles ───

const btnStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: "6px",
    padding: "8px 14px", borderRadius: "8px",
    border: "1px solid var(--color-border)", background: "var(--color-surface)",
    color: "var(--color-text-primary)", fontSize: "0.8rem",
    fontWeight: 500, cursor: "pointer", transition: "all 0.15s ease",
};

const iconBtnStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: "28px", height: "28px", borderRadius: "6px",
    border: "none", background: "transparent",
    color: "var(--color-text-muted)", cursor: "pointer",
};

const labelStyle: React.CSSProperties = {
    display: "block", fontSize: "0.7rem", fontWeight: 600,
    textTransform: "uppercase", letterSpacing: "0.04em",
    color: "var(--color-text-muted)", marginBottom: "6px",
};

const inputStyle: React.CSSProperties = {
    width: "100%", padding: "8px 12px", borderRadius: "8px",
    border: "1px solid var(--color-border)", background: "var(--color-surface)",
    color: "var(--color-text-primary)", fontSize: "0.85rem", outline: "none",
};

const selectStyle: React.CSSProperties = {
    ...inputStyle, appearance: "auto" as const,
};
