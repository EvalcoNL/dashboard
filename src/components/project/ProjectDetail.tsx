"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    ArrowLeft,
    Target,
    TrendingUp,
    TrendingDown,
    Minus,
    BarChart3,
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
    type TargetType,
} from "@/lib/services/kpi-engine";
import { useState, useEffect } from "react";
import KPICard from "@/components/ui/KPICard";
import CampaignTable from "@/components/project/CampaignTable";

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

export default function ProjectDetail({
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
    const [syncing, setSyncing] = useState(false);
    const [syncResult, setSyncResult] = useState<{ success: boolean; recordsSynced: number } | null>(null);
    const [mounted, setMounted] = useState(false);
    const [selectedDays, setSelectedDays] = useState(initialDays);

    useEffect(() => {
        setTimeout(() => setMounted(true), 0);
    }, []);

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

    const handleSync = async () => {
        setSyncing(true);
        setSyncResult(null);
        try {
            const response = await fetch(`/api/projects/${client.id}/sync`, { method: "POST" });
            const data = await response.json();
            if (data.success) {
                setSyncResult(data);
                router.refresh();
            } else {
                alert(data.error || "Synchronisatie mislukt");
            }
        } catch (error: any) {
            console.error("Failed to sync:", error);
            alert("Er is een fout opgetreden bij de synchronisatie");
        }
        setSyncing(false);
    };

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

    const getTrendIcon = (dir: string) => {
        switch (dir) {
            case "IMPROVING": return <TrendingUp size={16} />;
            case "DECLINING": return <TrendingDown size={16} />;
            default: return <Minus size={16} />;
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

            {/* KPI Summary */}
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
                                <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} />
                                <YAxis stroke="#64748b" fontSize={12} tickLine={false} />
                                <Tooltip
                                    contentStyle={{
                                        background: "var(--color-surface-elevated)",
                                        border: "1px solid var(--color-border)",
                                        borderRadius: "10px",
                                        fontSize: "0.8rem",
                                    }}
                                />
                                <Area type="monotone" dataKey="spend" stroke="#6366f1" fill="url(#spendGrad)" strokeWidth={2} name="Spend" />
                                <Area type="monotone" dataKey="conversions" stroke="#10b981" fill="url(#kpiGrad)" strokeWidth={2} name="Conversies" />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div style={{ width: "100%", height: "100%", background: "rgba(51, 65, 85, 0.1)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-muted)", fontSize: "0.8rem" }}>
                            Grafiek laden...
                        </div>
                    )}
                </div>
            </div>

            <CampaignTable
                campaigns={currentPeriod.campaigns}
                targetType={client.targetType}
                targetValue={Number(client.targetValue)}
                tolerancePct={client.tolerancePct}
                selectedDays={selectedDays}
            />
        </div>
    );
}
