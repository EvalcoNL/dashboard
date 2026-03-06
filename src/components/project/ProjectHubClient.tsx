"use client";

import Link from "next/link";
import {
    TrendingUp,
    Activity,
    ChevronRight,
    CheckCircle2,
    AlertTriangle,
    ArrowUpCircle,
    Target,
    BarChart3,
    ShieldCheck,
    FileText
} from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/services/kpi-engine";

interface ProjectHubClientProps {
    project: any;
    monitoringData: any[];
    performanceSummary: any;
    ongoingIncidents: number;
    healthScore: number | null;
    userRole: string;
}

export default function ProjectHubClient({
    project,
    monitoringData,
    performanceSummary,
    ongoingIncidents,
    healthScore,
    userRole
}: ProjectHubClientProps) {

    // Process monitoring data
    const domains = monitoringData.filter(d => d.type === "DOMAIN");
    const activeDomains = domains.length;
    const downDomains = domains.filter(d => d.uptimeChecks[0]?.status === "DOWN").length;

    const getHealthColor = (score: number) => {
        if (score >= 80) return "#10b981";
        if (score >= 60) return "#f59e0b";
        return "#ef4444";
    };

    return (
        <div style={{ padding: "32px", maxWidth: "1200px", margin: "0 auto" }}>
            {/* Header */}
            <div style={{ marginBottom: "40px" }}>
                <h1 style={{ fontSize: "2.2rem", fontWeight: 800, color: "var(--color-text-primary)", margin: 0 }}>
                    {project.name}
                </h1>
                <p style={{ color: "var(--color-text-muted)", fontSize: "1rem", marginTop: "8px" }}>
                    Project Overzicht & Status
                </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px" }}>

                {/* Reports & Dashboards Section */}
                <div className="glass-card" style={{
                    padding: "32px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    border: "1px solid var(--color-border)",
                    transition: "transform 0.2s, box-shadow 0.2s",
                }}>
                    <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
                            <div style={{
                                width: "56px", height: "56px", borderRadius: "16px",
                                background: "rgba(99, 102, 241, 0.1)", display: "flex",
                                alignItems: "center", justifyContent: "center", border: "1px solid rgba(99, 102, 241, 0.2)"
                            }}>
                                <TrendingUp size={28} color="var(--color-brand)" />
                            </div>
                            {healthScore !== null && (
                                <div style={{ textAlign: "right" }}>
                                    <div style={{ fontSize: "2rem", fontWeight: 800, color: getHealthColor(healthScore) }}>
                                        {healthScore}
                                    </div>
                                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>
                                        Health Score
                                    </div>
                                </div>
                            )}
                        </div>

                        <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "12px" }}>
                            Reports & Dashboards
                        </h2>
                        <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem", lineHeight: 1.6, marginBottom: "32px" }}>
                            Bekijk custom dashboards, analyseer campagnedata en krijg AI-gegenereerde inzichten en aanbevelingen.
                        </p>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "32px" }}>
                            <div style={{ padding: "16px", borderRadius: "12px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--color-border)" }}>
                                <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-muted)", marginBottom: "4px" }}>Spend (7d)</div>
                                <div style={{ fontSize: "1.25rem", fontWeight: 700 }}>{formatCurrency(performanceSummary._sum.spend || 0)}</div>
                            </div>
                            <div style={{ padding: "16px", borderRadius: "12px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--color-border)" }}>
                                <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-muted)", marginBottom: "4px" }}>Conversies (7d)</div>
                                <div style={{ fontSize: "1.25rem", fontWeight: 700 }}>{formatNumber(performanceSummary._sum.conversions || 0, 0)}</div>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        <Link href={`/projects/${project.id}/reports/dashboards`} style={{ textDecoration: "none" }}>
                            <button style={{
                                width: "100%", padding: "14px", borderRadius: "12px",
                                background: "var(--color-brand)", color: "white",
                                border: "none", fontWeight: 700, cursor: "pointer",
                                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px"
                            }}>
                                <BarChart3 size={18} /> Dashboards <ChevronRight size={18} />
                            </button>
                        </Link>
                        <Link href={`/projects/${project.id}/reports/ai`} style={{ textDecoration: "none" }}>
                            <button style={{
                                width: "100%", padding: "14px", borderRadius: "12px",
                                background: "var(--color-surface-elevated)", color: "var(--color-text-primary)",
                                border: "1px solid var(--color-border)", fontWeight: 700, cursor: "pointer",
                                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px"
                            }}>
                                <FileText size={18} /> AI Reports <ChevronRight size={18} />
                            </button>
                        </Link>
                    </div>
                </div>

                {/* Monitoring Section */}
                <div className="glass-card" style={{
                    padding: "32px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    border: "1px solid var(--color-border)"
                }}>
                    <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
                            <div style={{
                                width: "56px", height: "56px", borderRadius: "16px",
                                background: "rgba(16, 185, 129, 0.1)", display: "flex",
                                alignItems: "center", justifyContent: "center", border: "1px solid rgba(16, 185, 129, 0.2)"
                            }}>
                                <Activity size={28} color="#10b981" />
                            </div>
                            <div style={{ textAlign: "right" }}>
                                <div style={{
                                    fontSize: "0.85rem", fontWeight: 700,
                                    padding: "6px 12px", borderRadius: "20px",
                                    background: ongoingIncidents > 0 ? "rgba(239, 68, 68, 0.1)" : "rgba(16, 185, 129, 0.1)",
                                    color: ongoingIncidents > 0 ? "#ef4444" : "#10b981",
                                    display: "flex", alignItems: "center", gap: "6px"
                                }}>
                                    {ongoingIncidents > 0 ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
                                    {ongoingIncidents > 0 ? `${ongoingIncidents} Incidenten` : "Systeem OK"}
                                </div>
                            </div>
                        </div>

                        <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "12px" }}>
                            Monitoring
                        </h2>
                        <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem", lineHeight: 1.6, marginBottom: "32px" }}>
                            Bewaak de uptime van je domeinen en de integriteit van je tracking pixels. Ontvang alerts bij uitval.
                        </p>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "32px" }}>
                            <div style={{ padding: "16px", borderRadius: "12px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--color-border)" }}>
                                <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-muted)", marginBottom: "4px" }}>Uptime Status</div>
                                <div style={{ fontSize: "1.1rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
                                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: downDomains > 0 ? "#ef4444" : "#10b981" }} />
                                    {downDomains > 0 ? `${downDomains}/${activeDomains} Down` : "Alle systemen up"}
                                </div>
                            </div>
                            <div style={{ padding: "16px", borderRadius: "12px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--color-border)" }}>
                                <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-muted)", marginBottom: "4px" }}>Tracking Monitoring</div>
                                <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#10b981" }}>Actief</div>
                            </div>
                        </div>
                    </div>

                    <Link href={`/projects/${project.id}/monitoring/web`} style={{ textDecoration: "none" }}>
                        <button style={{
                            width: "100%", padding: "14px", borderRadius: "12px",
                            background: "var(--color-surface-elevated)", color: "var(--color-text-primary)",
                            border: "1px solid var(--color-border)", fontWeight: 700, cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center", gap: "8px"
                        }}>
                            Open Monitoring Dashboard <ChevronRight size={18} />
                        </button>
                    </Link>
                </div>

            </div>

            {/* Quick Stats Grid */}
            <div style={{ marginTop: "32px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
                <QuickStat icon={<ShieldCheck size={18} />} label="Data Sources" value={project.dataSources?.length || 0} />
                <QuickStat icon={<Target size={18} />} label="KPI Type" value={project.targetType} />
                <QuickStat icon={<BarChart3 size={18} />} label="Reports" value="7" />
                <QuickStat icon={<Activity size={18} />} label="Active Checks" value={activeDomains} />
            </div>
        </div>
    );
}

function QuickStat({ icon, label, value }: { icon: any, label: string, value: any }) {
    return (
        <div className="glass-card" style={{ padding: "16px", display: "flex", alignItems: "center", gap: "12px", border: "1px solid var(--color-border)" }}>
            <div style={{ color: "var(--color-brand)" }}>{icon}</div>
            <div>
                <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", fontWeight: 600, textTransform: "uppercase" }}>{label}</div>
                <div style={{ fontSize: "1rem", fontWeight: 700 }}>{value}</div>
            </div>
        </div>
    );
}
