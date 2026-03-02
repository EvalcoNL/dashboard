"use client";

import { useState, useMemo } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

// ─── Types ───

export interface FieldDef {
    slug: string;
    name: string;
    type: "dimension" | "metric";
    dataType: string;
    category?: string;
}

interface DataTableProps {
    rows: Record<string, string | number | null>[];
    dimensions: string[];
    metrics: string[];
    dimensionDefs: FieldDef[];
    metricDefs: FieldDef[];
    currency?: string;
    totalRows?: number;
    loadTimeMs?: number;
}

type SortDir = "asc" | "desc";

// ─── Formatting ───

function formatValue(val: unknown, dataType: string, currency = "EUR"): string {
    if (val === null || val === undefined || val === "") return "—";
    const num = Number(val);

    switch (dataType) {
        case "CURRENCY":
            if (isNaN(num)) return String(val);
            return new Intl.NumberFormat("nl-NL", {
                style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2,
            }).format(num);
        case "PERCENTAGE":
            if (isNaN(num)) return String(val);
            return `${num.toFixed(2)}%`;
        case "NUMBER":
            if (isNaN(num)) return String(val);
            return new Intl.NumberFormat("nl-NL", {
                maximumFractionDigits: 2,
            }).format(num);
        case "DATE":
            return String(val);
        case "DURATION":
            if (isNaN(num)) return String(val);
            const mins = Math.floor(num / 60);
            const secs = Math.round(num % 60);
            return `${mins}m ${secs}s`;
        default:
            return String(val);
    }
}

function calculateDerivedTotal(rows: Record<string, string | number | null>[], metric: string): number {
    const sumOf = (key: string) => rows.reduce((s, r) => s + (Number(r[key]) || 0), 0);

    switch (metric) {
        case "ctr": {
            const impr = sumOf("impressions");
            return impr > 0 ? (sumOf("clicks") / impr) * 100 : 0;
        }
        case "cpc": {
            const clicks = sumOf("clicks");
            return clicks > 0 ? sumOf("cost") / clicks : 0;
        }
        case "cpm": {
            const impr = sumOf("impressions");
            return impr > 0 ? (sumOf("cost") / impr) * 1000 : 0;
        }
        case "roas": {
            const cost = sumOf("cost");
            return cost > 0 ? sumOf("conversion_value") / cost : 0;
        }
        case "conversion_rate": {
            const clicks = sumOf("clicks");
            return clicks > 0 ? (sumOf("conversions") / clicks) * 100 : 0;
        }
        case "cost_per_conversion": {
            const conv = sumOf("conversions");
            return conv > 0 ? sumOf("cost") / conv : 0;
        }
        default:
            return sumOf(metric);
    }
}

// ─── Component ───

