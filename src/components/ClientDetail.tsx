"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    ArrowLeft,
    Target,
    TrendingUp,
    TrendingDown,
    Minus,
    AlertTriangle,
    CheckCircle,
    AlertCircle,
    BarChart3,
    FileText,
    MessageSquare,
    RefreshCw,
} from "lucide-react";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import {
    aggregateCampaigns,
    calculateKPI,
    getHealthColor,
    getHealthLabel,
    formatCurrency,
    formatNumber,
    formatPercent,
    type TargetType,
} from "@/lib/kpi-engine";
import { useState, useEffect } from "react";

interface DailyMetric {
    date: Date | string;
    _sum: {
        spend: unknown;
        conversions: unknown;
        conversionValue: unknown;
        clicks: unknown;
        impressions: unknown;
    };
}

export default function ClientDetail({
    client,
    dailyMetrics,
    userRole,
    initialDays = 7,
}: {
    client: {
        id: string;
        name: string;
        industryType: string;
        targetType: string;
        targetValue: unknown;
        tolerancePct: number;
        profitMarginPct: unknown;
        dataSources: Array<{
            id: string;
            type: string;
            name: string | null;
            externalId: string;
            active: boolean;
            lastSyncedAt: Date | string | null;
        }>;
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
            id: string;
            healthScore: number;
            deviationPct: unknown;
            trendDirection: string;
            reportJson: unknown;
            advisorReport: {
                id: string;
                adviceJson: unknown;
                status: string;
                notes: string | null;
            } | null;
        }>;
        merchantCenterHealth: Array<{
            disapprovedItems: number;
            disapprovedPct: unknown;
            topReasons: unknown;
        }>;
    };
    dailyMetrics: DailyMetric[];
    userRole: string;
    initialDays?: number;
}) {
    const router = useRouter();
    const [advisorStatus, setAdvisorStatus] = useState(
        client.analystReports[0]?.advisorReport?.status || "DRAFT"
    );
    const [notes, setNotes] = useState(
        client.analystReports[0]?.advisorReport?.notes || ""
    );
    const [saving, setSaving] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [advising, setAdvising] = useState(false);
    const [syncResult, setSyncResult] = useState<{ success: boolean; recordsSynced: number } | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setTimeout(() => setMounted(true), 0);
    }, []);

    // Calculate KPIs
    // Calculate KPIs based on selected range
    const [selectedDays, setSelectedDays] = useState(initialDays);

    const handleRangeChange = (days: number) => {
        setSelectedDays(days);
        const url = new URL(window.location.href);
        url.searchParams.set("days", days.toString());
        router.push(url.pathname + url.search);
    };

    // Calculate periods starting from "Yesterday"
    const now = new Date();
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
    const currentPeriodStart = new Date(yesterday.getTime() - selectedDays * 24 * 60 * 60 * 1000);
    const previousPeriodStart = new Date(yesterday.getTime() - (selectedDays * 2) * 24 * 60 * 60 * 1000);

    const currentMetrics = client.campaignMetrics.filter((m) => {
        const d = new Date(m.date);
        return d >= currentPeriodStart && d <= yesterday;
    });
    const previousMetrics = client.campaignMetrics.filter((m) => {
        const d = new Date(m.date);
        return d >= previousPeriodStart && d < currentPeriodStart;
    });

    const currentPeriod = aggregateCampaigns(currentMetrics as never[]);
    const previousPeriod = aggregateCampaigns(previousMetrics as never[]);

    const servingIssues = currentMetrics.filter((m) => m.servingStatus !== "ELIGIBLE").length;
    const merchantDisapprovalPct = client.merchantCenterHealth[0]
        ? Number(client.merchantCenterHealth[0].disapprovedPct)
        : 0;

    const kpi = calculateKPI(
        client.targetType as TargetType,
        Number(client.targetValue),
        client.tolerancePct,
        currentPeriod,
        previousPeriod,
        client.profitMarginPct ? Number(client.profitMarginPct) : null,
        servingIssues,
        0,
        merchantDisapprovalPct
    );

    // Chart data
    const chartData = dailyMetrics.map((d) => ({
        date: new Date(d.date).toLocaleDateString("nl-NL", { day: "numeric", month: "short" }),
        spend: Number(d._sum.spend || 0),
        conversions: Number(d._sum.conversions || 0),
        conversionValue: Number(d._sum.conversionValue || 0),
        kpi:
            client.targetType === "CPA"
                ? Number(d._sum.conversions || 0) > 0
                    ? Number(d._sum.spend || 0) / Number(d._sum.conversions || 0)
                    : 0
                : Number(d._sum.spend || 0) > 0
                    ? Number(d._sum.conversionValue || 0) / Number(d._sum.spend || 0)
                    : 0,
    }));

    // Analyst report data
    const analystReport = client.analystReports[0];
    const reportData = analystReport?.reportJson as {
        primaryRiskDriver?: string;
        topIssues?: Array<{ issue: string; impact: string; category: string }>;
        actionCandidates?: string[];
        complianceFlags?: string[];
    } | null;
    const advisorData = analystReport?.advisorReport?.adviceJson as {
        executiveSummary?: string;
        priorities?: Array<{
            priority: string;
            action: string;
            expectedEffect: string;
            risk: string;
        }>;
        checklist?: string[];
    } | null;

    // Campaign table — sort by spend descending
    const campaignsSorted = [...currentPeriod.campaigns].sort((a, b) => b.spend - a.spend);

    const handleStatusUpdate = async (newStatus: string) => {
        setSaving(true);
        try {
            const advisorReportId = analystReport?.advisorReport?.id;
            if (!advisorReportId) return;

            await fetch(`/api/advisor-reports/${advisorReportId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus, notes }),
            });
            setAdvisorStatus(newStatus);
            router.refresh();
        } catch (error) {
            console.error("Failed to update status:", error);
        }
        setSaving(false);
    };

    const handleSaveNotes = async () => {
        setSaving(true);
        try {
            const advisorReportId = analystReport?.advisorReport?.id;
            if (!advisorReportId) return;

            await fetch(`/api/advisor-reports/${advisorReportId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ notes }),
            });
        } catch (error) {
            console.error("Failed to save notes:", error);
        }
        setSaving(false);
    };

    const handleSync = async () => {
        setSyncing(true);
        setSyncResult(null);
        try {
            const response = await fetch(`/api/clients/${client.id}/sync`, {
                method: "POST",
            });
            const data = await response.json();
            if (data.success) {
                setSyncResult(data);
                router.refresh();
            } else {
                alert(data.error || "Synchronisatie mislukt");
            }
        } catch (error) {
            console.error("Failed to sync:", error);
            alert("Er is een fout opgetreden bij de synchronisatie");
        }
        setSyncing(false);
    };

    const handleAnalyze = async () => {
        setAnalyzing(true);
        try {
            const response = await fetch(`/api/clients/${client.id}/analyze`, {
                method: "POST",
            });
            if (response.ok) {
                router.refresh();
            } else {
                const data = await response.json();
                alert(data.error || "Analyse mislukt");
            }
        } catch (error) {
            console.error("Failed to analyze:", error);
        }
        setAnalyzing(false);
    };

    const handleAdvise = async () => {
        setAdvising(true);
        try {
            const analystReportId = analystReport?.id;
            if (!analystReportId) return;

            const response = await fetch(`/api/analyst-reports/${analystReportId}/advise`, {
                method: "POST",
            });
            if (response.ok) {
                router.refresh();
            } else {
                const data = await response.json();
                alert(data.error || "Advies generatie mislukt");
            }
        } catch (error) {
            console.error("Failed to generate advice:", error);
        }
        setAdvising(false);
    };

    const getTrendIcon = (dir: string) => {
        switch (dir) {
            case "IMPROVING": return <TrendingUp size={16} />;
            case "DECLINING": return <TrendingDown size={16} />;
            default: return <Minus size={16} />;
        }
    };

    const getImpactColor = (impact: string) => {
        switch (impact) {
            case "HIGH": return "var(--color-danger)";
            case "MEDIUM": return "var(--color-warning)";
            default: return "var(--color-text-secondary)";
        }
    };

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "16px",
                    flexWrap: "wrap",
                    gap: "16px",
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <Link
                        href="/dashboard"
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            color: "var(--color-text-muted)",
                            textDecoration: "none",
                            fontSize: "0.85rem",
                        }}
                    >
                        <ArrowLeft size={16} /> Terug
                    </Link>

                    {/* Range Selector */}
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "8px" }}>
                        <select
                            value={selectedDays}
                            onChange={(e) => handleRangeChange(parseInt(e.target.value))}
                            className="glass-card"
                            style={{
                                appearance: "none",
                                background: "rgba(30, 41, 59, 0.4)",
                                border: "1px solid rgba(255, 255, 255, 0.1)",
                                color: "var(--color-text-main)",
                                padding: "4px 32px 4px 12px",
                                borderRadius: "6px",
                                fontSize: "0.85rem",
                                cursor: "pointer",
                                outline: "none",
                                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                                backgroundRepeat: "no-repeat",
                                backgroundPosition: "right 8px center",
                            }}
                        >
                            <option value="7">Laatste 7 dagen</option>
                            <option value="14">Laatste 14 dagen</option>
                            <option value="30">Laatste 30 dagen</option>
                            <option value="90">Laatste 90 dagen</option>
                        </select>
                    </div>

                    {userRole === "ADMIN" && (
                        <button
                            onClick={handleSync}
                            disabled={syncing}
                            className="glass-card"
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "8px",
                                padding: "6px 12px",
                                fontSize: "0.85rem",
                                color: "var(--color-brand)",
                                border: "1px solid rgba(99, 102, 241, 0.3)",
                                cursor: syncing ? "not-allowed" : "pointer",
                                opacity: syncing ? 0.7 : 1,
                                background: "none"
                            }}
                        >
                            <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
                            {syncing ? "Synchroniseren..." : "Sync Google Ads"}
                        </button>
                    )}
                    {syncResult && (
                        <span style={{ fontSize: "0.75rem", color: "#10b981" }}>
                            ✓ {syncResult.recordsSynced} records bijgewerkt
                        </span>
                    )}
                </div>
            </div>

            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "32px",
                    flexWrap: "wrap",
                    gap: "16px",
                }}
            >
                <div>
                    <h1 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "4px" }}>
                        {client.name}
                    </h1>
                    <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                        <span
                            style={{
                                fontSize: "0.75rem",
                                padding: "2px 8px",
                                background: "rgba(99, 102, 241, 0.1)",
                                borderRadius: "6px",
                                color: "#818cf8",
                            }}
                        >
                            {client.industryType}
                        </span>
                        <span style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                            <Target size={14} /> {client.targetType}: {formatNumber(Number(client.targetValue), 2)}
                        </span>
                    </div>
                </div>

                {/* Health Score */}
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ position: "relative", width: "72px", height: "72px" }}>
                        <svg width="72" height="72" viewBox="0 0 72 72">
                            <circle cx="36" cy="36" r="30" fill="none" stroke="rgba(51, 65, 85, 0.4)" strokeWidth="6" />
                            <circle
                                cx="36"
                                cy="36"
                                r="30"
                                fill="none"
                                stroke={getHealthColor(kpi.healthScore)}
                                strokeWidth="6"
                                strokeLinecap="round"
                                strokeDasharray={`${(kpi.healthScore / 100) * 188.5} 188.5`}
                                transform="rotate(-90 36 36)"
                            />
                        </svg>
                        <div
                            style={{
                                position: "absolute",
                                inset: 0,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "1.25rem",
                                fontWeight: 700,
                                color: getHealthColor(kpi.healthScore),
                            }}
                        >
                            {kpi.healthScore}
                        </div>
                    </div>
                    <div>
                        <p style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)", fontWeight: 600 }}>
                            Health Score
                        </p>
                        <p style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.8rem", color: getHealthColor(kpi.healthScore) }}>
                            {getHealthLabel(kpi.healthScore)} {getTrendIcon(kpi.trendDirection)}
                        </p>
                    </div>
                </div>
            </div>

            {/* A. KPI Summary */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                    gap: "12px",
                    marginBottom: "24px",
                }}
            >
                <KPICard
                    label={client.targetType}
                    value={client.targetType === "CPA" ? formatCurrency(kpi.blendedKPI) : formatNumber(kpi.blendedKPI, 2)}
                    target={client.targetType === "CPA" ? formatCurrency(Number(client.targetValue)) : formatNumber(Number(client.targetValue), 2)}
                    delta={kpi.wow.kpiDelta}
                    deviation={kpi.targetDeviation}
                    inverse={client.targetType === "CPA"}
                />
                <KPICard label="Spend" value={formatCurrency(kpi.currentPeriod.totalSpend)} delta={kpi.wow.spendDelta} />
                <KPICard label="Conversies" value={formatNumber(kpi.currentPeriod.totalConversions, 0)} delta={kpi.wow.conversionDelta} />
                <KPICard label="CVR" value={`${formatNumber(kpi.currentPeriod.cvr, 2)}%`} delta={kpi.wow.cvrDelta} />
                <KPICard label="CPC" value={formatCurrency(kpi.currentPeriod.cpc)} delta={kpi.wow.cpcDelta} inverse />
            </div>

            {/* Chart */}
            <div className="glass-card" style={{ padding: "24px", marginBottom: "24px" }}>
                <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <BarChart3 size={18} /> Performance ({selectedDays} dagen)
                </h3>
                <div style={{ width: "100%", height: 280, minWidth: 0 }}>
                    {mounted ? (
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                <defs>
                                    <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="kpiGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(51, 65, 85, 0.3)" />
                                <XAxis
                                    dataKey="date"
                                    stroke="#64748b"
                                    fontSize={12}
                                    tickLine={false}
                                />
                                <YAxis stroke="#64748b" fontSize={12} tickLine={false} />
                                <Tooltip
                                    contentStyle={{
                                        background: "var(--color-surface-elevated)",
                                        border: "1px solid var(--color-border)",
                                        borderRadius: "10px",
                                        fontSize: "0.8rem",
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="spend"
                                    stroke="#6366f1"
                                    fill="url(#spendGrad)"
                                    strokeWidth={2}
                                    name="Spend"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="conversions"
                                    stroke="#10b981"
                                    fill="url(#kpiGrad)"
                                    strokeWidth={2}
                                    name="Conversies"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div style={{ width: "100%", height: "100%", background: "rgba(51, 65, 85, 0.1)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-muted)", fontSize: "0.8rem" }}>
                            Grafiek laden...
                        </div>
                    )}
                </div>
            </div>

            {/* B. Campaign Table */}
            <div className="glass-card" style={{ marginBottom: "24px", overflow: "hidden" }}>
                <div style={{ padding: "20px 24px 0" }}>
                    <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "16px" }}>
                        Campagnes (afgelopen {selectedDays} dagen)
                    </h3>
                </div>
                <div style={{ overflowX: "auto" }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Campagne</th>
                                <th>Type</th>
                                <th style={{ textAlign: "right" }}>Spend</th>
                                <th style={{ textAlign: "right" }}>{client.targetType}</th>
                                <th style={{ textAlign: "right" }}>Deviation</th>
                                <th>Status</th>
                                <th>Risk</th>
                            </tr>
                        </thead>
                        <tbody>
                            {campaignsSorted.map((campaign) => {
                                const campKPI =
                                    client.targetType === "CPA"
                                        ? campaign.conversions > 0
                                            ? Number(campaign.spend) / Number(campaign.conversions)
                                            : 0
                                        : Number(campaign.spend) > 0
                                            ? Number(campaign.conversionValue) / Number(campaign.spend)
                                            : 0;

                                const deviation =
                                    client.targetType === "CPA"
                                        ? Number(client.targetValue) > 0
                                            ? ((campKPI - Number(client.targetValue)) / Number(client.targetValue)) * 100
                                            : 0
                                        : Number(client.targetValue) > 0
                                            ? ((Number(client.targetValue) - campKPI) / Number(client.targetValue)) * 100
                                            : 0;

                                const hasRisk = deviation > client.tolerancePct || campaign.servingStatus !== "ELIGIBLE";

                                return (
                                    <tr key={campaign.campaignId}>
                                        <td style={{ fontWeight: 500, maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                            {campaign.campaignName}
                                        </td>
                                        <td>
                                            <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                                                {campaign.campaignType}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                                            {formatCurrency(Number(campaign.spend))}
                                        </td>
                                        <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                                            {client.targetType === "CPA"
                                                ? formatCurrency(campKPI)
                                                : formatNumber(campKPI, 2)}
                                        </td>
                                        <td
                                            style={{
                                                textAlign: "right",
                                                fontVariantNumeric: "tabular-nums",
                                                color: deviation > 0 ? "var(--color-danger)" : "var(--color-success)",
                                                fontWeight: 600,
                                            }}
                                        >
                                            {formatPercent(deviation)}
                                        </td>
                                        <td>
                                            <span
                                                style={{
                                                    fontSize: "0.75rem",
                                                    color:
                                                        campaign.servingStatus === "ELIGIBLE"
                                                            ? "#10b981"
                                                            : "#f59e0b",
                                                }}
                                            >
                                                {campaign.servingStatus === "ELIGIBLE" ? "●" : "◐"}{" "}
                                                {campaign.servingStatus}
                                            </span>
                                        </td>
                                        <td>
                                            {hasRisk && (
                                                <AlertTriangle
                                                    size={14}
                                                    color={deviation > client.tolerancePct * 2 ? "#ef4444" : "#f59e0b"}
                                                />
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* C & D. AI Reports */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))",
                    gap: "16px",
                    marginBottom: "24px",
                }}
            >
                {/* Analyst Report */}
                <div className="glass-card" style={{ padding: "24px" }}>
                    <h3
                        style={{
                            fontSize: "1rem",
                            fontWeight: 600,
                            marginBottom: "20px",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                        }}
                    >
                        <FileText size={18} color="#6366f1" /> AI Analyst Rapport
                    </h3>

                    {reportData ? (
                        <>
                            {reportData.primaryRiskDriver && (
                                <div
                                    style={{
                                        padding: "12px 16px",
                                        background: "rgba(239, 68, 68, 0.08)",
                                        border: "1px solid rgba(239, 68, 68, 0.15)",
                                        borderRadius: "10px",
                                        marginBottom: "16px",
                                    }}
                                >
                                    <p style={{ fontSize: "0.75rem", color: "#f87171", fontWeight: 600, marginBottom: "4px" }}>
                                        Primary Risk Driver
                                    </p>
                                    <p style={{ fontSize: "0.85rem" }}>{reportData.primaryRiskDriver}</p>
                                </div>
                            )}

                            {reportData.topIssues && (
                                <div style={{ marginBottom: "16px" }}>
                                    <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: "8px" }}>
                                        Top Issues
                                    </p>
                                    {reportData.topIssues.map((issue, i) => (
                                        <div
                                            key={i}
                                            style={{
                                                display: "flex",
                                                gap: "10px",
                                                padding: "10px 0",
                                                borderBottom: i < (reportData.topIssues?.length || 0) - 1 ? "1px solid rgba(51, 65, 85, 0.3)" : "none",
                                            }}
                                        >
                                            <span
                                                style={{
                                                    fontSize: "0.65rem",
                                                    padding: "2px 6px",
                                                    borderRadius: "4px",
                                                    background: `${getImpactColor(issue.impact)}15`,
                                                    color: getImpactColor(issue.impact),
                                                    fontWeight: 600,
                                                    whiteSpace: "nowrap",
                                                    height: "fit-content",
                                                }}
                                            >
                                                {issue.impact}
                                            </span>
                                            <p style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
                                                {issue.issue}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {reportData.actionCandidates && (
                                <div>
                                    <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: "8px" }}>
                                        Action Candidates
                                    </p>
                                    {reportData.actionCandidates.map((action, i) => (
                                        <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "6px", fontSize: "0.8rem" }}>
                                            <span style={{ color: "var(--color-brand)" }}>→</span>
                                            <span style={{ color: "var(--color-text-secondary)" }}>{action}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {reportData.complianceFlags && reportData.complianceFlags.length > 0 && (
                                <div style={{ marginTop: "12px" }}>
                                    {reportData.complianceFlags.map((flag, i) => (
                                        <div
                                            key={i}
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "6px",
                                                fontSize: "0.8rem",
                                                color: "#f59e0b",
                                                marginBottom: "4px",
                                            }}
                                        >
                                            <AlertCircle size={14} /> {flag}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    ) : (
                        <div style={{ color: "var(--color-text-muted)", textAlign: "center", padding: "24px" }}>
                            <FileText size={32} style={{ opacity: 0.3, marginBottom: "12px" }} />
                            <p style={{ fontSize: "0.85rem", marginBottom: "16px" }}>Nog geen analyse gegenereerd</p>
                            <button
                                onClick={handleAnalyze}
                                disabled={analyzing || client.campaignMetrics.length === 0}
                                className="btn btn-primary"
                                style={{ fontSize: "0.8rem", padding: "8px 16px" }}
                            >
                                {analyzing ? <RefreshCw size={14} className="animate-spin" /> : <FileText size={14} />}
                                {analyzing ? "Analyseren..." : "Analyseer Nu"}
                            </button>
                            {client.campaignMetrics.length === 0 && (
                                <p style={{ fontSize: "0.7rem", marginTop: "8px", color: "#f87171" }}>
                                    Synchroniseer eerst Google Ads data
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* E. Advisor Report */}
                <div className="glass-card" style={{ padding: "24px" }}>
                    <h3
                        style={{
                            fontSize: "1rem",
                            fontWeight: 600,
                            marginBottom: "20px",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                        }}
                    >
                        <MessageSquare size={18} color="#8b5cf6" /> AI Advisor Advies
                    </h3>

                    {advisorData ? (
                        <>
                            {advisorData.executiveSummary && (
                                <div
                                    style={{
                                        padding: "16px",
                                        background: "rgba(139, 92, 246, 0.06)",
                                        border: "1px solid rgba(139, 92, 246, 0.12)",
                                        borderRadius: "10px",
                                        marginBottom: "16px",
                                        fontSize: "0.85rem",
                                        lineHeight: "1.6",
                                        color: "var(--color-text-secondary)",
                                    }}
                                >
                                    {advisorData.executiveSummary}
                                </div>
                            )}

                            {advisorData.priorities && (
                                <div style={{ marginBottom: "16px" }}>
                                    {advisorData.priorities.map((p, i) => (
                                        <div
                                            key={i}
                                            style={{
                                                padding: "12px",
                                                marginBottom: "8px",
                                                background: "var(--color-surface-hover)",
                                                borderRadius: "10px",
                                                borderLeft: `3px solid ${p.priority === "P1" ? "var(--color-danger)" : p.priority === "P2" ? "var(--color-warning)" : "var(--color-brand)"
                                                    }`,
                                            }}
                                        >
                                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                                                <span
                                                    style={{
                                                        fontSize: "0.7rem",
                                                        fontWeight: 700,
                                                        padding: "2px 8px",
                                                        borderRadius: "4px",
                                                        background:
                                                            p.priority === "P1"
                                                                ? "rgba(239, 68, 68, 0.15)"
                                                                : p.priority === "P2"
                                                                    ? "rgba(245, 158, 11, 0.15)"
                                                                    : "rgba(99, 102, 241, 0.15)",
                                                        color:
                                                            p.priority === "P1"
                                                                ? "var(--color-danger)"
                                                                : p.priority === "P2"
                                                                    ? "var(--color-warning)"
                                                                    : "var(--color-brand-light)",
                                                    }}
                                                >
                                                    {p.priority}
                                                </span>
                                                <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                                                    {p.action}
                                                </span>
                                            </div>
                                            <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginBottom: "4px" }}>
                                                Verwacht: {p.expectedEffect}
                                            </p>
                                            <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                                                Risico: {p.risk}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {advisorData.checklist && (
                                <div style={{ marginBottom: "16px" }}>
                                    <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: "8px" }}>
                                        Checklist
                                    </p>
                                    {advisorData.checklist.map((item, i) => (
                                        <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "4px", fontSize: "0.8rem" }}>
                                            <CheckCircle size={14} style={{ color: "var(--color-text-muted)", minWidth: "14px", marginTop: "2px" }} />
                                            <span style={{ color: "var(--color-text-secondary)" }}>{item}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Status & Notes */}
                            <div
                                style={{
                                    paddingTop: "16px",
                                    borderTop: "1px solid rgba(51, 65, 85, 0.3)",
                                }}
                            >
                                <div style={{ marginBottom: "12px" }}>
                                    <label className="label">Status</label>
                                    <select
                                        className="select"
                                        value={advisorStatus}
                                        onChange={(e) => handleStatusUpdate(e.target.value)}
                                        disabled={saving || userRole === "VIEWER"}
                                    >
                                        <option value="DRAFT">Draft</option>
                                        <option value="REVIEWED">Reviewed</option>
                                        <option value="APPROVED">Approved</option>
                                        <option value="EXECUTED">Executed</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="label">Notities</label>
                                    <textarea
                                        className="input"
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        onBlur={handleSaveNotes}
                                        rows={3}
                                        placeholder="Voeg notities toe..."
                                        disabled={userRole === "VIEWER"}
                                        style={{ resize: "vertical" }}
                                    />
                                </div>
                            </div>
                        </>
                    ) : (
                        <div style={{ color: "var(--color-text-muted)", textAlign: "center", padding: "24px" }}>
                            <MessageSquare size={32} style={{ opacity: 0.3, marginBottom: "12px" }} />
                            <p style={{ fontSize: "0.85rem", marginBottom: "16px" }}>Nog geen advies gegenereerd</p>
                            <button
                                onClick={handleAdvise}
                                disabled={advising || !reportData}
                                className="btn btn-secondary"
                                style={{ fontSize: "0.8rem", padding: "8px 16px", background: "rgba(139, 92, 246, 0.1)", color: "#a78bfa" }}
                            >
                                {advising ? <RefreshCw size={14} className="animate-spin" /> : <MessageSquare size={14} />}
                                {advising ? "Advies maken..." : "Genereer Strategie"}
                            </button>
                            {!reportData && (
                                <p style={{ fontSize: "0.7rem", marginTop: "8px" }}>
                                    Eerst moet de AI Analyst een analyse maken
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function KPICard({
    label,
    value,
    target,
    delta,
    deviation,
    inverse,
}: {
    label: string;
    value: string;
    target?: string;
    delta?: number;
    deviation?: number;
    inverse?: boolean;
}) {
    const deltaPositive = inverse ? (delta ?? 0) < 0 : (delta ?? 0) > 0;
    const deltaColor = delta === undefined || delta === 0 ? "var(--color-text-muted)" : deltaPositive ? "var(--color-success)" : "var(--color-danger)";

    return (
        <div className="glass-card" style={{ padding: "16px" }}>
            <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginBottom: "8px" }}>
                {label}
            </p>
            <p style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "4px" }}>{value}</p>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                {delta !== undefined && (
                    <span style={{ fontSize: "0.75rem", color: deltaColor, fontWeight: 500 }}>
                        {formatPercent(delta)} WoW
                    </span>
                )}
                {target && (
                    <span style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>
                        vs {target} target
                    </span>
                )}
                {deviation !== undefined && (
                    <span
                        style={{
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            color: ((inverse ? deviation > 0 : deviation < 0) ? "var(--color-danger)" : "var(--color-success)"),
                        }}
                    >
                        ({deviation > 0 ? "+" : ""}{formatNumber(deviation, 1)}%)
                    </span>
                )}
            </div>
        </div>
    );
}
