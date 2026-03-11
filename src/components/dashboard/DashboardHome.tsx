"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    TrendingUp,
    TrendingDown,
    Minus,
    AlertTriangle,
    CheckCircle,
    Clock,
    ChevronUp,
    ChevronDown,
    ChevronsUpDown,
    Users,
    Activity,
    BarChart3,
    LayoutGrid,
    List,
    MoreVertical,
    Settings,
    Trash2,
} from "lucide-react";
import {
    aggregateCampaigns,
    calculateKPI,
    getHealthColor,
    getHealthLabel,
    formatCurrency,
    formatNumber,
    formatPercent,
    type TargetType,
} from "@/lib/services/kpi-engine";
import SummaryCard from "@/components/ui/SummaryCard";
import DateRangePicker, { type DateRange } from "@/components/ui/DateRangePicker";
import { useNotification } from "@/components/NotificationProvider";
import OnboardingChecklist from "@/components/OnboardingChecklist";

interface ProjectWithData {
    id: string;
    name: string;
    industryType: string;
    targetType: string;
    targetValue: unknown;
    tolerancePct: number;
    profitMarginPct: unknown;
    currency: string;
    campaignMetrics: Array<{
        campaignId: string;
        campaignName: string;
        campaignType: string;
        date: Date | string;
        spend: unknown;
        conversions: unknown;
        conversionValue: unknown;
        clicks: number;
        impressions: number;
        status: string;
        servingStatus: string;
    }>;
    analystReports: Array<{
        healthScore: number;
        deviationPct: unknown;
        trendDirection: string;
        advisorReport: {
            status: string;
            createdAt: Date | string;
        } | null;
    }>;
}

type ViewMode = "cards" | "table";

