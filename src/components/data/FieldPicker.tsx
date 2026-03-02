"use client";

import { useState, useMemo } from "react";
import {
    Search, ChevronDown, ChevronRight, X, Check,
    Database, Loader2,
} from "lucide-react";

// ─── Types ───

export interface FieldDef {
    slug: string;
    name: string;
    type: "dimension" | "metric";
    category: string;
    dataType: string;
    description?: string;
    connectorSlug?: string;
    connectorName?: string;
    hasData?: boolean;
}

export interface FieldGroup {
    slug: string;
    name: string;
    fields: FieldDef[];
}

export interface FieldPickerProps {
    open: boolean;
    onClose: () => void;
    dimensions: FieldDef[];
    metrics: FieldDef[];
    selectedDimensions: string[];
    selectedMetrics: string[];
    onToggle: (slug: string, type: "dimension" | "metric") => void;
    onClearAll?: () => void;
    onLoadData: () => void;
    loading?: boolean;
    // Source selection
    connections: { id: string; name: string; connectorName: string }[];
    selectedSources: string[];
    onSourceChange: (sources: string[]) => void;
}

// ─── Type badge styles ───

const TYPE_BADGE: Record<string, { label: string; color: string; bg: string }> = {
    STRING: { label: "AZ", color: "#94a3b8", bg: "rgba(148,163,184,0.10)" },
    NUMBER: { label: "123", color: "#60a5fa", bg: "rgba(96,165,250,0.10)" },
    CURRENCY: { label: "€", color: "#34d399", bg: "rgba(52,211,153,0.10)" },
    PERCENTAGE: { label: "%", color: "#f59e0b", bg: "rgba(245,158,11,0.10)" },
    DATE: { label: "📅", color: "#a78bfa", bg: "rgba(167,139,250,0.10)" },
    DURATION: { label: "⏱", color: "#fb923c", bg: "rgba(251,146,60,0.10)" },
};

const CONNECTOR_COLORS: Record<string, string> = {
    "google-ads": "#4285F4",
    "meta-ads": "#0081FB",
    "google-analytics": "#E37400",
    "ga4": "#E37400",
    "linkedin-ads": "#0A66C2",
    "tiktok-ads": "#000000",
    "microsoft-ads": "#00A4EF",
    "calculated": "#8b5cf6",
};

// ─── Component ───

