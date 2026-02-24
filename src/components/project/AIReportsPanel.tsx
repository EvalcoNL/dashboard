"use client";

import {
    FileText,
    MessageSquare,
    RefreshCw,
    AlertCircle,
    CheckCircle,
} from "lucide-react";

interface ReportData {
    primaryRiskDriver?: string;
    topIssues?: Array<{ issue: string; impact: string; category: string }>;
    actionCandidates?: string[];
    complianceFlags?: string[];
}

interface AdvisorData {
    executiveSummary?: string;
    priorities?: Array<{
        priority: string;
        action: string;
        expectedEffect: string;
        risk: string;
    }>;
    checklist?: string[];
}

interface AIReportsPanelProps {
    reportData: ReportData | null;
    advisorData: AdvisorData | null;
    advisorStatus: string;
    notes: string;
    saving: boolean;
    analyzing: boolean;
    advising: boolean;
    userRole: string;
    hasCampaignData: boolean;
    onAnalyze: () => void;
    onAdvise: () => void;
    onStatusUpdate: (status: string) => void;
    onNotesChange: (notes: string) => void;
    onNotesSave: () => void;
}

const getImpactColor = (impact: string) => {
    switch (impact) {
        case "HIGH": return "var(--color-danger)";
        case "MEDIUM": return "var(--color-warning)";
        default: return "var(--color-text-secondary)";
    }
};

export default function AIReportsPanel({
    reportData,
    advisorData,
    advisorStatus,
    notes,
    saving,
    analyzing,
    advising,
    userRole,
    hasCampaignData,
    onAnalyze,
    onAdvise,
    onStatusUpdate,
    onNotesChange,
    onNotesSave,
}: AIReportsPanelProps) {
    return (
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
                            onClick={onAnalyze}
                            disabled={analyzing || !hasCampaignData}
                            className="btn btn-primary"
                            style={{ fontSize: "0.8rem", padding: "8px 16px" }}
                        >
                            {analyzing ? <RefreshCw size={14} className="animate-spin" /> : <FileText size={14} />}
                            {analyzing ? "Analyseren..." : "Analyseer Nu"}
                        </button>
                        {!hasCampaignData && (
                            <p style={{ fontSize: "0.7rem", marginTop: "8px", color: "#f87171" }}>
                                Synchroniseer eerst Google Ads data
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* Advisor Report */}
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
                                    onChange={(e) => onStatusUpdate(e.target.value)}
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
                                    onChange={(e) => onNotesChange(e.target.value)}
                                    onBlur={onNotesSave}
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
                            onClick={onAdvise}
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
    );
}