export default function DashboardHome({
    projects,
    userName,
    defaultView = "cards",
}: {
    projects: ProjectWithData[];
    userName: string;
    defaultView?: ViewMode;
}) {
    const [viewMode, setViewMode] = useState<ViewMode>(defaultView);
    const [contextMenu, setContextMenu] = useState<string | null>(null);
    const [sortColumn, setSortColumn] = useState<"health" | "status" | "deviation" | "spend" | "name">("health");
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

    // Date range state — default last 7 days
    const [dateRange, setDateRange] = useState<DateRange>(() => {
        const now = new Date();
        const to = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
        const from = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
        const fromStr = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, "0")}-${String(from.getDate()).padStart(2, "0")}`;
        return { from: fromStr, to };
    });
    const menuRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const { showToast, confirm } = useNotification();

    // Close context menu on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setContextMenu(null);
            }
        };
        if (contextMenu) document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [contextMenu]);

    const toggleView = async (mode: ViewMode) => {
        setViewMode(mode);
        try {
            await fetch("/api/user/dashboard-view", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ dashboardView: mode }),
            });
        } catch {
            // Silently fail — preference is visual-only
        }
    };

    const handleDelete = async (projectId: string, projectName: string) => {
        setContextMenu(null);
        const confirmed = await confirm({
            title: "Project verwijderen",
            message: `Weet je zeker dat je "${projectName}" wilt verwijderen? Dit kan niet ongedaan worden gemaakt en alle bijbehorende data wordt verwijderd.`,
            confirmLabel: "Ja, verwijderen",
            type: "danger",
        });
        if (!confirmed) return;
        try {
            const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
            if (res.ok) {
                showToast("success", "Project succesvol verwijderd");
                router.refresh();
            } else {
                showToast("error", "Fout bij verwijderen. Probeer het opnieuw.");
            }
        } catch {
            showToast("error", "Er ging iets mis.");
        }
    };

    const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

    const ContextMenuDropdown = ({ projectId, projectName }: { projectId: string; projectName: string }) => {
        const btnRef = useRef<HTMLButtonElement>(null);

        const handleToggle = (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            if (contextMenu === projectId) {
                setContextMenu(null);
            } else {
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                setMenuPos({ top: rect.bottom + 4, left: rect.right - 160 });
                setContextMenu(projectId);
            }
        };

        return (
            <div style={{ position: "relative" }}>
                <button
                    ref={btnRef}
                    onClick={handleToggle}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "28px",
                        height: "28px",
                        borderRadius: "6px",
                        border: "none",
                        background: contextMenu === projectId ? "rgba(99, 102, 241, 0.15)" : "transparent",
                        color: "var(--color-text-muted)",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                    }}
                    className="context-menu-trigger"
                >
                    <MoreVertical size={16} />
                </button>
                {contextMenu === projectId && (
                    <div
                        ref={menuRef}
                        style={{
                            position: "fixed",
                            top: menuPos.top,
                            left: menuPos.left,
                            background: "var(--color-surface-elevated)",
                            border: "1px solid var(--color-border)",
                            borderRadius: "10px",
                            padding: "4px",
                            minWidth: "160px",
                            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.3)",
                            zIndex: 9999,
                            animation: "fadeIn 0.15s ease",
                        }}
                    >
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setContextMenu(null);
                                router.push(`/projects/${projectId}/settings`);
                            }}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                                width: "100%",
                                padding: "8px 12px",
                                borderRadius: "7px",
                                border: "none",
                                background: "transparent",
                                color: "var(--color-text-primary)",
                                cursor: "pointer",
                                fontSize: "0.825rem",
                                transition: "background 0.15s ease",
                            }}
                            className="context-menu-item"
                        >
                            <Settings size={14} />
                            Instellingen
                        </button>
                        <div style={{ height: "1px", background: "var(--color-border)", margin: "4px 8px" }} />
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDelete(projectId, projectName);
                            }}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                                width: "100%",
                                padding: "8px 12px",
                                borderRadius: "7px",
                                border: "none",
                                background: "transparent",
                                color: "#ef4444",
                                cursor: "pointer",
                                fontSize: "0.825rem",
                                transition: "background 0.15s ease",
                            }}
                            className="context-menu-item"
                        >
                            <Trash2 size={14} />
                            Verwijderen
                        </button>
                    </div>
                )}
            </div>
        );
    };

    // Process KPIs for each client
    const clientKPIs = projects.map((client) => {
        // Use selected date range
        const rangeFrom = new Date(dateRange.from + "T00:00:00");
        const rangeTo = new Date(dateRange.to + "T23:59:59");
        const rangeDays = Math.round((rangeTo.getTime() - rangeFrom.getTime()) / (24 * 60 * 60 * 1000)) + 1;
        const prevFrom = new Date(rangeFrom.getTime() - rangeDays * 24 * 60 * 60 * 1000);

        const currentMetrics = client.campaignMetrics.filter((m) => {
            const date = new Date(m.date);
            return date >= rangeFrom && date <= rangeTo;
        });

        const previousMetrics = client.campaignMetrics.filter((m) => {
            const date = new Date(m.date);
            return date >= prevFrom && date < rangeFrom;
        });

        const currentPeriod = aggregateCampaigns(currentMetrics as never[]);
        const previousPeriod = aggregateCampaigns(previousMetrics as never[]);

        const servingIssues = currentMetrics.filter(
            (m) => m.servingStatus !== "ELIGIBLE"
        ).length;

        const kpi = calculateKPI(
            client.targetType as TargetType,
            Number(client.targetValue),
            client.tolerancePct,
            currentPeriod,
            previousPeriod,
            client.profitMarginPct ? Number(client.profitMarginPct) : null,
            servingIssues
        );

        const latestReport = client.analystReports[0];
        const advisorStatus = latestReport?.advisorReport?.status;

        return { client, kpi, latestReport, advisorStatus };
    });

    // Sort projects — no-data last only for health/status columns
    const sorted = [...clientKPIs].sort((a, b) => {
        // Pin no-data projects to bottom only for health-related sorts
        if (sortColumn === "health" || sortColumn === "status") {
            if (a.kpi.hasData && !b.kpi.hasData) return -1;
            if (!a.kpi.hasData && b.kpi.hasData) return 1;
        }
        const dir = sortDirection === "asc" ? 1 : -1;
        switch (sortColumn) {
            case "name":
                return dir * a.client.name.localeCompare(b.client.name);
            case "health":
                return dir * (a.kpi.healthScore - b.kpi.healthScore);
            case "status": {
                const statusOrder: Record<string, number> = { critical: 0, warning: 1, on_track: 2 };
                return dir * ((statusOrder[a.kpi.targetStatus] ?? 3) - (statusOrder[b.kpi.targetStatus] ?? 3));
            }
            case "deviation":
                return dir * (a.kpi.targetDeviation - b.kpi.targetDeviation);
            case "spend":
                return dir * (a.kpi.currentPeriod.totalSpend - b.kpi.currentPeriod.totalSpend);
            default:
                return dir * (a.kpi.healthScore - b.kpi.healthScore);
        }
    });

    const handleSort = (col: typeof sortColumn) => {
        if (sortColumn === col) {
            setSortDirection(d => d === "asc" ? "desc" : "asc");
        } else {
            setSortColumn(col);
            setSortDirection(col === "name" ? "asc" : "desc");
        }
    };

    const SortIcon = ({ col }: { col: typeof sortColumn }) => {
        if (sortColumn !== col) return <ChevronsUpDown size={12} style={{ opacity: 0.4 }} />;
        return sortDirection === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
    };

    const sortableThStyle = (align: string = "left"): React.CSSProperties => ({
        padding: "14px 16px",
        color: "var(--color-text-muted)",
        fontWeight: 500,
        fontSize: "0.75rem",
        textTransform: "uppercase" as const,
        letterSpacing: "0.05em",
        textAlign: align as "left" | "center" | "right",
        cursor: "pointer",
        userSelect: "none",
        transition: "color 0.15s ease",
    });

    // Stats summary — only include projects with data
    const projectsWithData = clientKPIs.filter(c => c.kpi.hasData);
    const avgHealth = projectsWithData.length > 0
        ? Math.round(projectsWithData.reduce((sum, c) => sum + c.kpi.healthScore, 0) / projectsWithData.length)
        : 0;
    const criticalCount = projectsWithData.filter((c) => c.kpi.healthScore < 50).length;
    const totalSpend = clientKPIs.reduce((sum, c) => sum + c.kpi.currentPeriod.totalSpend, 0);
    const hasAnyData = projectsWithData.length > 0;

    const getTrendIcon = (direction: string) => {
        switch (direction) {
            case "IMPROVING": return <TrendingUp size={16} />;
            case "DECLINING": return <TrendingDown size={16} />;
            default: return <Minus size={16} />;
        }
    };

    const getTrendColor = (direction: string) => {
        switch (direction) {
            case "IMPROVING": return "var(--color-success)";
            case "DECLINING": return "var(--color-danger)";
            default: return "var(--color-text-secondary)";
        }
    };

    const getStatusBadge = (status?: string) => {
        if (!status) return null;
        const statusClass = `status-${status.toLowerCase()}`;
        return <span className={`status-badge ${statusClass}`}>{status}</span>;
    };

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div style={{ marginBottom: "32px" }}>
                <h1 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "4px" }}>
                    Welkom, {userName.split(" ")[0]}
                </h1>
                <p style={{ color: "var(--color-text-secondary)", fontSize: "0.9rem" }}>
                    Performance overzicht van al je projecten
                </p>
            </div>

            {/* Onboarding Checklist */}
            <OnboardingChecklist />

            {/* Summary Cards */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "16px",
                    marginBottom: "32px",
                }}
            >
                <SummaryCard
                    icon={<Users size={20} />}
                    label="Projecten"
                    value={projects.length.toString()}
                    color="var(--color-brand)"
                />
                <SummaryCard
                    icon={<Activity size={20} />}
                    label="Gem. Health Score"
                    value={hasAnyData ? avgHealth.toString() : "—"}
                    color={hasAnyData ? getHealthColor(avgHealth) : "#64748b"}
                />
                <SummaryCard
                    icon={<AlertTriangle size={20} />}
                    label="Kritiek"
                    value={criticalCount.toString()}
                    color={criticalCount > 0 ? "#ef4444" : "#10b981"}
                />
                <SummaryCard
                    icon={<BarChart3 size={20} />}
                    label="Totale Spend"
                    value={formatCurrency(totalSpend)}
                    color="var(--color-brand-light)"
                />
            </div>

            {/* Projects header with view toggle + date picker */}
            <div style={{ marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <h2 style={{ fontSize: "1.1rem", fontWeight: 600 }}>Projecten</h2>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {/* Date Range Picker */}
                    <DateRangePicker
                        dateRange={dateRange}
                        onApply={(range) => setDateRange(range)}
                        showCompare={false}
                    />
                    {/* View Toggle */}
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            background: "rgba(30, 41, 59, 0.6)",
                            borderRadius: "8px",
                            padding: "3px",
                            border: "1px solid rgba(51, 65, 85, 0.4)",
                        }}
                    >
                        <button
                            onClick={() => toggleView("cards")}
                            title="Kaarten"
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: "32px",
                                height: "28px",
                                borderRadius: "6px",
                                border: "none",
                                cursor: "pointer",
                                transition: "all 0.2s ease",
                                background: viewMode === "cards"
                                    ? "rgba(99, 102, 241, 0.25)"
                                    : "transparent",
                                color: viewMode === "cards"
                                    ? "var(--color-brand-light)"
                                    : "var(--color-text-muted)",
                            }}
                        >
                            <LayoutGrid size={15} />
                        </button>
                        <button
                            onClick={() => toggleView("table")}
                            title="Tabel"
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: "32px",
                                height: "28px",
                                borderRadius: "6px",
                                border: "none",
                                cursor: "pointer",
                                transition: "all 0.2s ease",
                                background: viewMode === "table"
                                    ? "rgba(99, 102, 241, 0.25)"
                                    : "transparent",
                                color: viewMode === "table"
                                    ? "var(--color-brand-light)"
                                    : "var(--color-text-muted)",
                            }}
                        >
                            <List size={15} />
                        </button>
                    </div>
                    <Link
                        href="/projects/new"
                        className="btn btn-primary btn-sm"
                        style={{ textDecoration: "none" }}
                    >
                        + Project Toevoegen
                    </Link>
                </div>
            </div>

            {sorted.length === 0 ? (
                <div
                    className="glass-card"
                    style={{
                        padding: "48px",
                        textAlign: "center",
                        color: "var(--color-text-muted)",
                    }}
                >
                    <Users size={48} style={{ marginBottom: "16px", opacity: 0.5 }} />
                    <p style={{ fontSize: "1rem", marginBottom: "8px" }}>
                        Nog geen projecten toegevoegd
                    </p>
                    <p style={{ fontSize: "0.85rem" }}>
                        Voeg je eerste project toe om te beginnen met performance tracking.
                    </p>
                </div>
            ) : viewMode === "cards" ? (
                /* ═════════ CARD VIEW ═════════ */
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))",
                        gap: "16px",
                    }}
                >
                    {sorted.map(({ client, kpi, advisorStatus }, index) => (
                        <Link
                            key={client.id}
                            href={`/projects/${client.id}`}
                            style={{
                                textDecoration: "none",
                                color: "inherit",
                                animationDelay: `${index * 50}ms`,
                            }}
                            className="animate-fade-in"
                        >
                            <div className="glass-card" style={{ padding: "24px", cursor: "pointer" }}>
                                {/* Client header */}
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "flex-start",
                                        justifyContent: "space-between",
                                        marginBottom: "20px",
                                    }}
                                >
                                    <div>
                                        <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "4px" }}>
                                            {client.name}
                                        </h3>
                                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                            <span
                                                style={{
                                                    fontSize: "0.7rem",
                                                    padding: "2px 8px",
                                                    background: "rgba(99, 102, 241, 0.1)",
                                                    borderRadius: "6px",
                                                    color: "var(--color-brand-light)",
                                                    fontWeight: 500,
                                                }}
                                            >
                                                {client.industryType}
                                            </span>
                                        </div>
                                    </div>
                                    <ContextMenuDropdown projectId={client.id} projectName={client.name} />
                                </div>

                                {/* Health Score Ring */}
                                <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "20px" }}>
                                    <div style={{ position: "relative", width: "64px", height: "64px" }}>
                                        <svg width="64" height="64" viewBox="0 0 64 64">
                                            <circle
                                                cx="32"
                                                cy="32"
                                                r="26"
                                                fill="none"
                                                stroke="rgba(51, 65, 85, 0.4)"
                                                strokeWidth="6"
                                            />
                                            {kpi.hasData && (
                                                <circle
                                                    cx="32"
                                                    cy="32"
                                                    r="26"
                                                    fill="none"
                                                    stroke={getHealthColor(kpi.healthScore, kpi.hasData)}
                                                    strokeWidth="6"
                                                    strokeLinecap="round"
                                                    strokeDasharray={`${(kpi.healthScore / 100) * 163.36} 163.36`}
                                                    transform="rotate(-90 32 32)"
                                                    style={{ transition: "all 0.6s ease" }}
                                                />
                                            )}
                                        </svg>
                                        <div
                                            style={{
                                                position: "absolute",
                                                inset: 0,
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                fontSize: kpi.hasData ? "1rem" : "1.1rem",
                                                fontWeight: 700,
                                                color: getHealthColor(kpi.healthScore, kpi.hasData),
                                            }}
                                        >
                                            {kpi.hasData ? kpi.healthScore : "—"}
                                        </div>
                                    </div>

                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                                            <span style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
                                                {getHealthLabel(kpi.healthScore, kpi.hasData)}
                                            </span>
                                            {kpi.hasData && (
                                                <span style={{ color: getTrendColor(kpi.trendDirection) }}>
                                                    {getTrendIcon(kpi.trendDirection)}
                                                </span>
                                            )}
                                        </div>

                                        {kpi.hasData ? (
                                            <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
                                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                                                    <span>Target ({client.targetType})</span>
                                                    <span style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>
                                                        {client.targetType === "CPA"
                                                            ? formatCurrency(Number(client.targetValue))
                                                            : formatNumber(Number(client.targetValue), 2)}
                                                    </span>
                                                </div>
                                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                                                    <span>Behaald</span>
                                                    <span style={{
                                                        color: kpi.targetDeviation > 0 ? "#f87171" : "#34d399",
                                                        fontWeight: 600,
                                                    }}>
                                                        {client.targetType === "CPA"
                                                            ? formatCurrency(kpi.blendedKPI)
                                                            : formatNumber(kpi.blendedKPI, 2)}
                                                    </span>
                                                </div>
                                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                                                    <span>Deviation</span>
                                                    <span style={{
                                                        color: kpi.targetDeviation > 0 ? "#f87171" : "#34d399",
                                                        fontWeight: 600,
                                                    }}>
                                                        {formatPercent(kpi.targetDeviation)}
                                                    </span>
                                                </div>
                                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                                    <span>Spend</span>
                                                    <span style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>
                                                        {formatCurrency(kpi.currentPeriod.totalSpend)}
                                                    </span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginTop: "4px" }}>
                                                Er is nog geen data beschikbaar voor dit project in de geselecteerde periode.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Footer */}
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        paddingTop: "12px",
                                        borderTop: "1px solid rgba(51, 65, 85, 0.3)",
                                    }}
                                >
                                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                        {!kpi.hasData ? (
                                            <>
                                                <Minus size={14} color="#64748b" />
                                                <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                                                    Geen data
                                                </span>
                                            </>
                                        ) : kpi.targetStatus === "critical" ? (
                                            <>
                                                <AlertTriangle size={14} color="#ef4444" />
                                                <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                                                    Kritiek
                                                </span>
                                            </>
                                        ) : kpi.targetStatus === "warning" ? (
                                            <>
                                                <Clock size={14} color="#f59e0b" />
                                                <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                                                    Waarschuwing
                                                </span>
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle size={14} color="#10b981" />
                                                <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                                                    Op Target
                                                </span>
                                            </>
                                        )}
                                    </div>
                                    {advisorStatus && getStatusBadge(advisorStatus)}
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            ) : (
                /* ═════════ TABLE VIEW ═════════ */
                <div className="glass-card" style={{ overflow: "visible" }}>
                    <table
                        style={{
                            width: "100%",
                            borderCollapse: "collapse",
                            fontSize: "0.85rem",
                        }}
                    >
                        <thead>
                            <tr
                                style={{
                                    borderBottom: "1px solid rgba(51, 65, 85, 0.4)",
                                    textAlign: "left",
                                }}
                            >
                                <th onClick={() => handleSort("name")} style={{ ...sortableThStyle(), padding: "14px 20px", color: sortColumn === "name" ? "var(--color-brand-light)" : "var(--color-text-muted)" }}>
                                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>Project <SortIcon col="name" /></span>
                                </th>
                                <th style={{ padding: "14px 16px", color: "var(--color-text-muted)", fontWeight: 500, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                    Branche
                                </th>
                                <th onClick={() => handleSort("health")} style={{ ...sortableThStyle("center"), color: sortColumn === "health" ? "var(--color-brand-light)" : "var(--color-text-muted)" }}>
                                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", justifyContent: "center" }}>Health <SortIcon col="health" /></span>
                                </th>
                                <th onClick={() => handleSort("status")} style={{ ...sortableThStyle(), color: sortColumn === "status" ? "var(--color-brand-light)" : "var(--color-text-muted)" }}>
                                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>Status <SortIcon col="status" /></span>
                                </th>
                                <th style={{ padding: "14px 16px", color: "var(--color-text-muted)", fontWeight: 500, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "right" }}>
                                    Target
                                </th>
                                <th style={{ padding: "14px 16px", color: "var(--color-text-muted)", fontWeight: 500, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "right" }}>
                                    Behaald
                                </th>
                                <th style={{ padding: "14px 16px", color: "var(--color-text-muted)", fontWeight: 500, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center" }}>
                                    Trend
                                </th>
                                <th onClick={() => handleSort("deviation")} style={{ ...sortableThStyle("right"), color: sortColumn === "deviation" ? "var(--color-brand-light)" : "var(--color-text-muted)" }}>
                                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", justifyContent: "flex-end", width: "100%" }}>Deviation <SortIcon col="deviation" /></span>
                                </th>
                                <th onClick={() => handleSort("spend")} style={{ ...sortableThStyle("right"), color: sortColumn === "spend" ? "var(--color-brand-light)" : "var(--color-text-muted)" }}>
                                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", justifyContent: "flex-end", width: "100%" }}>Spend <SortIcon col="spend" /></span>
                                </th>
                                <th style={{ padding: "14px 20px", width: "32px" }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {sorted.map(({ client, kpi, advisorStatus }, index) => (
                                <tr
                                    key={client.id}
                                    onClick={() => router.push(`/projects/${client.id}`)}
                                    style={{
                                        borderBottom: index < sorted.length - 1 ? "1px solid rgba(51, 65, 85, 0.2)" : "none",
                                        cursor: "pointer",
                                        transition: "background 0.15s ease",
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(99, 102, 241, 0.05)"; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                                >
                                    {/* Project name */}
                                    <td style={{ padding: "14px 20px", fontWeight: 600 }}>
                                        {client.name}
                                    </td>

                                    {/* Industry */}
                                    <td style={{ padding: "14px 16px" }}>
                                        <span
                                            style={{
                                                fontSize: "0.7rem",
                                                padding: "2px 8px",
                                                background: "rgba(99, 102, 241, 0.1)",
                                                borderRadius: "6px",
                                                color: "var(--color-brand-light)",
                                                fontWeight: 500,
                                            }}
                                        >
                                            {client.industryType}
                                        </span>
                                    </td>

                                    {/* Health score with mini ring */}
                                    <td style={{ padding: "14px 16px", textAlign: "center" }}>
                                        <div style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                                            <div style={{ position: "relative", width: "32px", height: "32px" }}>
                                                <svg width="32" height="32" viewBox="0 0 32 32">
                                                    <circle cx="16" cy="16" r="12" fill="none" stroke="rgba(51, 65, 85, 0.4)" strokeWidth="3" />
                                                    {kpi.hasData && (
                                                        <circle
                                                            cx="16" cy="16" r="12"
                                                            fill="none"
                                                            stroke={getHealthColor(kpi.healthScore, kpi.hasData)}
                                                            strokeWidth="3"
                                                            strokeLinecap="round"
                                                            strokeDasharray={`${(kpi.healthScore / 100) * 75.4} 75.4`}
                                                            transform="rotate(-90 16 16)"
                                                        />
                                                    )}
                                                </svg>
                                                <span style={{
                                                    position: "absolute",
                                                    inset: 0,
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    fontSize: kpi.hasData ? "0.55rem" : "0.7rem",
                                                    fontWeight: 700,
                                                    color: getHealthColor(kpi.healthScore, kpi.hasData),
                                                }}>
                                                    {kpi.hasData ? kpi.healthScore : "—"}
                                                </span>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Status */}
                                    <td style={{ padding: "14px 16px" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                            {!kpi.hasData ? (
                                                <Minus size={13} color="#64748b" />
                                            ) : kpi.targetStatus === "critical" ? (
                                                <AlertTriangle size={13} color="#ef4444" />
                                            ) : kpi.targetStatus === "warning" ? (
                                                <Clock size={13} color="#f59e0b" />
                                            ) : (
                                                <CheckCircle size={13} color="#10b981" />
                                            )}
                                            <span style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
                                                {!kpi.hasData
                                                    ? "Geen data"
                                                    : kpi.targetStatus === "critical"
                                                        ? "Kritiek"
                                                        : kpi.targetStatus === "warning"
                                                            ? "Waarschuwing"
                                                            : "Op Target"}
                                            </span>
                                        </div>
                                    </td>

                                    {/* Target */}
                                    <td style={{
                                        padding: "14px 16px",
                                        textAlign: "right",
                                        fontWeight: 500,
                                        color: "var(--color-text-secondary)",
                                    }}>
                                        <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>{client.targetType}</div>
                                        {client.targetType === "CPA"
                                            ? formatCurrency(Number(client.targetValue))
                                            : formatNumber(Number(client.targetValue), 2)}
                                    </td>

                                    {/* Actual */}
                                    <td style={{
                                        padding: "14px 16px",
                                        textAlign: "right",
                                        fontWeight: 600,
                                        color: kpi.targetDeviation > 0 ? "#f87171" : "#34d399",
                                    }}>
                                        {client.targetType === "CPA"
                                            ? formatCurrency(kpi.blendedKPI)
                                            : formatNumber(kpi.blendedKPI, 2)}
                                    </td>

                                    {/* Trend */}
                                    <td style={{ padding: "14px 16px", textAlign: "center" }}>
                                        <span style={{ color: getTrendColor(kpi.trendDirection), display: "inline-flex" }}>
                                            {getTrendIcon(kpi.trendDirection)}
                                        </span>
                                    </td>

                                    {/* Deviation */}
                                    <td style={{
                                        padding: "14px 16px",
                                        textAlign: "right",
                                        fontWeight: 600,
                                        color: kpi.targetDeviation > 0 ? "#f87171" : "#34d399",
                                    }}>
                                        {formatPercent(kpi.targetDeviation)}
                                    </td>

                                    {/* Spend */}
                                    <td style={{
                                        padding: "14px 16px",
                                        textAlign: "right",
                                        fontWeight: 500,
                                    }}>
                                        {formatCurrency(kpi.currentPeriod.totalSpend)}
                                    </td>

                                    {/* Arrow */}
                                    <td style={{ padding: "14px 20px" }}>
                                        <ContextMenuDropdown projectId={client.id} projectName={client.name} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
