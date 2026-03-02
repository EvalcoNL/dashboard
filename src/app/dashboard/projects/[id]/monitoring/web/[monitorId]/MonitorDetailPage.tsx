"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import MonitorDetail from "../MonitorDetail";
import { useNotification } from "@/components/NotificationProvider";

interface MonitorDetailPageProps {
    clientId: string;
    clientName: string;
    domain: any;
}

function MonitorDetailPageContent({ clientId, clientName, domain }: MonitorDetailPageProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { showToast, confirm } = useNotification();
    const requestedTab = searchParams.get("tab");

    const [activeTab, setActiveTab] = useState(requestedTab || "overview");
    const [isSyncing, setIsSyncing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [pages, setPages] = useState<any[]>(domain.monitoredPages || []);
    const [settings, setSettings] = useState(() => {
        const cfg = domain.config || {};
        return {
            uptimeInterval: cfg.uptimeInterval || 5,
            ssl: cfg.ssl !== false,
            uptime: cfg.uptime !== false,
            speed: cfg.speed !== false,
            httpMethod: cfg.httpMethod || "GET",
            requestTimeout: cfg.requestTimeout || 30,
            followRedirects: cfg.followRedirects !== false,
            notifyEmail: cfg.notifyEmail !== false,
            // New settings
            alertCondition: cfg.alertCondition || "url_unavailable",
            recoveryPeriod: cfg.recoveryPeriod || 3,
            confirmationPeriod: cfg.confirmationPeriod || 0,
            sslExpiration: cfg.sslExpiration || false,
            sslExpirationDays: cfg.sslExpirationDays || 30,
            domainExpiration: cfg.domainExpiration || false,
            notifySlack: cfg.notifySlack || false,
            keepCookies: cfg.keepCookies || false,
            requestBody: cfg.requestBody || "",
            requestHeaders: cfg.requestHeaders || [{ name: "", value: "" }],
        };
    });

    // Update tab if URL changes
    useEffect(() => {
        if (requestedTab && requestedTab !== activeTab) {
            setActiveTab(requestedTab);
        }
    }, [requestedTab, activeTab]);

    // ── Stats calculation ──
    const getDomainStats = () => {
        const checks = domain.uptimeChecks || [];
        const config = domain.config || {};
        let currentStatus = "Unknown", isUp = true, statusColor = "#9ca3af", lastCheckText = "Geen checks";
        let avgResponseTime = 0, minResponseTime = 0, maxResponseTime = 0;
        let chartData: any[] = [];

        if (checks.length > 0) {
            chartData = [...checks].reverse().map((c: any) => ({
                time: new Date(c.checkedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                responseMs: c.responseTime || 0,
            }));
            const responseTimes = checks.map((c: any) => c.responseTime).filter(Boolean);
            if (responseTimes.length > 0) {
                minResponseTime = Math.min(...responseTimes);
                maxResponseTime = Math.max(...responseTimes);
                avgResponseTime = Math.round(responseTimes.reduce((a: number, b: number) => a + b, 0) / responseTimes.length);
            }
        }

        if (!domain.active) {
            currentStatus = "Gepauzeerd";
            statusColor = "#9ca3af";
            isUp = true;
            lastCheckText = "Monitoring gepauzeerd";
        } else if (checks.length > 0) {
            currentStatus = checks[0].status === "UP" ? "Up" : "Down";
            isUp = checks[0].status === "UP";
            statusColor = isUp ? "#10b981" : "#ef4444";
            const diffMins = Math.floor((Date.now() - new Date(checks[0].checkedAt).getTime()) / 60000);
            lastCheckText = diffMins === 0 ? "Zojuist" : `${diffMins} min geleden`;

            if (isUp) {
                const monitoredPages = domain.monitoredPages || [];
                const hasPageErrors = monitoredPages.some((p: any) => p.lastStatus && p.lastStatus >= 400);
                if (hasPageErrors) {
                    currentStatus = "Waarschuwing";
                    statusColor = "#f59e0b";
                }
            }
        }
        return { currentStatus, isUp, statusColor, lastCheckText, avgResponseTime, minResponseTime, maxResponseTime, chartData, bars: [], uptimePercent7d: domain.uptime7d || "100.00", config };
    };

    const stats = getDomainStats();

    // ── Handlers ──
    const handleSync = async () => {
        if (isSyncing) return;
        setIsSyncing(true);
        try {
            const res = await fetch(`/api/data-sources/${domain.id}/refresh`);
            if (res.ok) router.refresh();
        } finally {
            setTimeout(() => setIsSyncing(false), 500);
        }
    };

    const handlePause = async () => {
        try {
            await fetch(`/api/data-sources/${domain.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ active: !domain.active }),
            });
            router.refresh();
        } catch (e) {
            console.error(e);
        }
    };

    const handleSaveSettings = async () => {
        setIsSaving(true);
        try {
            await fetch(`/api/data-sources/${domain.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ config: settings }),
            });
            router.refresh();
        } finally {
            setTimeout(() => setIsSaving(false), 500);
        }
    };

    const handleDeleteMonitor = async () => {
        const confirmed = await confirm({
            title: "Monitor verwijderen",
            message: `Weet je zeker dat je "${domain.name}" wilt verwijderen? Alle historie zal verloren gaan.`,
            confirmLabel: "Ja, verwijderen",
            cancelLabel: "Annuleren",
            type: "danger"
        });

        if (!confirmed) return;

        try {
            await fetch(`/api/data-sources/${domain.id}`, { method: "DELETE" });
            showToast("success", "Monitor succesvol verwijderd");
            router.push(`/dashboard/projects/${clientId}/monitoring/web`);
        } catch (e) {
            console.error(e);
            showToast("error", "Fout bij verwijderen van monitor");
        }
    };

    const updateSetting = (key: string, val: any) => {
        setSettings(prev => ({ ...prev, [key]: val }));
    };

    return (
        <div style={{ padding: "32px", maxWidth: "1200px", margin: "0 auto" }}>
            {/* ── Back link ─── */}
            <button
                onClick={() => router.push(`/dashboard/projects/${clientId}/monitoring/web`)}
                style={{
                    display: "flex", alignItems: "center", gap: "6px",
                    background: "none", border: "none", color: "var(--color-text-muted)",
                    fontSize: "0.85rem", cursor: "pointer", padding: "0", marginBottom: "24px",
                    transition: "color 0.15s",
                }}
                className="back-link"
            >
                <ArrowLeft size={16} /> Terug naar overzicht
            </button>

            {/* ── Title ─── */}
            <div style={{ marginBottom: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
                    <div style={{
                        width: "12px", height: "12px", borderRadius: "50%",
                        background: stats.statusColor,
                        boxShadow: !stats.isUp ? `0 0 8px ${stats.statusColor}` : "none",
                    }} />
                    <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "var(--color-text-primary)", margin: 0 }}>
                        {domain.name}
                    </h1>
                    <span style={{
                        background: "rgba(99,102,241,0.1)", color: "var(--color-brand)",
                        padding: "2px 8px", borderRadius: "4px", fontWeight: 600,
                        fontSize: "0.7rem", textTransform: "uppercase",
                    }}>HTTP</span>
                </div>
                <p style={{ color: "var(--color-text-secondary)", fontSize: "0.9rem", margin: 0 }}>
                    {domain.externalId} · {clientName}
                </p>
            </div>

            {/* ── Tabs + Content ─── */}
            <MonitorDetail
                domain={domain}
                stats={stats}
                tab={activeTab}
                setTab={setActiveTab}
                settings={settings}
                updateSetting={updateSetting}
                isSaving={isSaving}
                isSyncing={isSyncing}
                pages={pages}
                onSync={handleSync}
                onPause={handlePause}
                onSaveSettings={handleSaveSettings}
                onDeleteMonitor={handleDeleteMonitor}
                onAddPage={async (url, label) => {
                    const res = await fetch(`/api/data-sources/${domain.id}/monitored-pages`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ url, label: label || undefined }),
                    });
                    if (res.ok) {
                        const data = await res.json();
                        setPages(prev => [...prev, data.page]);
                        return data.page;
                    }
                    return null;
                }}
                onDeletePage={async (pageId) => {
                    await fetch(`/api/data-sources/${domain.id}/monitored-pages`, {
                        method: "DELETE",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ pageId }),
                    });
                    setPages(prev => prev.filter(p => p.id !== pageId));
                }}
            />

            <style jsx>{`
                .back-link:hover { color: var(--color-text-primary) !important; }
            `}</style>
        </div>
    );
}

export default function MonitorDetailPage(props: MonitorDetailPageProps) {
    return (
        <Suspense fallback={<div style={{ padding: "32px", color: "var(--color-text-muted)" }}>Laden...</div>}>
            <MonitorDetailPageContent {...props} />
        </Suspense>
    );
}
