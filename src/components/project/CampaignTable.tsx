"use client";

import { AlertTriangle } from "lucide-react";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/services/kpi-engine";

interface Campaign {
    campaignId: string;
    campaignName: string;
    campaignType: string;
    spend: number;
    conversions: number;
    conversionValue: number;
    servingStatus: string;
}

interface CampaignTableProps {
    campaigns: Campaign[];
    targetType: string;
    targetValue: number;
    tolerancePct: number;
    selectedDays: number;
}

export default function CampaignTable({
    campaigns,
    targetType,
    targetValue,
    tolerancePct,
    selectedDays,
}: CampaignTableProps) {
    const sorted = [...campaigns].sort((a, b) => b.spend - a.spend);

    return (
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
                            <th style={{ textAlign: "right" }}>{targetType}</th>
                            <th style={{ textAlign: "right" }}>Deviation</th>
                            <th>Status</th>
                            <th>Risk</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.map((campaign) => {
                            const campKPI =
                                targetType === "CPA"
                                    ? campaign.conversions > 0
                                        ? Number(campaign.spend) / Number(campaign.conversions)
                                        : 0
                                    : Number(campaign.spend) > 0
                                        ? Number(campaign.conversionValue) / Number(campaign.spend)
                                        : 0;

                            const deviation =
                                targetType === "CPA"
                                    ? targetValue > 0
                                        ? ((campKPI - targetValue) / targetValue) * 100
                                        : 0
                                    : targetValue > 0
                                        ? ((targetValue - campKPI) / targetValue) * 100
                                        : 0;

                            const hasRisk = deviation > tolerancePct || campaign.servingStatus !== "ELIGIBLE";

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
                                        {targetType === "CPA"
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
                                                color={deviation > tolerancePct * 2 ? "#ef4444" : "#f59e0b"}
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
    );
}
