"use client";

import Link from "next/link";
import {
    TrendingUp,
    TrendingDown,
    Minus,
    AlertTriangle,
    CheckCircle,
    Clock,
    ArrowUpRight,
    Users,
    Activity,
    BarChart3,
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

interface ClientWithData {
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

export default function DashboardHome({
    clients,
    userName,
}: {
    clients: ClientWithData[];
    userName: string;
}) {
    // Process KPIs for each client
    const clientKPIs = clients.map((client) => {
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

        const currentMetrics = client.campaignMetrics.filter((m) => {
            const date = new Date(m.date);
            return date >= sevenDaysAgo;
        });

        const previousMetrics = client.campaignMetrics.filter((m) => {
            const date = new Date(m.date);
            return date >= fourteenDaysAgo && date < sevenDaysAgo;
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

    // Sort by health score (lowest first = most urgent)
    const sorted = [...clientKPIs].sort((a, b) => a.kpi.healthScore - b.kpi.healthScore);

    // Stats summary
    const avgHealth = clientKPIs.length > 0
        ? Math.round(clientKPIs.reduce((sum, c) => sum + c.kpi.healthScore, 0) / clientKPIs.length)
        : 0;
    const criticalCount = clientKPIs.filter((c) => c.kpi.healthScore < 50).length;
    const totalSpend = clientKPIs.reduce((sum, c) => sum + c.kpi.currentPeriod.totalSpend, 0);

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
                    value={clients.length.toString()}
                    color="var(--color-brand)"
                />
                <SummaryCard
                    icon={<Activity size={20} />}
                    label="Gem. Health Score"
                    value={avgHealth.toString()}
                    color={getHealthColor(avgHealth)}
                />
                <SummaryCard
                    icon={<AlertTriangle size={20} />}
                    label="Kritiek"
                    value={criticalCount.toString()}
                    color={criticalCount > 0 ? "#ef4444" : "#10b981"}
                />
                <SummaryCard
                    icon={<BarChart3 size={20} />}
                    label="Totale Spend (7d)"
                    value={formatCurrency(totalSpend)}
                    color="var(--color-brand-light)"
                />
            </div>

            {/* Client Cards */}
            <div style={{ marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <h2 style={{ fontSize: "1.1rem", fontWeight: 600 }}>Projecten</h2>
                <Link
                    href="/dashboard/projects/new"
                    className="btn btn-primary btn-sm"
                    style={{ textDecoration: "none" }}
                >
                    + Project Toevoegen
                </Link>
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
            ) : (
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
                            href={`/dashboard/projects/${client.id}`}
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
                                            <span
                                                style={{
                                                    fontSize: "0.7rem",
                                                    color: "var(--color-text-muted)",
                                                }}
                                            >
                                                Target: {client.targetType} {formatNumber(Number(client.targetValue), 2)}
                                            </span>
                                        </div>
                                    </div>
                                    <ArrowUpRight size={16} style={{ color: "var(--color-text-muted)" }} />
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
                                            <circle
                                                cx="32"
                                                cy="32"
                                                r="26"
                                                fill="none"
                                                stroke={getHealthColor(kpi.healthScore)}
                                                strokeWidth="6"
                                                strokeLinecap="round"
                                                strokeDasharray={`${(kpi.healthScore / 100) * 163.36} 163.36`}
                                                transform="rotate(-90 32 32)"
                                                style={{ transition: "all 0.6s ease" }}
                                            />
                                        </svg>
                                        <div
                                            style={{
                                                position: "absolute",
                                                inset: 0,
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                fontSize: "1rem",
                                                fontWeight: 700,
                                                color: getHealthColor(kpi.healthScore),
                                            }}
                                        >
                                            {kpi.healthScore}
                                        </div>
                                    </div>

                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                                            <span style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
                                                {getHealthLabel(kpi.healthScore)}
                                            </span>
                                            <span style={{ color: getTrendColor(kpi.trendDirection) }}>
                                                {getTrendIcon(kpi.trendDirection)}
                                            </span>
                                        </div>

                                        <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
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
                                                <span>Spend (7d)</span>
                                                <span style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>
                                                    {formatCurrency(kpi.currentPeriod.totalSpend)}
                                                </span>
                                            </div>
                                        </div>
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
                                        {kpi.targetStatus === "critical" ? (
                                            <AlertTriangle size={14} color="#ef4444" />
                                        ) : kpi.targetStatus === "warning" ? (
                                            <Clock size={14} color="#f59e0b" />
                                        ) : (
                                            <CheckCircle size={14} color="#10b981" />
                                        )}
                                        <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                                            {kpi.targetStatus === "critical"
                                                ? "Kritiek"
                                                : kpi.targetStatus === "warning"
                                                    ? "Waarschuwing"
                                                    : "Op Target"}
                                        </span>
                                    </div>
                                    {advisorStatus && getStatusBadge(advisorStatus)}
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
