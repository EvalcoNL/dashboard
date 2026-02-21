// SQLite uses Float (number) instead of Decimal
type Decimal = number;

export interface CampaignData {
    campaignId: string;
    campaignName: string;
    campaignType: string;
    spend: number;
    conversions: number;
    conversionValue: number;
    clicks: number;
    impressions: number;
    status: string;
    servingStatus: string;
}

export interface PeriodMetrics {
    totalSpend: number;
    totalConversions: number;
    totalConversionValue: number;
    totalClicks: number;
    totalImpressions: number;
    cpa: number;
    roas: number;
    cpc: number;
    cvr: number;
    campaigns: CampaignData[];
}

export interface KPIResult {
    currentPeriod: PeriodMetrics;
    previousPeriod: PeriodMetrics;
    blendedKPI: number;
    targetDeviation: number;
    targetStatus: "on_track" | "warning" | "critical";
    wow: {
        spendDelta: number;
        conversionDelta: number;
        cvrDelta: number;
        cpcDelta: number;
        kpiDelta: number;
    };
    healthScore: number;
    healthBreakdown: {
        target: number;
        disapprovals: number;
        servingIssues: number;
        merchantIssues: number;
        spendAnomaly: number;
    };
    trendDirection: "IMPROVING" | "STABLE" | "DECLINING";
}

export type TargetType = "CPA" | "ROAS" | "POAS";

function toNumber(val: number): number {
    return val;
}

export function aggregateCampaigns(
    metrics: Array<{
        campaignId: string;
        campaignName: string;
        campaignType: string;
        spend: Decimal | number;
        conversions: Decimal | number;
        conversionValue: Decimal | number;
        clicks: number;
        impressions: number;
        status: string;
        servingStatus: string;
    }>
): PeriodMetrics {
    const campaignMap = new Map<string, CampaignData>();

    for (const m of metrics) {
        const existing = campaignMap.get(m.campaignId);
        const spend = toNumber(m.spend);
        const conversions = toNumber(m.conversions);
        const conversionValue = toNumber(m.conversionValue);

        if (existing) {
            existing.spend += spend;
            existing.conversions += conversions;
            existing.conversionValue += conversionValue;
            existing.clicks += m.clicks;
            existing.impressions += m.impressions;
            // Keep last status
            existing.status = m.status;
            existing.servingStatus = m.servingStatus;
        } else {
            campaignMap.set(m.campaignId, {
                campaignId: m.campaignId,
                campaignName: m.campaignName,
                campaignType: m.campaignType,
                spend,
                conversions,
                conversionValue,
                clicks: m.clicks,
                impressions: m.impressions,
                status: m.status,
                servingStatus: m.servingStatus,
            });
        }
    }

    const campaigns = Array.from(campaignMap.values());
    const totalSpend = campaigns.reduce((sum, c) => sum + c.spend, 0);
    const totalConversions = campaigns.reduce((sum, c) => sum + c.conversions, 0);
    const totalConversionValue = campaigns.reduce((sum, c) => sum + c.conversionValue, 0);
    const totalClicks = campaigns.reduce((sum, c) => sum + c.clicks, 0);
    const totalImpressions = campaigns.reduce((sum, c) => sum + c.impressions, 0);

    return {
        totalSpend,
        totalConversions,
        totalConversionValue,
        totalClicks,
        totalImpressions,
        cpa: totalConversions > 0 ? totalSpend / totalConversions : 0,
        roas: totalSpend > 0 ? totalConversionValue / totalSpend : 0,
        cpc: totalClicks > 0 ? totalSpend / totalClicks : 0,
        cvr: totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0,
        campaigns,
    };
}

