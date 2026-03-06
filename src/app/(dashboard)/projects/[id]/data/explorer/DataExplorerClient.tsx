"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import {
    Filter, Download, BarChart3, LineChart, Table2,
    X, Plus, Loader2, Database, Columns3, RefreshCw,
} from "lucide-react";
import DateRangePicker, { type CompareConfig } from "@/components/ui/DateRangePicker";
import FieldPicker, { type FieldDef } from "@/components/data/FieldPicker";
import DataTable from "@/components/data/DataTable";

// ─── Types ───

interface FilterConfig {
    id: string;
    field: string;
    operator: string;
    value: string;
}

interface QueryResult {
    rows: Record<string, string | number>[];
    totalRows: number;
    loadTimeMs: number;
}

type ChartType = "table" | "line" | "bar";

// ─── Helpers ───

function getDateString(daysOffset: number): string {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    return d.toISOString().split("T")[0];
}

// ─── Simple Chart ───

function SimpleChart({
    rows, metrics, dateDimension, type,
}: {
    rows: Record<string, string | number>[];
    metrics: string[];
    dateDimension?: string;
    type: "line" | "bar";
}) {
    if (!dateDimension || rows.length === 0 || metrics.length === 0) {
        return (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--color-text-muted)", fontSize: "0.85rem" }}>
                Selecteer &quot;Datum&quot; als dimensie om een grafiek te tonen
            </div>
        );
    }

    const metric = metrics[0];
    const sorted = [...rows].sort((a, b) => String(a[dateDimension]).localeCompare(String(b[dateDimension])));
    const values = sorted.map(r => Number(r[metric]) || 0);
    const maxVal = Math.max(...values, 1);
    const W = 800, H = 260, PAD = 40;

    if (type === "bar") {
        const barW = Math.max(2, (W - PAD * 2) / values.length - 2);
        return (
            <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "100%" }}>
                {values.map((v, i) => {
                    const barH = (v / maxVal) * (H - PAD * 2);
                    const x = PAD + (i * ((W - PAD * 2) / values.length));
                    return <rect key={i} x={x} y={H - PAD - barH} width={barW} height={barH} rx={2} fill="rgba(99, 102, 241, 0.7)" />;
                })}
            </svg>
        );
    }

    const points = values.map((v, i) => {
        const x = PAD + (i / Math.max(values.length - 1, 1)) * (W - PAD * 2);
        const y = H - PAD - (v / maxVal) * (H - PAD * 2);
        return `${x},${y}`;
    }).join(" ");

    return (
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "100%" }}>
            <polyline points={points} fill="none" stroke="rgb(99, 102, 241)" strokeWidth="2" strokeLinejoin="round" />
            {values.map((v, i) => {
                const x = PAD + (i / Math.max(values.length - 1, 1)) * (W - PAD * 2);
                const y = H - PAD - (v / maxVal) * (H - PAD * 2);
                return <circle key={i} cx={x} cy={y} r={3} fill="rgb(99, 102, 241)" />;
            })}
        </svg>
    );
}

// ─── Styles ───

const CURRENCIES = ["EUR", "USD", "GBP", "SEK", "NOK", "DKK", "CHF", "PLN"];

const selectStyle: React.CSSProperties = {
    padding: "8px 12px", borderRadius: "8px", fontSize: "0.825rem",
    border: "1px solid var(--color-border)", background: "var(--color-surface)",
    color: "var(--color-text-primary)", cursor: "pointer", outline: "none",
};

const btnStyle = (active: boolean): React.CSSProperties => ({
    display: "flex", alignItems: "center", gap: "6px",
    padding: "8px 14px", borderRadius: "8px", fontSize: "0.825rem",
    border: active ? "1px solid var(--color-brand)" : "1px solid var(--color-border)",
    background: active ? "rgba(99,102,241,0.1)" : "var(--color-surface)",
    color: active ? "var(--color-brand)" : "var(--color-text-primary)",
    cursor: "pointer", fontWeight: 500, transition: "all 0.15s ease",
});