export default function DataTable({
    rows,
    dimensions,
    metrics,
    dimensionDefs,
    metricDefs,
    currency = "EUR",
    totalRows,
    loadTimeMs,
}: DataTableProps) {
    const [sortField, setSortField] = useState<string | null>(null);
    const [sortDir, setSortDir] = useState<SortDir>("desc");
    const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});

    const allCols = useMemo(() => [...dimensions, ...metrics], [dimensions, metrics]);

    // Apply filters + sort
    const displayRows = useMemo(() => {
        let filtered = [...rows];

        // Column filters
        for (const [field, filterVal] of Object.entries(columnFilters)) {
            if (filterVal) {
                filtered = filtered.filter(row =>
                    String(row[field] ?? "").toLowerCase().includes(filterVal.toLowerCase())
                );
            }
        }

        // Sort
        if (sortField) {
            filtered.sort((a, b) => {
                const aVal = a[sortField] ?? "";
                const bVal = b[sortField] ?? "";
                const cmp = typeof aVal === "number" && typeof bVal === "number"
                    ? aVal - bVal
                    : String(aVal).localeCompare(String(bVal));
                return sortDir === "asc" ? cmp : -cmp;
            });
        }

        return filtered;
    }, [rows, sortField, sortDir, columnFilters]);

    const handleSort = (col: string) => {
        if (sortField === col) {
            setSortDir(prev => prev === "asc" ? "desc" : "asc");
        } else {
            setSortField(col);
            setSortDir(dimensions.includes(col) ? "asc" : "desc");
        }
    };

    const getFieldDef = (col: string): FieldDef | undefined =>
        dimensionDefs.find(f => f.slug === col) || metricDefs.find(f => f.slug === col);

    return (
        <div>
            {/* Status bar */}
            <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                marginBottom: "8px", fontSize: "0.8rem", color: "var(--color-text-secondary)",
            }}>
                <span>
                    {displayRows.length.toLocaleString("nl-NL")} rijen
                    {totalRows && displayRows.length !== totalRows
                        ? ` (gefilterd van ${totalRows.toLocaleString("nl-NL")})`
                        : ""
                    }
                </span>
                {loadTimeMs !== undefined && <span>Geladen in {loadTimeMs}ms</span>}
            </div>

            {/* Table */}
            <div style={{
                borderRadius: "12px", overflow: "hidden",
                border: "1px solid var(--color-border)",
                background: "var(--color-surface-elevated)",
            }}>
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem" }}>
                        <thead>
                            <tr>
                                {allCols.map(col => {
                                    const isDim = dimensions.includes(col);
                                    const field = getFieldDef(col);
                                    const isSorted = sortField === col;

                                    return (
                                        <th
                                            key={col}
                                            onClick={() => handleSort(col)}
                                            style={{
                                                padding: "10px 14px",
                                                textAlign: isDim ? "left" : "right",
                                                fontWeight: 600, fontSize: "0.725rem",
                                                textTransform: "uppercase", letterSpacing: "0.04em",
                                                color: isSorted ? "var(--color-brand)" : "var(--color-text-muted)",
                                                borderBottom: "2px solid var(--color-border)",
                                                background: "var(--color-surface)",
                                                whiteSpace: "nowrap", cursor: "pointer", userSelect: "none",
                                                position: "sticky", top: 0, zIndex: 2,
                                            }}
                                        >
                                            <div style={{
                                                display: "flex", alignItems: "center", gap: "4px",
                                                justifyContent: isDim ? "flex-start" : "flex-end",
                                            }}>
                                                {field?.name || col}
                                                {isSorted
                                                    ? (sortDir === "asc"
                                                        ? <ArrowUp size={12} />
                                                        : <ArrowDown size={12} />)
                                                    : <ArrowUpDown size={12} style={{ opacity: 0.3 }} />
                                                }
                                            </div>
                                        </th>
                                    );
                                })}
                            </tr>
                            {/* Column filter row */}
                            <tr>
                                {allCols.map(col => {
                                    const isDim = dimensions.includes(col);
                                    return (
                                        <th key={`f-${col}`} style={{
                                            padding: "4px 6px",
                                            background: "var(--color-surface)",
                                            borderBottom: "1px solid var(--color-border)",
                                        }}>
                                            {isDim && (
                                                <input
                                                    type="text"
                                                    value={columnFilters[col] || ""}
                                                    onChange={e => setColumnFilters(prev => ({ ...prev, [col]: e.target.value }))}
                                                    placeholder="Filter..."
                                                    style={{
                                                        width: "100%", padding: "3px 6px",
                                                        border: "1px solid var(--color-border)",
                                                        borderRadius: "4px", fontSize: "0.72rem",
                                                        background: "var(--color-surface-elevated)",
                                                        color: "var(--color-text-primary)", outline: "none",
                                                    }}
                                                />
                                            )}
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {/* Totals row (Funnel "All" style) */}
                            {displayRows.length > 0 && (
                                <tr style={{
                                    background: "rgba(99, 102, 241, 0.06)",
                                    borderBottom: "2px solid var(--color-border)",
                                    fontWeight: 600,
                                }}>
                                    {allCols.map((col, idx) => {
                                        const isDim = dimensions.includes(col);
                                        const field = getFieldDef(col);

                                        if (isDim) {
                                            return (
                                                <td key={col} style={{
                                                    padding: "10px 14px",
                                                    color: "var(--color-brand)",
                                                    fontWeight: 700,
                                                }}>
                                                    {idx === 0 ? "All" : ""}
                                                </td>
                                            );
                                        }

                                        const isCalc = field?.category === "Berekend" || field?.category === "Calculated";
                                        const total = isCalc
                                            ? calculateDerivedTotal(displayRows, col)
                                            : displayRows.reduce((s, r) => s + (Number(r[col]) || 0), 0);

                                        return (
                                            <td key={col} style={{
                                                padding: "10px 14px", textAlign: "right",
                                                fontVariantNumeric: "tabular-nums",
                                                color: "var(--color-text-primary)",
                                            }}>
                                                {formatValue(total, field?.dataType || "NUMBER", currency)}
                                            </td>
                                        );
                                    })}
                                </tr>
                            )}

                            {/* Data rows */}
                            {displayRows.slice(0, 500).map((row, idx) => (
                                <tr
                                    key={idx}
                                    style={{ borderBottom: "1px solid var(--color-border)" }}
                                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                                >
                                    {allCols.map(col => {
                                        const isDim = dimensions.includes(col);
                                        const field = getFieldDef(col);

                                        return (
                                            <td
                                                key={col}
                                                style={{
                                                    padding: "8px 14px",
                                                    textAlign: isDim ? "left" : "right",
                                                    fontVariantNumeric: isDim ? "normal" : "tabular-nums",
                                                    color: "var(--color-text-primary)",
                                                    whiteSpace: "nowrap",
                                                    fontSize: "0.8rem",
                                                }}
                                            >
                                                {formatValue(row[col], field?.dataType || "STRING", currency)}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}

                            {displayRows.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={allCols.length}
                                        style={{
                                            padding: "48px", textAlign: "center",
                                            color: "var(--color-text-muted)", fontSize: "0.9rem",
                                        }}
                                    >
                                        Geen data gevonden voor de geselecteerde configuratie.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