export function calculateKPI(
    targetType: TargetType,
    targetValue: number,
    tolerancePct: number,
    currentPeriod: PeriodMetrics,
    previousPeriod: PeriodMetrics,
    profitMarginPct?: number | null,
    servingIssueCount: number = 0,
    disapprovalCount: number = 0,
    merchantDisapprovalPct: number = 0
): KPIResult {
    // Calculate blended KPI
    let blendedKPI: number;
    if (targetType === "CPA") {
        blendedKPI = currentPeriod.cpa;
    } else if (targetType === "ROAS") {
        blendedKPI = currentPeriod.roas;
    } else {
        // POAS
        const margin = (profitMarginPct ?? 0) / 100;
        blendedKPI = currentPeriod.totalSpend > 0
            ? (currentPeriod.totalConversionValue * margin - currentPeriod.totalSpend) / currentPeriod.totalSpend
            : 0;
    }

    // Calculate target deviation
    let targetDeviation: number;
    if (targetType === "CPA") {
        // For CPA, higher is worse
        targetDeviation = targetValue > 0 ? ((blendedKPI - targetValue) / targetValue) * 100 : 0;
    } else {
        // For ROAS/POAS, lower is worse
        targetDeviation = targetValue > 0 ? ((targetValue - blendedKPI) / targetValue) * 100 : 0;
    }

    // Target status
    const absDeviation = Math.abs(targetDeviation);
    let targetStatus: "on_track" | "warning" | "critical";
    if (targetDeviation <= 0) {
        targetStatus = "on_track";
    } else if (absDeviation <= tolerancePct) {
        targetStatus = "on_track";
    } else if (absDeviation <= tolerancePct * 2) {
        targetStatus = "warning";
    } else {
        targetStatus = "critical";
    }

    // WoW deltas
    const prevKPI = targetType === "CPA" ? previousPeriod.cpa : previousPeriod.roas;
    const wow = {
        spendDelta: previousPeriod.totalSpend > 0
            ? ((currentPeriod.totalSpend - previousPeriod.totalSpend) / previousPeriod.totalSpend) * 100
            : 0,
        conversionDelta: previousPeriod.totalConversions > 0
            ? ((currentPeriod.totalConversions - previousPeriod.totalConversions) / previousPeriod.totalConversions) * 100
            : 0,
        cvrDelta: previousPeriod.cvr > 0
            ? ((currentPeriod.cvr - previousPeriod.cvr) / previousPeriod.cvr) * 100
            : 0,
        cpcDelta: previousPeriod.cpc > 0
            ? ((currentPeriod.cpc - previousPeriod.cpc) / previousPeriod.cpc) * 100
            : 0,
        kpiDelta: prevKPI > 0
            ? ((blendedKPI - prevKPI) / prevKPI) * 100
            : 0,
    };

    // Health Score (deterministic)
    let healthScore = 100;
    const healthBreakdown = {
        target: 0,
        disapprovals: 0,
        servingIssues: 0,
        merchantIssues: 0,
        spendAnomaly: 0,
    };

    // Target deviation penalty (0–40)
    if (targetDeviation > 0) {
        healthBreakdown.target = -Math.min(40, Math.round(targetDeviation * 1.5));
    }

    // Disapprovals penalty (0–15)
    if (disapprovalCount > 0) {
        healthBreakdown.disapprovals = -Math.min(15, disapprovalCount * 3);
    }

    // Serving issues penalty (0–15)
    if (servingIssueCount > 0) {
        healthBreakdown.servingIssues = -Math.min(15, servingIssueCount * 5);
    }

    // Merchant issues penalty (0–15)
    if (merchantDisapprovalPct > 0) {
        healthBreakdown.merchantIssues = -Math.min(15, Math.round(merchantDisapprovalPct));
    }

    // Spend anomaly penalty (0–15)
    const spendChange = Math.abs(wow.spendDelta);
    if (spendChange > 30) {
        healthBreakdown.spendAnomaly = -Math.min(15, Math.round((spendChange - 30) / 3));
    }

    healthScore = Math.max(0, Math.min(100,
        100 + healthBreakdown.target + healthBreakdown.disapprovals +
        healthBreakdown.servingIssues + healthBreakdown.merchantIssues +
        healthBreakdown.spendAnomaly
    ));

    // Trend direction
    let trendDirection: "IMPROVING" | "STABLE" | "DECLINING";
    if (targetType === "CPA") {
        // For CPA: decreasing is improving
        if (wow.kpiDelta < -5) trendDirection = "IMPROVING";
        else if (wow.kpiDelta > 5) trendDirection = "DECLINING";
        else trendDirection = "STABLE";
    } else {
        // For ROAS/POAS: increasing is improving
        if (wow.kpiDelta > 5) trendDirection = "IMPROVING";
        else if (wow.kpiDelta < -5) trendDirection = "DECLINING";
        else trendDirection = "STABLE";
    }

    return {
        currentPeriod,
        previousPeriod,
        blendedKPI,
        targetDeviation,
        targetStatus,
        wow,
        healthScore,
        healthBreakdown,
        trendDirection,
    };
}

export function getHealthColor(score: number): string {
    if (score >= 85) return "#10b981";
    if (score >= 70) return "#34d399";
    if (score >= 50) return "#f59e0b";
    if (score >= 30) return "#ef4444";
    return "#dc2626";
}

export function getHealthLabel(score: number): string {
    if (score >= 85) return "Excellent";
    if (score >= 70) return "Good";
    if (score >= 50) return "Warning";
    if (score >= 30) return "Poor";
    return "Critical";
}

export function formatCurrency(value: number, currency: string = "EUR"): string {
    return new Intl.NumberFormat("nl-NL", {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
}

export function formatNumber(value: number, decimals: number = 1): string {
    return new Intl.NumberFormat("nl-NL", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(value);
}

export function formatPercent(value: number, decimals: number = 1): string {
    const sign = value > 0 ? "+" : "";
    return `${sign}${formatNumber(value, decimals)}%`;
}