export default function FieldPicker({
    open,
    onClose,
    dimensions,
    metrics,
    selectedDimensions,
    selectedMetrics,
    onToggle,
    onClearAll,
    onLoadData,
    loading,
    connections,
    selectedSources,
    onSourceChange,
}: FieldPickerProps) {
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState<"all" | "dimension" | "metric">("all");
    const [dataFilter, setDataFilter] = useState<"active" | "inactive" | "all">("active");
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

    // Group fields by connector
    const groups = useMemo(() => {
        const allFields = [...dimensions, ...metrics];

        const filtered = allFields.filter(f => {
            if (typeFilter !== "all" && f.type !== typeFilter) return false;
            // Data status filter
            if (dataFilter === "active" && f.hasData === false) return false;
            if (dataFilter === "inactive" && f.hasData !== false) return false;
            if (search) {
                const s = search.toLowerCase();
                return f.name.toLowerCase().includes(s) ||
                    f.slug.toLowerCase().includes(s) ||
                    f.category.toLowerCase().includes(s);
            }
            return true;
        });

        const groupMap = new Map<string, FieldGroup>();
        for (const field of filtered) {
            const groupSlug = field.connectorSlug || "overig";
            const groupName = field.connectorName || "Overig";
            if (!groupMap.has(groupSlug)) {
                groupMap.set(groupSlug, { slug: groupSlug, name: groupName, fields: [] });
            }
            groupMap.get(groupSlug)!.fields.push(field);
        }

        // Move calculated metrics to their own group
        const calcFields = filtered.filter(f => f.category === "Berekend");
        if (calcFields.length > 0 && !groupMap.has("calculated")) {
            groupMap.set("calculated", { slug: "calculated", name: "Berekend", fields: calcFields });
            for (const [key, group] of groupMap) {
                if (key !== "calculated") {
                    group.fields = group.fields.filter(f => f.category !== "Berekend");
                    if (group.fields.length === 0) groupMap.delete(key);
                }
            }
        }

        return Array.from(groupMap.values());
    }, [dimensions, metrics, search, typeFilter, dataFilter]);

    const allSelected = new Set([...selectedDimensions, ...selectedMetrics]);
    const totalSelected = allSelected.size;

    const toggleGroup = (slug: string) => {
        setCollapsedGroups(prev => {
            const next = new Set(prev);
            if (next.has(slug)) next.delete(slug);
            else next.add(slug);
            return next;
        });
    };

    if (!open) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onClose}
                style={{
                    position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
                    zIndex: 998, transition: "opacity 0.2s ease",
                }}
            />

            {/* Side Panel */}
            <div style={{
                position: "fixed", top: 0, right: 0, bottom: 0,
                width: "440px", maxWidth: "90vw",
                background: "var(--color-surface-elevated)",
                borderLeft: "1px solid var(--color-border)",
                zIndex: 999, display: "flex", flexDirection: "column",
                boxShadow: "-8px 0 32px rgba(0,0,0,0.3)",
                animation: "slideInRight 0.2s ease",
            }}>
                {/* Header */}
                <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "16px 20px", borderBottom: "1px solid var(--color-border)",
                }}>
                    <div>
                        <h2 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>Kies velden</h2>
                        <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                            {totalSelected} veld{totalSelected !== 1 ? "en" : ""} geselecteerd
                        </span>
                    </div>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        {totalSelected > 0 && (
                            <button
                                onClick={onClearAll}
                                style={{
                                    fontSize: "0.75rem", color: "var(--color-text-muted)",
                                    background: "none", border: "none", cursor: "pointer",
                                    textDecoration: "underline",
                                }}
                            >
                                Alles wissen
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            style={{
                                background: "none", border: "none", cursor: "pointer",
                                color: "var(--color-text-muted)", padding: "4px",
                            }}
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Data Status Filter */}
                <div style={{
                    padding: "12px 20px", borderBottom: "1px solid var(--color-border)",
                    background: "var(--color-surface)",
                }}>
                    <div style={{
                        fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase",
                        color: "var(--color-text-muted)", letterSpacing: "0.08em", marginBottom: "8px",
                    }}>
                        Status
                    </div>
                    <div style={{ display: "flex", gap: "6px" }}>
                        {(["active", "all", "inactive"] as const).map(status => {
                            const isActive = dataFilter === status;
                            const label = status === "active" ? "Actief" : status === "inactive" ? "Inactief" : "Alle";
                            const count = status === "active"
                                ? [...dimensions, ...metrics].filter(f => f.hasData !== false).length
                                : status === "inactive"
                                    ? [...dimensions, ...metrics].filter(f => f.hasData === false).length
                                    : [...dimensions, ...metrics].length;
                            return (
                                <button
                                    key={status}
                                    onClick={() => setDataFilter(status)}
                                    style={{
                                        padding: "5px 12px", borderRadius: "16px", fontSize: "0.78rem",
                                        fontWeight: 500, cursor: "pointer", transition: "all 0.15s ease",
                                        border: isActive ? "1px solid var(--color-brand)" : "1px solid var(--color-border)",
                                        background: isActive ? "rgba(99,102,241,0.12)" : "var(--color-surface-elevated)",
                                        color: isActive ? "var(--color-brand)" : "var(--color-text-secondary)",
                                        display: "flex", alignItems: "center", gap: "4px",
                                    }}
                                >
                                    {label}
                                    <span style={{
                                        fontSize: "0.65rem", opacity: 0.7,
                                        background: isActive ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.05)",
                                        padding: "1px 6px", borderRadius: "10px",
                                    }}>
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Search + Filter */}
                <div style={{
                    display: "flex", gap: "8px", padding: "12px 20px",
                    borderBottom: "1px solid var(--color-border)", alignItems: "center",
                }}>
                    <div style={{ position: "relative", flex: 1 }}>
                        <Search size={14} style={{
                            position: "absolute", left: "10px", top: "50%",
                            transform: "translateY(-50%)", color: "var(--color-text-muted)",
                        }} />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Zoek velden..."
                            style={{
                                width: "100%", padding: "7px 10px 7px 32px",
                                borderRadius: "8px", border: "1px solid var(--color-border)",
                                background: "var(--color-surface)", color: "var(--color-text-primary)",
                                fontSize: "0.8rem", outline: "none",
                            }}
                        />
                    </div>
                    <div style={{ display: "flex", gap: "2px", background: "var(--color-surface)", borderRadius: "8px", padding: "2px" }}>
                        {(["all", "dimension", "metric"] as const).map(t => (
                            <button
                                key={t}
                                onClick={() => setTypeFilter(t)}
                                style={{
                                    padding: "5px 8px", borderRadius: "6px", border: "none",
                                    cursor: "pointer", fontSize: "0.72rem", fontWeight: 500,
                                    background: typeFilter === t ? "var(--color-brand)" : "transparent",
                                    color: typeFilter === t ? "#fff" : "var(--color-text-secondary)",
                                    transition: "all 0.15s ease",
                                }}
                            >
                                {t === "all" ? "Alle" : t === "dimension" ? "Dim" : "Met"}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Field List */}
                <div style={{ flex: 1, overflowY: "auto" }}>
                    {groups.length === 0 && (
                        <div style={{ padding: "32px", textAlign: "center", color: "var(--color-text-muted)", fontSize: "0.85rem" }}>
                            Geen velden gevonden
                        </div>
                    )}

                    {groups.map(group => {
                        const isCollapsed = collapsedGroups.has(group.slug);
                        const selectedInGroup = group.fields.filter(f => allSelected.has(f.slug)).length;
                        const connectorColor = CONNECTOR_COLORS[group.slug] || "#6b7280";

                        return (
                            <div key={group.slug}>
                                {/* Group Header */}
                                <button
                                    onClick={() => toggleGroup(group.slug)}
                                    style={{
                                        display: "flex", alignItems: "center", gap: "8px",
                                        width: "100%", padding: "8px 20px",
                                        background: "none", border: "none", cursor: "pointer",
                                        color: "var(--color-text-primary)", fontSize: "0.8rem",
                                        fontWeight: 600, textAlign: "left",
                                        borderBottom: "1px solid rgba(255,255,255,0.03)",
                                    }}
                                >
                                    <span style={{
                                        width: "8px", height: "8px", borderRadius: "50%",
                                        background: connectorColor, flexShrink: 0,
                                    }} />
                                    <span style={{ flex: 1 }}>{group.name}</span>
                                    <span style={{
                                        fontSize: "0.68rem", color: "var(--color-text-muted)",
                                        background: "var(--color-surface)", padding: "2px 8px",
                                        borderRadius: "10px",
                                    }}>
                                        {selectedInGroup} / {group.fields.length}
                                    </span>
                                    {isCollapsed
                                        ? <ChevronRight size={14} style={{ color: "var(--color-text-muted)" }} />
                                        : <ChevronDown size={14} style={{ color: "var(--color-text-muted)" }} />
                                    }
                                </button>

                                {/* Fields */}
                                {!isCollapsed && group.fields.map(field => {
                                    const isSelected = allSelected.has(field.slug);
                                    const badge = TYPE_BADGE[field.dataType] || TYPE_BADGE.STRING;
                                    const isInactive = dataFilter === "all" && field.hasData === false;

                                    return (
                                        <button
                                            key={field.slug}
                                            onClick={() => onToggle(field.slug, field.type)}
                                            title={field.description || field.name}
                                            style={{
                                                display: "flex", alignItems: "center", gap: "8px",
                                                width: "100%", padding: "6px 20px 6px 40px",
                                                background: isSelected ? "rgba(99, 102, 241, 0.08)" : "none",
                                                border: "none", cursor: "pointer", textAlign: "left",
                                                transition: "background 0.1s ease, opacity 0.15s ease",
                                                opacity: isInactive ? 0.45 : 1,
                                            }}
                                            onMouseEnter={e => {
                                                if (!isSelected) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)";
                                            }}
                                            onMouseLeave={e => {
                                                if (!isSelected) (e.currentTarget as HTMLElement).style.background = "none";
                                            }}
                                        >
                                            {/* Checkbox */}
                                            <span style={{
                                                width: "16px", height: "16px", borderRadius: "4px",
                                                border: isSelected ? "none" : "1.5px solid var(--color-border)",
                                                background: isSelected ? "var(--color-brand)" : "transparent",
                                                display: "flex", alignItems: "center", justifyContent: "center",
                                                flexShrink: 0, transition: "all 0.15s ease",
                                            }}>
                                                {isSelected && <Check size={10} color="#fff" strokeWidth={2.5} />}
                                            </span>

                                            {/* Field name */}
                                            <span style={{
                                                flex: 1, fontSize: "0.78rem",
                                                color: isSelected ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                                                fontWeight: isSelected ? 500 : 400,
                                            }}>
                                                {field.name}
                                            </span>

                                            {/* Type badge */}
                                            <span style={{
                                                fontSize: "0.65rem", fontWeight: 600,
                                                color: badge.color, background: badge.bg,
                                                padding: "1px 6px", borderRadius: "4px",
                                                whiteSpace: "nowrap",
                                            }}>
                                                {badge.label}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>

                {/* Footer: Selected summary + Load button */}
                <div style={{
                    padding: "16px 20px", borderTop: "1px solid var(--color-border)",
                    background: "var(--color-surface)",
                }}>
                    {/* Selected pills */}
                    {totalSelected > 0 && (
                        <div style={{
                            display: "flex", flexWrap: "wrap", gap: "4px",
                            marginBottom: "12px", maxHeight: "80px", overflowY: "auto",
                        }}>
                            {selectedDimensions.map(slug => {
                                const f = dimensions.find(d => d.slug === slug);
                                return (
                                    <span key={slug} style={{
                                        display: "inline-flex", alignItems: "center", gap: "4px",
                                        padding: "2px 8px", borderRadius: "4px", fontSize: "0.7rem",
                                        background: "rgba(99,102,241,0.12)", color: "var(--color-brand)",
                                    }}>
                                        {f?.name || slug}
                                        <X size={10} style={{ cursor: "pointer" }} onClick={e => {
                                            e.stopPropagation();
                                            onToggle(slug, "dimension");
                                        }} />
                                    </span>
                                );
                            })}
                            {selectedMetrics.map(slug => {
                                const f = metrics.find(m => m.slug === slug);
                                return (
                                    <span key={slug} style={{
                                        display: "inline-flex", alignItems: "center", gap: "4px",
                                        padding: "2px 8px", borderRadius: "4px", fontSize: "0.7rem",
                                        background: "rgba(52,211,153,0.12)", color: "#34d399",
                                    }}>
                                        {f?.name || slug}
                                        <X size={10} style={{ cursor: "pointer" }} onClick={e => {
                                            e.stopPropagation();
                                            onToggle(slug, "metric");
                                        }} />
                                    </span>
                                );
                            })}
                        </div>
                    )}

                    {/* Load Data button */}
                    <button
                        onClick={() => { onLoadData(); onClose(); }}
                        disabled={loading || totalSelected === 0}
                        style={{
                            width: "100%", padding: "10px", borderRadius: "8px",
                            border: "none", cursor: totalSelected === 0 ? "not-allowed" : "pointer",
                            background: totalSelected > 0 ? "var(--color-brand)" : "var(--color-surface-elevated)",
                            color: totalSelected > 0 ? "#fff" : "var(--color-text-muted)",
                            fontSize: "0.875rem", fontWeight: 600,
                            display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                            opacity: loading ? 0.7 : 1, transition: "all 0.2s ease",
                        }}
                    >
                        {loading ? <Loader2 size={16} className="spin" /> : null}
                        {loading ? "Laden..." : `Data laden (${totalSelected} velden)`}
                    </button>
                </div>
            </div>

            {/* Slide-in animation */}
            <style>{`
                @keyframes slideInRight {
                    from { transform: translateX(100%); }
                    to { transform: translateX(0); }
                }
            `}</style>
        </>
    );
}
