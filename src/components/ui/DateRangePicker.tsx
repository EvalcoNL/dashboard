"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";

// ─── Types ───

export interface DateRange {
    from: string; // YYYY-MM-DD
    to: string;
}

export interface CompareConfig {
    enabled: boolean;
    mode: "previous_period" | "previous_year" | "custom";
    customRange?: DateRange;
}

interface DateRangePickerProps {
    dateRange: DateRange;
    onApply: (range: DateRange, compare?: CompareConfig) => void;
    compare?: CompareConfig;
    showCompare?: boolean;
    triggerStyle?: React.CSSProperties;
}

// ─── Helpers ───

const MONTH_NAMES = [
    "Januari", "Februari", "Maart", "April", "Mei", "Juni",
    "Juli", "Augustus", "September", "Oktober", "November", "December",
];

const DAY_LABELS = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];

function toDateStr(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function parseDate(s: string): Date {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
}

function addDays(d: Date, n: number): Date {
    const r = new Date(d);
    r.setDate(r.getDate() + n);
    return r;
}

function addMonths(d: Date, n: number): Date {
    const r = new Date(d);
    r.setMonth(r.getMonth() + n);
    return r;
}

function startOfWeek(d: Date): Date {
    const r = new Date(d);
    const day = r.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Monday start
    r.setDate(r.getDate() + diff);
    return r;
}

function endOfWeek(d: Date): Date {
    return addDays(startOfWeek(d), 6);
}

function startOfMonth(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function isSameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isInRange(d: Date, from: Date, to: Date): boolean {
    const t = d.getTime();
    return t >= from.getTime() && t <= to.getTime();
}

function formatDisplayDate(s: string): string {
    const d = parseDate(s);
    return `${d.getDate()} ${MONTH_NAMES[d.getMonth()].slice(0, 3).toLowerCase()} ${d.getFullYear()}`;
}

function today(): Date {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

function yesterday(): Date {
    return addDays(today(), -1);
}

// ─── Presets ───

interface Preset {
    label: string;
    getRange: () => DateRange;
}

function getPresets(): Preset[] {
    const t = today();
    const y = yesterday();
    const weekStart = startOfWeek(t);
    const lastWeekStart = addDays(weekStart, -7);
    const lastWeekEnd = addDays(weekStart, -1);
    const monthStart = startOfMonth(t);
    const lastMonthStart = startOfMonth(addMonths(t, -1));
    const lastMonthEnd = endOfMonth(addMonths(t, -1));

    return [
        { label: "Vandaag", getRange: () => ({ from: toDateStr(t), to: toDateStr(t) }) },
        { label: "Gisteren", getRange: () => ({ from: toDateStr(y), to: toDateStr(y) }) },
        { label: "Deze week (ma – vandaag)", getRange: () => ({ from: toDateStr(weekStart), to: toDateStr(t) }) },
        { label: "Afgelopen 7 dagen", getRange: () => ({ from: toDateStr(addDays(t, -6)), to: toDateStr(t) }) },
        { label: "Afgelopen week (ma – zo)", getRange: () => ({ from: toDateStr(lastWeekStart), to: toDateStr(lastWeekEnd) }) },
        { label: "Afgelopen 14 dagen", getRange: () => ({ from: toDateStr(addDays(t, -13)), to: toDateStr(t) }) },
        { label: "Deze maand", getRange: () => ({ from: toDateStr(monthStart), to: toDateStr(t) }) },
        { label: "Afgelopen 30 dagen", getRange: () => ({ from: toDateStr(addDays(t, -29)), to: toDateStr(t) }) },
        { label: "Afgelopen maand", getRange: () => ({ from: toDateStr(lastMonthStart), to: toDateStr(lastMonthEnd) }) },
    ];
}

// ─── Calendar Month ───

function CalendarMonth({
    year,
    month,
    rangeFrom,
    rangeTo,
    hoverDate,
    selecting,
    onDayClick,
    onDayHover,
}: {
    year: number;
    month: number;
    rangeFrom: Date | null;
    rangeTo: Date | null;
    hoverDate: Date | null;
    selecting: boolean;
    onDayClick: (d: Date) => void;
    onDayHover: (d: Date) => void;
}) {
    const firstDay = new Date(year, month, 1);
    const lastDay = endOfMonth(firstDay);
    const startDayOfWeek = firstDay.getDay() === 0 ? 7 : firstDay.getDay(); // Mon=1
    const emptySlots = startDayOfWeek - 1;
    const daysInMonth = lastDay.getDate();
    const t = today();

    const effectiveTo = selecting && hoverDate ? hoverDate : rangeTo;

    // Determine actual from/to for highlighting (handle reverse selection)
    let highlightFrom = rangeFrom;
    let highlightTo = effectiveTo;
    if (highlightFrom && highlightTo && highlightFrom.getTime() > highlightTo.getTime()) {
        [highlightFrom, highlightTo] = [highlightTo, highlightFrom];
    }

    return (
        <div style={{ minWidth: "220px" }}>
            <div style={{
                textAlign: "center", fontWeight: 700, fontSize: "0.85rem",
                marginBottom: "8px", color: "var(--color-text-primary)",
            }}>
                {MONTH_NAMES[month]} {year}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px" }}>
                {DAY_LABELS.map(d => (
                    <div key={d} style={{
                        textAlign: "center", fontSize: "0.7rem", fontWeight: 700,
                        color: "var(--color-text-muted)", padding: "4px 0",
                        textTransform: "uppercase", letterSpacing: "0.02em",
                    }}>
                        {d}
                    </div>
                ))}
                {Array.from({ length: emptySlots }, (_, i) => (
                    <div key={`e${i}`} />
                ))}
                {Array.from({ length: daysInMonth }, (_, i) => {
                    const day = i + 1;
                    const date = new Date(year, month, day);
                    const isToday = isSameDay(date, t);
                    const isStart = highlightFrom ? isSameDay(date, highlightFrom) : false;
                    const isEnd = highlightTo ? isSameDay(date, highlightTo) : false;
                    const inRange = highlightFrom && highlightTo ? isInRange(date, highlightFrom, highlightTo) : false;
                    const isFuture = date > t;

                    let bg = "transparent";
                    let color = "var(--color-text-primary)";
                    let fontWeight = 400;
                    let borderRadius = "6px";

                    if (isStart || isEnd) {
                        bg = "var(--color-brand)";
                        color = "#fff";
                        fontWeight = 700;
                        borderRadius = isStart && isEnd ? "6px" : isStart ? "6px 0 0 6px" : "0 6px 6px 0";
                    } else if (inRange) {
                        bg = "rgba(99, 102, 241, 0.18)";
                        color = "var(--color-text-primary)";
                        borderRadius = "0";
                    }

                    if (isFuture) {
                        color = "var(--color-text-muted)";
                    }

                    return (
                        <button
                            key={day}
                            onClick={() => !isFuture && onDayClick(date)}
                            onMouseEnter={() => !isFuture && onDayHover(date)}
                            style={{
                                width: "100%", aspectRatio: "1", display: "flex",
                                alignItems: "center", justifyContent: "center",
                                fontSize: "0.8rem", fontWeight,
                                background: bg, color, borderRadius,
                                border: isToday ? "1.5px solid var(--color-brand)" : "1.5px solid transparent",
                                cursor: isFuture ? "default" : "pointer",
                                opacity: isFuture ? 0.35 : 1,
                                transition: "background 0.1s ease",
                            }}
                        >
                            {day}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Main Component ───

export default function DateRangePicker({
    dateRange,
    onApply,
    compare: externalCompare,
    showCompare = true,
    triggerStyle,
}: DateRangePickerProps) {
    const [open, setOpen] = useState(false);
    const [alignRight, setAlignRight] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    // Auto-detect alignment when opening
    useEffect(() => {
        if (open && ref.current) {
            const rect = ref.current.getBoundingClientRect();
            // If trigger is in the right half of the viewport, align dropdown to the right
            setAlignRight(rect.left > window.innerWidth / 2);
        }
    }, [open]);

    // Internal state (applied only on "Toepassen")
    const [internalFrom, setInternalFrom] = useState(dateRange.from);
    const [internalTo, setInternalTo] = useState(dateRange.to);
    const [selecting, setSelecting] = useState(false);
    const [hoverDate, setHoverDate] = useState<Date | null>(null);
    const [activePreset, setActivePreset] = useState<string | null>(null);

    // Compare state
    const [compareEnabled, setCompareEnabled] = useState(externalCompare?.enabled ?? false);
    const [compareMode, setCompareMode] = useState<"previous_period" | "previous_year" | "custom">(
        externalCompare?.mode ?? "previous_period"
    );
    const [customCompareFrom, setCustomCompareFrom] = useState(externalCompare?.customRange?.from ?? "");
    const [customCompareTo, setCustomCompareTo] = useState(externalCompare?.customRange?.to ?? "");

    // Calendar view month
    const [viewDate, setViewDate] = useState(() => {
        const d = parseDate(dateRange.to);
        return new Date(d.getFullYear(), d.getMonth(), 1);
    });

    // Reset internal state when opening
    useEffect(() => {
        if (open) {
            setInternalFrom(dateRange.from);
            setInternalTo(dateRange.to);
            setSelecting(false);
            setHoverDate(null);
            const d = parseDate(dateRange.to);
            setViewDate(new Date(d.getFullYear(), d.getMonth(), 1));
            setCompareEnabled(externalCompare?.enabled ?? false);
            setCompareMode(externalCompare?.mode ?? "previous_period");
            setCustomCompareFrom(externalCompare?.customRange?.from ?? "");
            setCustomCompareTo(externalCompare?.customRange?.to ?? "");
        }
    }, [open, dateRange, externalCompare]);

    // Close on click outside
    useEffect(() => {
        if (!open) return;
        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [open]);

    const handleDayClick = useCallback((d: Date) => {
        if (!selecting) {
            // Start new selection
            setInternalFrom(toDateStr(d));
            setInternalTo(toDateStr(d));
            setSelecting(true);
            setActivePreset(null);
        } else {
            // Complete selection
            const startDate = parseDate(internalFrom);
            if (d.getTime() >= startDate.getTime()) {
                setInternalTo(toDateStr(d));
            } else {
                setInternalFrom(toDateStr(d));
                setInternalTo(toDateStr(startDate));
            }
            setSelecting(false);
            setActivePreset(null);
        }
    }, [selecting, internalFrom]);

    const handleDayHover = useCallback((d: Date) => {
        if (selecting) setHoverDate(d);
    }, [selecting]);

    const handlePresetClick = (preset: Preset) => {
        const range = preset.getRange();
        setInternalFrom(range.from);
        setInternalTo(range.to);
        setSelecting(false);
        setActivePreset(preset.label);
        // Navigate calendar to show the end date
        const d = parseDate(range.to);
        setViewDate(new Date(d.getFullYear(), d.getMonth(), 1));
    };

    const handleApply = () => {
        const compareConfig: CompareConfig | undefined = showCompare ? {
            enabled: compareEnabled,
            mode: compareMode,
            ...(compareMode === "custom" && customCompareFrom && customCompareTo
                ? { customRange: { from: customCompareFrom, to: customCompareTo } }
                : {}),
        } : undefined;
        onApply({ from: internalFrom, to: internalTo }, compareConfig);
        setOpen(false);
    };

    const handleCancel = () => {
        setOpen(false);
    };

    const navMonth = (dir: -1 | 1) => {
        setViewDate(prev => addMonths(prev, dir));
    };

    const presets = getPresets();

    // 3 months to display
    const month0 = addMonths(viewDate, -1);
    const month1 = viewDate;
    const month2 = addMonths(viewDate, 1);

    const rangeFrom = internalFrom ? parseDate(internalFrom) : null;
    const rangeTo = internalTo ? parseDate(internalTo) : null;

    return (
        <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
            {/* Trigger Button */}
            <button
                onClick={() => setOpen(!open)}
                style={{
                    display: "flex", alignItems: "center", gap: "8px",
                    padding: "8px 14px", borderRadius: "8px",
                    border: "1px solid var(--color-border)",
                    background: open ? "rgba(99, 102, 241, 0.12)" : "var(--color-surface)",
                    color: open ? "var(--color-brand)" : "var(--color-text-primary)",
                    cursor: "pointer", fontSize: "0.85rem", fontWeight: 500,
                    transition: "all 0.15s ease",
                    whiteSpace: "nowrap",
                    ...triggerStyle,
                }}
            >
                <Calendar size={16} />
                <span>{formatDisplayDate(dateRange.from)} — {formatDisplayDate(dateRange.to)}</span>
            </button>

            {/* Dropdown */}
            {open && (
                <div className="drp-dropdown" style={{
                    position: "absolute", top: "calc(100% + 8px)",
                    ...(alignRight ? { right: 0 } : { left: 0 }),
                    zIndex: 1000,
                    display: "flex",
                    background: "var(--color-surface-elevated)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "16px",
                    boxShadow: "0 20px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)",
                    overflow: "hidden",
                    animation: "datePickerFadeIn 0.15s ease",
                }}>
                    {/* Left Panel: Presets */}
                    <div className="drp-presets" style={{
                        width: "210px",
                        borderRight: "1px solid var(--color-border)",
                        padding: "16px 0",
                        display: "flex", flexDirection: "column",
                        flexShrink: 0,
                    }}>
                        <div style={{
                            fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase",
                            letterSpacing: "0.04em", color: "var(--color-text-muted)",
                            padding: "0 16px 8px",
                        }}>
                            Snelle Selectie
                        </div>
                        <div style={{ flex: 1, overflowY: "auto", maxHeight: "380px" }}>
                            {presets.map(p => (
                                <button
                                    key={p.label}
                                    onClick={() => handlePresetClick(p)}
                                    style={{
                                        display: "block", width: "100%", textAlign: "left",
                                        padding: "8px 16px", border: "none", cursor: "pointer",
                                        fontSize: "0.825rem", fontWeight: activePreset === p.label ? 600 : 400,
                                        background: activePreset === p.label ? "rgba(99, 102, 241, 0.12)" : "transparent",
                                        color: activePreset === p.label ? "var(--color-brand)" : "var(--color-text-primary)",
                                        transition: "all 0.1s ease",
                                    }}
                                    className="drp-preset-btn"
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>



                        {/* Compare Toggle */}
                        {showCompare && (
                            <div style={{
                                borderTop: "1px solid var(--color-border)", padding: "12px 16px",
                            }}>
                                <div style={{
                                    display: "flex", alignItems: "center", justifyContent: "space-between",
                                    marginBottom: compareEnabled ? "8px" : 0,
                                }}>
                                    <span style={{ fontSize: "0.825rem", fontWeight: 500, color: "var(--color-text-primary)" }}>
                                        Vergelijken
                                    </span>
                                    <button
                                        onClick={() => setCompareEnabled(!compareEnabled)}
                                        style={{
                                            width: "36px", height: "20px", borderRadius: "10px",
                                            border: "none", cursor: "pointer", position: "relative",
                                            background: compareEnabled ? "var(--color-brand)" : "rgba(255,255,255,0.15)",
                                            transition: "background 0.2s ease",
                                        }}
                                    >
                                        <div style={{
                                            width: "16px", height: "16px", borderRadius: "50%",
                                            background: "#fff", position: "absolute", top: "2px",
                                            left: compareEnabled ? "18px" : "2px",
                                            transition: "left 0.2s ease",
                                            boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                                        }} />
                                    </button>
                                </div>
                                {compareEnabled && (
                                    <>
                                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                            {([
                                                { key: "previous_period" as const, label: "Vorige periode" },
                                                { key: "previous_year" as const, label: "Vorig jaar" },
                                                { key: "custom" as const, label: "Aangepast" },
                                            ]).map(opt => (
                                                <button
                                                    key={opt.key}
                                                    onClick={() => setCompareMode(opt.key)}
                                                    style={{
                                                        padding: "6px 8px", borderRadius: "6px",
                                                        border: "none", cursor: "pointer", textAlign: "left",
                                                        fontSize: "0.8rem", fontWeight: compareMode === opt.key ? 600 : 400,
                                                        background: compareMode === opt.key ? "rgba(99, 102, 241, 0.12)" : "transparent",
                                                        color: compareMode === opt.key ? "var(--color-brand)" : "var(--color-text-secondary)",
                                                        transition: "all 0.1s ease",
                                                    }}
                                                    className="drp-preset-btn"
                                                >
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                        {compareMode === "custom" && (
                                            <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "6px" }}>
                                                <div>
                                                    <label style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", display: "block", marginBottom: "2px" }}>Van</label>
                                                    <input type="date" value={customCompareFrom} onChange={e => setCustomCompareFrom(e.target.value)} style={{ ...dateInputStyle, width: "100%", fontSize: "0.8rem", padding: "5px 8px" }} />
                                                </div>
                                                <div>
                                                    <label style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", display: "block", marginBottom: "2px" }}>Tot</label>
                                                    <input type="date" value={customCompareTo} onChange={e => setCustomCompareTo(e.target.value)} style={{ ...dateInputStyle, width: "100%", fontSize: "0.8rem", padding: "5px 8px" }} />
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Right Panel: Calendar */}
                    <div className="drp-calendar-panel" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
                        {/* Date inputs row */}
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <div>
                                <label style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: "4px" }}>
                                    Startdatum
                                </label>
                                <input
                                    type="date"
                                    value={internalFrom}
                                    onChange={e => {
                                        setInternalFrom(e.target.value);
                                        setActivePreset(null);
                                        setSelecting(false);
                                    }}
                                    style={dateInputStyle}
                                />
                            </div>
                            <span style={{ color: "var(--color-text-muted)", marginTop: "18px", fontWeight: 500 }}>—</span>
                            <div>
                                <label style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: "4px" }}>
                                    Einddatum
                                </label>
                                <input
                                    type="date"
                                    value={internalTo}
                                    onChange={e => {
                                        setInternalTo(e.target.value);
                                        setActivePreset(null);
                                        setSelecting(false);
                                    }}
                                    style={dateInputStyle}
                                />
                            </div>
                        </div>

                        {/* Month navigation */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <button onClick={() => navMonth(-1)} style={navBtnStyle} className="drp-preset-btn">
                                <ChevronLeft size={18} />
                            </button>
                            <div style={{ flex: 1 }} />
                            <button onClick={() => navMonth(1)} style={navBtnStyle} className="drp-preset-btn">
                                <ChevronRight size={18} />
                            </button>
                        </div>

                        {/* 3 months side by side */}
                        <div className="drp-months-row" style={{ display: "flex", gap: "24px" }}>
                            {[month0, month1, month2].map((m, i) => (
                                <CalendarMonth
                                    key={`${m.getFullYear()}-${m.getMonth()}-${i}`}
                                    year={m.getFullYear()}
                                    month={m.getMonth()}
                                    rangeFrom={rangeFrom}
                                    rangeTo={rangeTo}
                                    hoverDate={hoverDate}
                                    selecting={selecting}
                                    onDayClick={handleDayClick}
                                    onDayHover={handleDayHover}
                                />
                            ))}
                        </div>



                        {/* Action buttons */}
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", paddingTop: "4px", borderTop: "1px solid var(--color-border)" }}>
                            <button
                                onClick={handleCancel}
                                style={{
                                    padding: "8px 20px", borderRadius: "8px",
                                    border: "1px solid var(--color-border)",
                                    background: "transparent", color: "var(--color-text-secondary)",
                                    cursor: "pointer", fontSize: "0.85rem", fontWeight: 500,
                                }}
                                className="drp-preset-btn"
                            >
                                Annuleren
                            </button>
                            <button
                                onClick={handleApply}
                                style={{
                                    padding: "8px 24px", borderRadius: "8px", border: "none",
                                    background: "var(--color-brand)", color: "#fff",
                                    cursor: "pointer", fontSize: "0.85rem", fontWeight: 600,
                                    transition: "opacity 0.15s ease",
                                }}
                            >
                                Toepassen
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                .drp-preset-btn:hover {
                    background: var(--color-surface-hover) !important;
                }
                @keyframes datePickerFadeIn {
                    from { opacity: 0; transform: translateY(-4px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}

// ─── Styles ───

const dateInputStyle: React.CSSProperties = {
    padding: "8px 12px", borderRadius: "8px",
    border: "1px solid var(--color-border)", background: "var(--color-surface)",
    color: "var(--color-text-primary)", fontSize: "0.85rem",
    outline: "none",
};

const navBtnStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: "32px", height: "32px", borderRadius: "8px",
    border: "1px solid var(--color-border)", background: "var(--color-surface)",
    color: "var(--color-text-secondary)", cursor: "pointer",
    transition: "all 0.15s ease",
};