// ─── Main Component ───

export default function DataExplorerClient() {
    const params = useParams();
    const projectId = params.id as string;

    // Field data
    const [allDimensions, setAllDimensions] = useState<FieldDef[]>([]);
    const [allMetrics, setAllMetrics] = useState<FieldDef[]>([]);
    const [fieldsLoading, setFieldsLoading] = useState(true);

    // Selection state
    const [selectedDimensions, setSelectedDimensions] = useState<string[]>([]);
    const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
    const [dateRange, setDateRange] = useState({ from: getDateString(-30), to: getDateString(0) });
    const [compareMode, setCompareMode] = useState("");
    const [currency, setCurrency] = useState("EUR");
    const [filters, setFilters] = useState<FilterConfig[]>([]);
    const [chartType, setChartType] = useState<ChartType>("table");
    const [showFilters, setShowFilters] = useState(false);
    const [showFieldPicker, setShowFieldPicker] = useState(false);

    // Data
    const [result, setResult] = useState<QueryResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Ref to track pending date reload
    const pendingDateReload = useRef(false);

    // Sources
    const [connections, setConnections] = useState<{ id: string; name: string; connectorName: string }[]>([]);
    const [selectedSources, setSelectedSources] = useState<string[]>([]);

    // ─── Fetch fields ───
    useEffect(() => {
        setFieldsLoading(true);
        fetch(`/api/data-integration/explorer/fields?projectId=${projectId}`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    const dims: FieldDef[] = (data.dimensions || []).map((d: FieldDef & { hasData?: boolean }) => ({
                        slug: d.slug, name: d.name, type: "dimension" as const,
                        category: d.category || "Overig", dataType: d.dataType || "STRING",
                        description: d.description,
                        connectorSlug: d.connectorSlug, connectorName: d.connectorName,
                        hasData: d.hasData !== false,
                    }));
                    const mets: FieldDef[] = (data.metrics || []).map((m: FieldDef & { hasData?: boolean }) => ({
                        slug: m.slug, name: m.name, type: "metric" as const,
                        category: m.category || "Overig", dataType: m.dataType || "NUMBER",
                        description: m.description,
                        connectorSlug: m.connectorSlug, connectorName: m.connectorName,
                        hasData: m.hasData !== false,
                    }));
                    setAllDimensions(dims);
                    setAllMetrics(mets);
                }
            })
            .catch(() => { /* ignore */ })
            .finally(() => setFieldsLoading(false));
    }, [projectId]);

    // Fetch connections
    useEffect(() => {
        fetch(`/api/data-integration/connections?projectId=${projectId}`)
            .then(res => res.json())
            .then(data => {
                if (data.success && data.connections) {
                    setConnections(data.connections.map((c: { id: string; name: string; connector?: { name: string } }) => ({
                        id: c.id, name: c.name,
                        connectorName: c.connector?.name || c.name,
                    })));
                }
            })
            .catch(() => { /* ignore */ });
    }, [projectId]);

    // ─── Load Data (explicit, not auto) ───
    const loadData = useCallback(async () => {
        if (selectedDimensions.length === 0 || selectedMetrics.length === 0) return;

        setLoading(true);
        setError(null);
        const start = Date.now();

        try {
            const res = await fetch("/api/data-integration/explorer", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    projectId,
                    connectionIds: selectedSources.length > 0 ? selectedSources : undefined,
                    dimensions: selectedDimensions,
                    metrics: selectedMetrics,
                    dateFrom: dateRange.from,
                    dateTo: dateRange.to,
                    compare: compareMode || undefined,
                    currency,
                    filters: filters.map(f => ({ field: f.field, operator: f.operator, value: f.value })),
                    limit: 100000,
                }),
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || "Query failed");

            setResult({
                rows: data.rows || [],
                totalRows: data.totalRows || 0,
                loadTimeMs: Date.now() - start,
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load data");
        } finally {
            setLoading(false);
        }
    }, [projectId, selectedSources, selectedDimensions, selectedMetrics, dateRange, compareMode, currency, filters]);

    // Auto-reload when date range changes via "Toepassen"
    useEffect(() => {
        if (pendingDateReload.current && result) {
            pendingDateReload.current = false;
            loadData();
        }
    }, [dateRange, compareMode]); // eslint-disable-line react-hooks/exhaustive-deps

    // ─── Handlers ───

    const handleToggle = useCallback((slug: string, type: "dimension" | "metric") => {
        if (type === "dimension") {
            setSelectedDimensions(prev =>
                prev.includes(slug) ? prev.filter(d => d !== slug) : [...prev, slug]
            );
        } else {
            setSelectedMetrics(prev =>
                prev.includes(slug) ? prev.filter(m => m !== slug) : [...prev, slug]
            );
        }
    }, []);

    const handleClearAll = useCallback(() => {
        setSelectedDimensions([]);
        setSelectedMetrics([]);
    }, []);

    const addFilter = useCallback(() => {
        setFilters(prev => [...prev, {
            id: crypto.randomUUID(),
            field: selectedDimensions[0] || "campaign_name",
            operator: "contains",
            value: "",
        }]);
        setShowFilters(true);
    }, [selectedDimensions]);

    const exportCSV = useCallback(() => {
        if (!result) return;
        const allCols = [...selectedDimensions, ...selectedMetrics];
        const header = allCols.join(",");
        const csvRows = result.rows.map(row =>
            allCols.map(col => {
                const val = row[col];
                return typeof val === "string" && val.includes(",") ? `"${val}"` : val ?? "";
            }).join(",")
        );
        const csv = [header, ...csvRows].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `data-explorer-${dateRange.from}-${dateRange.to}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }, [result, selectedDimensions, selectedMetrics, dateRange]);

    const totalSelected = selectedDimensions.length + selectedMetrics.length;

    // ─── Render ───

    if (fieldsLoading) {
        return (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", gap: "12px", color: "var(--color-text-muted)" }}>
                <Loader2 size={24} className="spin" />
                <span>Velden laden...</span>
            </div>
        );
    }

    return (
        <div style={{ padding: "32px", maxWidth: "1400px", margin: "0 auto", minHeight: "calc(100vh - 120px)" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
                <div>
                    <h1 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "4px" }}>Data Explorer</h1>
                    <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem", margin: 0 }}>
                        Verken en analyseer data van alle gekoppelde platforms.
                    </p>
                </div>
            </div>

            {/* Toolbar */}
            <div style={{
                display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center",
                padding: "12px 16px", borderRadius: "12px",
                background: "var(--color-surface-elevated)", border: "1px solid var(--color-border)",
                marginBottom: "16px",
            }}>
                {/* Kies velden button */}
                <button
                    onClick={() => setShowFieldPicker(true)}
                    style={{
                        display: "flex", alignItems: "center", gap: "8px",
                        padding: "8px 16px", borderRadius: "8px",
                        border: totalSelected > 0 ? "1px solid var(--color-brand)" : "1px solid var(--color-border)",
                        background: totalSelected > 0 ? "rgba(99,102,241,0.1)" : "var(--color-surface)",
                        color: totalSelected > 0 ? "var(--color-brand)" : "var(--color-text-primary)",
                        cursor: "pointer", fontWeight: 600, fontSize: "0.85rem",
                        transition: "all 0.15s ease",
                    }}
                >
                    <Columns3 size={16} />
                    Kies velden
                    {totalSelected > 0 && (
                        <span style={{
                            background: "var(--color-brand)", color: "#fff",
                            fontSize: "0.7rem", fontWeight: 700,
                            padding: "1px 7px", borderRadius: "10px",
                            minWidth: "20px", textAlign: "center",
                        }}>
                            {totalSelected}
                        </span>
                    )}
                </button>

                {/* Date Range */}
                <DateRangePicker
                    dateRange={dateRange}
                    onApply={(range, compare) => {
                        setDateRange(range);
                        if (compare) setCompareMode(compare.enabled ? compare.mode : "");
                        // Trigger data reload after applying date range
                        pendingDateReload.current = true;
                    }}
                    compare={compareMode ? { enabled: true, mode: compareMode as CompareConfig["mode"] } : undefined}
                    showCompare={true}
                />

                {/* Currency */}
                <select value={currency} onChange={e => setCurrency(e.target.value)} style={selectStyle}>
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                {/* Filters */}
                <button onClick={addFilter} style={btnStyle(showFilters && filters.length > 0)}>
                    <Filter size={14} />
                    <span>Filter{filters.length > 0 ? ` (${filters.length})` : ""}</span>
                    <Plus size={12} />
                </button>

                <div style={{ flex: 1 }} />

                {/* Chart type */}
                <div style={{ display: "flex", gap: "2px", background: "var(--color-surface)", borderRadius: "8px", padding: "3px" }}>
                    {([
                        { type: "table" as ChartType, icon: Table2 },
                        { type: "bar" as ChartType, icon: BarChart3 },
                        { type: "line" as ChartType, icon: LineChart },
                    ]).map(({ type, icon: Icon }) => (
                        <button
                            key={type}
                            onClick={() => setChartType(type)}
                            style={{
                                display: "flex", alignItems: "center", padding: "5px 8px",
                                borderRadius: "6px", border: "none", cursor: "pointer",
                                background: chartType === type ? "var(--color-brand)" : "transparent",
                                color: chartType === type ? "#fff" : "var(--color-text-secondary)",
                                transition: "all 0.15s ease",
                            }}
                        >
                            <Icon size={14} />
                        </button>
                    ))}
                </div>

                {/* Reload button */}
                {result && (
                    <button
                        onClick={loadData}
                        disabled={loading}
                        style={{
                            display: "flex", alignItems: "center", gap: "6px",
                            padding: "8px 14px", borderRadius: "8px", border: "none",
                            background: "var(--color-brand)", color: "#fff",
                            fontWeight: 600, fontSize: "0.825rem",
                            cursor: loading ? "wait" : "pointer",
                            opacity: loading ? 0.7 : 1, transition: "all 0.2s ease",
                        }}
                    >
                        {loading ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />}
                        {loading ? "Laden..." : "Herladen"}
                    </button>
                )}

                {/* Export */}
                {result && (
                    <button onClick={exportCSV} style={btnStyle(false)} title="Exporteer als CSV">
                        <Download size={14} />
                    </button>
                )}
            </div>

            {/* Filter Panel */}
            {showFilters && filters.length > 0 && (
                <div style={{
                    padding: "14px 16px", borderRadius: "12px", marginBottom: "16px",
                    background: "var(--color-surface-elevated)", border: "1px solid var(--color-border)",
                }}>
                    {filters.map(f => (
                        <div key={f.id} style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "6px" }}>
                            <select
                                value={f.field}
                                onChange={e => setFilters(prev => prev.map(x => x.id === f.id ? { ...x, field: e.target.value } : x))}
                                style={selectStyle}
                            >
                                <optgroup label="Dimensies">
                                    {allDimensions.map(d => <option key={d.slug} value={d.slug}>{d.name}</option>)}
                                </optgroup>
                                <optgroup label="Metrics">
                                    {allMetrics.map(m => <option key={m.slug} value={m.slug}>{m.name}</option>)}
                                </optgroup>
                            </select>
                            <select
                                value={f.operator}
                                onChange={e => setFilters(prev => prev.map(x => x.id === f.id ? { ...x, operator: e.target.value } : x))}
                                style={{ ...selectStyle, width: "140px" }}
                            >
                                <option value="contains">bevat</option>
                                <option value="eq">is gelijk aan</option>
                                <option value="neq">is niet gelijk aan</option>
                                <option value="gt">groter dan</option>
                                <option value="gte">≥</option>
                                <option value="lt">kleiner dan</option>
                                <option value="lte">≤</option>
                            </select>
                            <input
                                type="text"
                                value={f.value}
                                onChange={e => setFilters(prev => prev.map(x => x.id === f.id ? { ...x, value: e.target.value } : x))}
                                placeholder="Waarde..."
                                style={{ ...selectStyle, flex: 1, cursor: "text" }}
                            />
                            <button
                                onClick={() => setFilters(prev => prev.filter(x => x.id !== f.id))}
                                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", padding: "4px" }}
                            >
                                <X size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Selected fields pills (compact, above table) */}
            {totalSelected > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "12px", alignItems: "center" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginRight: "4px" }}>Velden:</span>
                    {selectedDimensions.map(slug => {
                        const f = allDimensions.find(d => d.slug === slug);
                        return (
                            <span key={slug} style={{
                                display: "inline-flex", alignItems: "center", gap: "4px",
                                padding: "3px 8px", borderRadius: "6px", fontSize: "0.72rem",
                                background: "rgba(99,102,241,0.1)", color: "var(--color-brand)",
                                fontWeight: 500,
                            }}>
                                <Database size={10} />
                                {f?.name || slug}
                            </span>
                        );
                    })}
                    {selectedMetrics.map(slug => {
                        const f = allMetrics.find(m => m.slug === slug);
                        return (
                            <span key={slug} style={{
                                display: "inline-flex", alignItems: "center", gap: "4px",
                                padding: "3px 8px", borderRadius: "6px", fontSize: "0.72rem",
                                background: "rgba(52,211,153,0.08)", color: "#34d399",
                                fontWeight: 500,
                            }}>
                                {f?.name || slug}
                            </span>
                        );
                    })}
                </div>
            )}

            {/* Error */}
            {error && (
                <div style={{
                    padding: "14px 16px", borderRadius: "10px", marginBottom: "16px",
                    background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)",
                    color: "#ef4444", fontSize: "0.85rem",
                }}>
                    {error}
                </div>
            )}

            {/* Chart */}
            {chartType !== "table" && result && (
                <div style={{
                    height: "280px", borderRadius: "12px", marginBottom: "16px",
                    background: "var(--color-surface-elevated)", border: "1px solid var(--color-border)",
                    display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
                }}>
                    <SimpleChart
                        rows={result.rows}
                        metrics={selectedMetrics}
                        dateDimension={selectedDimensions.includes("date") ? "date" : undefined}
                        type={chartType}
                    />
                </div>
            )}

            {/* Data Table */}
            {result && !loading && (
                <DataTable
                    rows={result.rows}
                    dimensions={selectedDimensions}
                    metrics={selectedMetrics}
                    dimensionDefs={allDimensions}
                    metricDefs={allMetrics}
                    currency={currency}
                    totalRows={result.totalRows}
                    loadTimeMs={result.loadTimeMs}
                />
            )}

            {/* Skeleton Loading Table — show selected fields with shimmer rows */}
            {loading && totalSelected > 0 && (
                <div style={{
                    borderRadius: "12px", overflow: "hidden",
                    background: "var(--color-surface-elevated)", border: "1px solid var(--color-border)",
                }}>
                    {/* Loading header */}
                    <div style={{
                        padding: "12px 20px", borderBottom: "1px solid var(--color-border)",
                        display: "flex", alignItems: "center", gap: "10px",
                    }}>
                        <Loader2 size={16} className="spin" style={{ color: "var(--color-brand)" }} />
                        <span style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>Data ophalen...</span>
                    </div>

                    {/* Table with headers */}
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                                {selectedDimensions.map(slug => {
                                    const f = allDimensions.find(d => d.slug === slug);
                                    return (
                                        <th key={slug} style={{
                                            padding: "10px 16px", textAlign: "left",
                                            fontSize: "0.75rem", fontWeight: 600,
                                            color: "var(--color-brand)",
                                            textTransform: "uppercase", letterSpacing: "0.05em",
                                        }}>
                                            {f?.name || slug}
                                        </th>
                                    );
                                })}
                                {selectedMetrics.map(slug => {
                                    const f = allMetrics.find(m => m.slug === slug);
                                    return (
                                        <th key={slug} style={{
                                            padding: "10px 16px", textAlign: "right",
                                            fontSize: "0.75rem", fontWeight: 600,
                                            color: "#34d399",
                                            textTransform: "uppercase", letterSpacing: "0.05em",
                                        }}>
                                            {f?.name || slug}
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {Array.from({ length: 8 }).map((_, rowIdx) => (
                                <tr key={rowIdx} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                                    {selectedDimensions.map((slug, colIdx) => (
                                        <td key={slug} style={{ padding: "12px 16px" }}>
                                            <div style={{
                                                height: "14px",
                                                width: `${55 + ((rowIdx + colIdx) % 4) * 15}%`,
                                                borderRadius: "4px",
                                                background: "linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)",
                                                backgroundSize: "200% 100%",
                                                animation: `shimmer 1.5s ease-in-out infinite`,
                                                animationDelay: `${rowIdx * 0.05}s`,
                                            }} />
                                        </td>
                                    ))}
                                    {selectedMetrics.map((slug, colIdx) => (
                                        <td key={slug} style={{ padding: "12px 16px", textAlign: "right" }}>
                                            <div style={{
                                                height: "14px",
                                                width: `${40 + ((rowIdx + colIdx) % 3) * 15}%`,
                                                borderRadius: "4px",
                                                marginLeft: "auto",
                                                background: "linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)",
                                                backgroundSize: "200% 100%",
                                                animation: `shimmer 1.5s ease-in-out infinite`,
                                                animationDelay: `${rowIdx * 0.05}s`,
                                            }} />
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Generic loading (no fields selected yet) */}
            {loading && totalSelected === 0 && (
                <div style={{
                    padding: "80px 32px", textAlign: "center", borderRadius: "12px",
                    background: "var(--color-surface-elevated)", border: "1px solid var(--color-border)",
                    color: "var(--color-text-muted)",
                }}>
                    <Loader2 size={32} className="spin" style={{ marginBottom: "16px", color: "var(--color-brand)" }} />
                    <p>Data laden...</p>
                </div>
            )}

            {/* Empty state */}
            {!result && !loading && !error && (
                <div style={{
                    padding: "80px 32px", textAlign: "center", borderRadius: "12px",
                    background: "var(--color-surface-elevated)", border: "1px solid var(--color-border)",
                    color: "var(--color-text-muted)",
                }}>
                    <Columns3 size={48} style={{ opacity: 0.15, marginBottom: "16px" }} />
                    <p style={{ fontSize: "1.05rem", fontWeight: 500, marginBottom: "8px", color: "var(--color-text-secondary)" }}>
                        Selecteer velden om data te verkennen
                    </p>
                    <p style={{ fontSize: "0.85rem", marginBottom: "20px" }}>
                        Klik op &quot;Kies velden&quot; om dimensies en metrics te selecteren.
                    </p>
                    <button
                        onClick={() => setShowFieldPicker(true)}
                        style={{
                            display: "inline-flex", alignItems: "center", gap: "8px",
                            padding: "10px 24px", borderRadius: "8px", border: "none",
                            background: "var(--color-brand)", color: "#fff",
                            fontSize: "0.875rem", fontWeight: 600, cursor: "pointer",
                        }}
                    >
                        <Columns3 size={16} />
                        Kies velden
                    </button>
                </div>
            )}

            {/* Field Picker Side Panel */}
            <FieldPicker
                open={showFieldPicker}
                onClose={() => setShowFieldPicker(false)}
                dimensions={allDimensions}
                metrics={allMetrics}
                selectedDimensions={selectedDimensions}
                selectedMetrics={selectedMetrics}
                onToggle={handleToggle}
                onClearAll={handleClearAll}
                onLoadData={loadData}
                loading={loading}
                connections={connections}
                selectedSources={selectedSources}
                onSourceChange={setSelectedSources}
            />
        </div>
    );
}
