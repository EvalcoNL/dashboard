"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Download } from "lucide-react";
import AIReportsPanel from "@/components/project/AIReportsPanel";
import { useNotification } from "@/components/NotificationProvider";

export default function ReportClient({
    project,
    userRole,
}: {
    project: any;
    userRole: string;
}) {
    const router = useRouter();
    const { showToast } = useNotification();

    const analystReport = project.analystReports?.[0];
    const reportData = analystReport?.reportJson;
    const advisorData = analystReport?.advisorReport?.adviceJson;

    const [advisorStatus, setAdvisorStatus] = useState(
        analystReport?.advisorReport?.status || "DRAFT"
    );
    const [notes, setNotes] = useState(
        analystReport?.advisorReport?.notes || ""
    );
    const [saving, setSaving] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [advising, setAdvising] = useState(false);

    // Handlers
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
        } catch (error: any) {
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
        } catch (error: any) {
            console.error("Failed to save notes:", error);
        }
        setSaving(false);
    };

    const handleAnalyze = async () => {
        setAnalyzing(true);
        try {
            const response = await fetch(`/api/projects/${project.id}/analyze`, { method: "POST" });
            if (response.ok) {
                router.refresh();
            } else {
                const data = await response.json();
                showToast("error", data.error || "Analyse mislukt");
            }
        } catch (error: any) {
            console.error("Failed to analyze:", error);
        }
        setAnalyzing(false);
    };

    const handleAdvise = async () => {
        setAdvising(true);
        try {
            const analystReportId = analystReport?.id;
            if (!analystReportId) return;
            const response = await fetch(`/api/analyst-reports/${analystReportId}/advise`, { method: "POST" });
            if (response.ok) {
                router.refresh();
            } else {
                const data = await response.json();
                showToast("error", data.error || "Advies generatie mislukt");
            }
        } catch (error: any) {
            console.error("Failed to generate advice:", error);
        }
        setAdvising(false);
    };

    return (
        <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
                <div>
                    <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "8px" }}>
                        Reports
                    </h1>
                    <p style={{ color: "var(--color-text-secondary)" }}>
                        Performance reports for {project.name}
                    </p>
                </div>
                <button
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "10px 20px",
                        background: "var(--color-brand)",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        fontWeight: 600,
                        cursor: "pointer"
                    }}
                >
                    <Download size={20} />
                    Report Genereren
                </button>
            </div>

            <AIReportsPanel
                reportData={reportData}
                advisorData={advisorData}
                advisorStatus={advisorStatus}
                notes={notes}
                saving={saving}
                analyzing={analyzing}
                advising={advising}
                userRole={userRole}
                hasCampaignData={project.campaignMetrics?.length > 0}
                onAnalyze={handleAnalyze}
                onAdvise={handleAdvise}
                onStatusUpdate={handleStatusUpdate}
                onNotesChange={setNotes}
                onNotesSave={handleSaveNotes}
            />
        </div>
    );
}
