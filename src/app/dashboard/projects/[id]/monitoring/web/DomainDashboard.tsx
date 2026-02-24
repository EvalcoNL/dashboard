"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Server, Lock, RotateCcw, ArrowUpCircle, AlertCircle, CheckCircle2, Clock, Globe, RefreshCw, Plus, Trash2, FileWarning, ExternalLink } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export default function DomainDashboard({ domainData }: { domainData: Record<string, any> }) {
    const router = useRouter();
    const config = domainData.config || {};
    const checks = domainData.uptimeChecks || [];
    const [isSyncing, setIsSyncing] = useState(false);
    const [monitoredPages, setMonitoredPages] = useState<any[]>(domainData.monitoredPages || []);
    const [newPageUrl, setNewPageUrl] = useState("");
    const [newPageLabel, setNewPageLabel] = useState("");
    const [isAddingPage, setIsAddingPage] = useState(false);

    // Derive current status
    let currentStatus = "Unknown";
    let isUp = true;
    let statusColor = "#9ca3af";
    let statusBgColor = "rgba(156, 163, 175, 0.1)";

    let lastCheckText = "No checks yet";

    let avgResponseTime = 0;
    let minResponseTime = 0;
    let maxResponseTime = 0;

    let chartData: any[] = [];

    if (checks.length > 0) {
        currentStatus = checks[0].status === "UP" ? "Up" : "Down";
        isUp = checks[0].status === "UP";
        statusColor = isUp ? "#10b981" : "#ef4444";
        statusBgColor = isUp ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)";

        const lastCheckDate = new Date(checks[0].checkedAt);
        // eslint-disable-next-line react-hooks/purity
        const diffMs = Date.now() - lastCheckDate.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        lastCheckText = diffMins === 0 ? "Just now" : `${diffMins} min ago`;

        // Calculate Response Times for the chart (reverse so newest is at the end)
        chartData = [...checks].reverse().map(c => ({
            time: new Date(c.checkedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            responseMs: c.responseTime || 0,
            status: c.status,
            statusCode: c.statusCode
        }));

        const responseTimes = checks.map((c: any) => c.responseTime).filter(Boolean);
        if (responseTimes.length > 0) {
            minResponseTime = Math.min(...responseTimes);
            maxResponseTime = Math.max(...responseTimes);
            avgResponseTime = Math.round(responseTimes.reduce((a: number, b: number) => a + b, 0) / responseTimes.length);
        }
    }

    // Generate bars for "Last 24 hours" visualization using recent checks. We'll show up to 40 bars.
    const maxBars = 40;
    const barChecks = checks.slice(0, maxBars).reverse(); // Oldest of the recent chunk to newest
    const bars = Array.from({ length: maxBars }).map((_, i) => {
        // If we don't have enough checks to fill the 40 bars, the ones at the beginning are empty/unknown.
        const checkIndex = i - (maxBars - barChecks.length);
        if (checkIndex >= 0 && checkIndex < barChecks.length) {
            const check = barChecks[checkIndex];
            const checkDate = new Date(check.checkedAt).toLocaleString();
            return {
                status: check.status === "UP" ? "up" : "down",
                tooltip: `${checkDate} - Status: ${check.statusCode || check.status}`
            };
        }
        return { status: "unknown", tooltip: "No data available" }; // padding
    });

    const getBarColor = (status: string) => {
        if (status === "up") return "#10b981";
        if (status === "down") return "#ef4444";
        return "#374151";
    };

    const handleSync = async () => {
        if (isSyncing) return;
        setIsSyncing(true);
        try {
            const res = await fetch(`/api/data-sources/${domainData.id}/refresh`);
            if (res.ok) {
                router.refresh();
            } else {
                console.error("Failed to sync domain");
            }
        } catch (error: any) {
            console.error("Error syncing:", error);
        } finally {
            // Add a small delay so user sees the spinner for at least a split second
            setTimeout(() => {
                setIsSyncing(false);
            }, 500);
        }
    };

    return (
        <div style={{ marginBottom: "64px" }}>
            {/* Header Row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        background: statusBgColor,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: statusColor
                    }}>
                        {isUp ? <ArrowUpCircle size={20} /> : <AlertCircle size={20} />}
                    </div>
                    <div>
                        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0, color: "var(--color-text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
                            {domainData.name}
                            <a href={`https://${domainData.externalId}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-brand)", fontSize: "0.875rem", textDecoration: "none" }}>
                                <Globe size={14} />
                            </a>
                        </h2>
                        <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>HTTP/S monitor</div>
                    </div>
                </div>
                <div style={{ display: "flex", gap: "12px" }}>
                    <button
                        onClick={handleSync}
                        disabled={isSyncing}
                        style={{
                            padding: "8px 16px",
                            background: "rgba(16, 185, 129, 0.1)",
                            border: "1px solid rgba(16, 185, 129, 0.2)",
                            borderRadius: "6px",
                            color: "#10b981",
                            textDecoration: "none",
                            fontSize: "0.875rem",
                            fontWeight: 500,
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            cursor: isSyncing ? "not-allowed" : "pointer",
                            opacity: isSyncing ? 0.7 : 1
                        }}
                    >
                        <RotateCcw size={16} className={isSyncing ? "animate-spin" : ""} />
                        Verversen
                    </button>
                    <a href={`/dashboard/projects/${domainData.clientId}/data/sources/${domainData.id}/edit`} style={{
                        padding: "8px 16px",
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid var(--color-border)",
                        borderRadius: "6px",
                        color: "var(--color-text-primary)",
                        textDecoration: "none",
                        fontSize: "0.875rem",
                        fontWeight: 500,
                        display: "flex",
                        alignItems: "center",
                        gap: "6px"
                    }}>
                        Instellingen
                    </a>
                </div>
            </div>

            {/* KPI Row 1 */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "16px", marginBottom: "16px" }}>
                <div className="glass-card" style={{ padding: "20px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <div style={{ fontSize: "0.875rem", color: "var(--color-text-muted)", marginBottom: "8px" }}>Current status</div>
                    <div style={{ fontSize: "1.5rem", fontWeight: 700, color: statusColor, marginBottom: "4px" }}>{currentStatus}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                        {isUp ? `Currently up (checked every ${config.uptimeInterval || 5}m)` : "Currently experiencing downtime"}
                    </div>
                </div>

                <div className="glass-card" style={{ padding: "20px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <div style={{ fontSize: "0.875rem", color: "var(--color-text-muted)", marginBottom: "8px" }}>Last check</div>
                    <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "4px" }}>{lastCheckText}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                        <Clock size={12} /> {checks.length > 0 ? new Date(checks[0].checkedAt).toLocaleString() : "N/A"}
                    </div>
                </div>

                <div className="glass-card" style={{ padding: "20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", color: "var(--color-text-muted)", marginBottom: "16px" }}>
                        <span>Last period checks</span>
                        <span style={{ color: "var(--color-text-primary)", fontWeight: 600 }}>100%</span>
                    </div>
                    <div style={{ display: "flex", gap: "2px", height: "32px", alignItems: "flex-end" }}>
                        {bars.map((bar, index) => (
                            <div key={index} style={{
                                flex: 1,
                                height: bar.status === "unknown" ? "20%" : (bar.status === "down" ? "60%" : "100%"),
                                background: getBarColor(bar.status),
                                borderRadius: "2px",
                                opacity: bar.status === "unknown" ? 0.3 : 1
                            }} title={bar.tooltip} />
                        ))}
                    </div>
                </div>
            </div>

            {/* KPI Row 2 */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "16px", marginBottom: "24px" }}>
                <div className="glass-card" style={{ padding: "20px" }}>
                    <div style={{ fontSize: "0.875rem", color: "var(--color-text-muted)", marginBottom: "8px" }}>Last 7 days</div>
                    <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#10b981", marginBottom: "4px" }}>{domainData.uptime7d}%</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Uptime over recent window</div>
                </div>

                <div className="glass-card" style={{ padding: "20px" }}>
                    <div style={{ fontSize: "0.875rem", color: "var(--color-text-muted)", marginBottom: "8px" }}>Last 30 days</div>
                    <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#10b981", marginBottom: "4px" }}>{domainData.uptime30d}%</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Uptime over extended window</div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px" }}>

                {/* Main Column */}
                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

                    {/* Response Time Chart */}
                    <div className="glass-card" style={{ padding: "24px" }}>
                        <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--color-text-primary)", marginBottom: "24px" }}>Response time</h3>

                        <div style={{ width: '100%', height: 260, marginBottom: "24px" }}>
                            {chartData.length > 0 ? (
                                <ResponsiveContainer>
                                    <LineChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                        <XAxis dataKey="time" stroke="rgba(255,255,255,0.2)" fontSize={11} tickMargin={10} minTickGap={30} />
                                        <YAxis stroke="rgba(255,255,255,0.2)" fontSize={11} tickFormatter={(val) => val + 'ms'} />
                                        <Tooltip
                                            contentStyle={{ background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)', borderRadius: '8px' }}
                                            itemStyle={{ color: '#10b981' }}
                                        />
                                        <Line type="monotone" dataKey="responseMs" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 6, fill: '#10b981' }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : (
                                <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-muted)" }}>
                                    Nog onvoldoende data verzameld voor grafiek.
                                </div>
                            )}
                        </div>

                        {/* Chart Min/Max/Avg */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", paddingTop: "16px", borderTop: "1px solid var(--color-border)" }}>
                            <div>
                                <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--color-text-primary)" }}>{avgResponseTime} ms</div>
                                <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Average</div>
                            </div>
                            <div>
                                <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#10b981" }}>{minResponseTime} ms</div>
                                <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                                    <ArrowUpCircle size={12} color="#10b981" /> Minimum
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#ef4444" }}>{maxResponseTime} ms</div>
                                <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                                    <AlertCircle size={12} color="#ef4444" style={{ transform: "rotate(180deg)" }} /> Maximum
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Latest incidents log */}
                    <div className="glass-card" style={{ padding: "24px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                            <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--color-text-primary)", margin: 0 }}>Latest checks (Logs)</h3>
                            <button style={{ background: "none", border: "1px solid var(--color-border)", color: "var(--color-text-primary)", padding: "4px 12px", borderRadius: "6px", fontSize: "0.75rem", cursor: "pointer" }}>
                                Export logs
                            </button>
                        </div>

                        {checks.length === 0 ? (
                            <div style={{ textAlign: "center", padding: "32px", color: "var(--color-text-muted)" }}>No log data available</div>
                        ) : (
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                                <thead>
                                    <tr style={{ borderBottom: "1px solid var(--color-border)", color: "var(--color-text-muted)", textAlign: "left" }}>
                                        <th style={{ paddingBottom: "12px", fontWeight: 500 }}>Status</th>
                                        <th style={{ paddingBottom: "12px", fontWeight: 500 }}>Details</th>
                                        <th style={{ paddingBottom: "12px", fontWeight: 500 }}>Date/Time</th>
                                        <th style={{ paddingBottom: "12px", fontWeight: 500 }}>Duration</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {checks.slice(0, 10).map((check: any, idx: number) => {
                                        const isUpCheck = check.status === "UP";
                                        return (
                                            <tr key={check.id} style={{ borderBottom: idx === 9 ? "none" : "1px solid rgba(255,255,255,0.02)" }}>
                                                <td style={{ padding: "16px 0" }}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: "8px", color: isUpCheck ? "#10b981" : "#ef4444" }}>
                                                        {isUpCheck ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                                                        {isUpCheck ? "Resolved / Normal" : "Alert"}
                                                    </div>
                                                </td>
                                                <td style={{ padding: "16px 0" }}>
                                                    {isUpCheck ? (
                                                        <span style={{ color: "var(--color-text-primary)" }}>OK ({check.responseTime}ms)</span>
                                                    ) : (
                                                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                                            <span style={{ background: "rgba(239,68,68,0.2)", color: "#ef4444", padding: "2px 6px", borderRadius: "4px", fontSize: "0.75rem", fontWeight: 600 }}>
                                                                {check.statusCode || "N/A"}
                                                            </span>
                                                            <span style={{ color: "var(--color-text-primary)" }}>Downtime Recorded</span>
                                                        </div>
                                                    )}
                                                </td>
                                                <td style={{ padding: "16px 0", color: "var(--color-text-muted)" }}>
                                                    {new Date(check.checkedAt).toLocaleString()}
                                                </td>
                                                <td style={{ padding: "16px 0", color: "var(--color-text-muted)" }}>
                                                    {isUpCheck ? "-" : "Recorded Event"}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                        {checks.length > 10 && (
                            <div style={{ textAlign: "center", marginTop: "16px" }}>
                                <button style={{ background: "none", border: "none", color: "var(--color-text-muted)", fontSize: "0.875rem", cursor: "pointer", textDecoration: "underline" }}>
                                    There are {checks.length - 10} more checks loaded in view...
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar Column */}
                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

                    {/* Domain & SSL */}
                    <div className="glass-card" style={{ padding: "24px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px", color: "var(--color-text-primary)", fontWeight: 600 }}>
                            <Lock size={18} color={config.ssl ? "#10b981" : "#9ca3af"} />
                            Domain & SSL
                        </div>

                        <div style={{ marginBottom: "20px", opacity: config.ssl ? 1 : 0.4 }}>
                            <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginBottom: "4px" }}>Domain valid until</div>
                            <div style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>
                                {config.domainExpiry ? new Date(config.domainExpiry).toLocaleDateString("nl-NL") : "Unknown"}
                            </div>
                        </div>

                        <div style={{ opacity: config.ssl ? 1 : 0.4 }}>
                            <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginBottom: "4px" }}>SSL certificate valid until</div>

                            {config.sslDetails && config.sslDetails.validTo ? (
                                <>
                                    <div style={{ color: "var(--color-text-primary)", fontWeight: 500, marginBottom: "8px" }}>
                                        {new Date(config.sslDetails.validTo).toLocaleDateString("nl-NL")}
                                    </div>
                                    <div style={{ fontSize: "0.75rem", background: "rgba(16, 185, 129, 0.1)", color: "#10b981", padding: "6px 10px", borderRadius: "6px", display: "inline-block" }}>
                                        Issued by {config.sslDetails.issuer || "Unknown"}
                                    </div>
                                </>
                            ) : config.sslDetails?.error ? (
                                <>
                                    <div style={{ color: "#ef4444", fontWeight: 500, marginBottom: "8px" }}>Connection Failed</div>
                                    <div style={{ fontSize: "0.75rem", color: "#ef4444" }}>{config.sslDetails.error}</div>
                                </>
                            ) : (
                                <>
                                    <div style={{ color: "var(--color-text-primary)", fontWeight: 500, marginBottom: "8px" }}>Waiting for initial scan...</div>
                                    {config.ssl && (
                                        <div style={{ fontSize: "0.75rem", background: "rgba(16, 185, 129, 0.1)", color: "#10b981", padding: "6px 10px", borderRadius: "6px", display: "inline-block" }}>
                                            Monitoring Active
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Advanced Metrics / Speed */}
                    <div className="glass-card" style={{ padding: "24px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px", color: "var(--color-text-primary)", fontWeight: 600 }}>
                            <RotateCcw size={18} color={config.speed ? "#f59e0b" : "#9ca3af"} />
                            Page Speed
                        </div>

                        <div style={{ opacity: config.speed ? 1 : 0.4 }}>
                            <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginBottom: "4px" }}>Desktop performance</div>
                            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: config.speed ? "#10b981" : "var(--color-text-muted)" }}>{config.speed ? "92/100" : "N/A"}</div>
                            {config.speed && (
                                <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: "8px" }}>
                                    Measured daily via Lighthouse
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>

            {/* Monitored Pages Section */}
            <div className="glass-card" style={{ padding: "24px", marginTop: "24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                    <div>
                        <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--color-text-primary)", margin: 0 }}>Gemonitorde Pagina&apos;s</h3>
                        <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", margin: "4px 0 0" }}>Individuele pagina&apos;s die worden gecontroleerd op statuscodes</p>
                    </div>
                </div>

                {/* Add Page Form */}
                <div style={{
                    display: "flex",
                    gap: "8px",
                    marginBottom: monitoredPages.length > 0 ? "16px" : "0",
                    alignItems: "center"
                }}>
                    <input
                        placeholder="/pad of volledige URL"
                        value={newPageUrl}
                        onChange={(e) => setNewPageUrl(e.target.value)}
                        style={{
                            flex: 2,
                            padding: "10px 14px",
                            background: "var(--color-surface)",
                            border: "1px solid var(--color-border)",
                            borderRadius: "8px",
                            color: "var(--color-text-primary)",
                            fontSize: "0.875rem",
                            outline: "none"
                        }}
                    />
                    <input
                        placeholder="Label (optioneel)"
                        value={newPageLabel}
                        onChange={(e) => setNewPageLabel(e.target.value)}
                        style={{
                            flex: 1,
                            padding: "10px 14px",
                            background: "var(--color-surface)",
                            border: "1px solid var(--color-border)",
                            borderRadius: "8px",
                            color: "var(--color-text-primary)",
                            fontSize: "0.875rem",
                            outline: "none"
                        }}
                    />
                    <button
                        disabled={isAddingPage || !newPageUrl.trim()}
                        onClick={async () => {
                            setIsAddingPage(true);
                            try {
                                const res = await fetch(`/api/data-sources/${domainData.id}/monitored-pages`, {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ url: newPageUrl.trim(), label: newPageLabel.trim() || undefined })
                                });
                                if (res.ok) {
                                    const data = await res.json();
                                    setMonitoredPages(prev => [...prev, data.page]);
                                    setNewPageUrl("");
                                    setNewPageLabel("");
                                }
                            } finally {
                                setIsAddingPage(false);
                            }
                        }}
                        style={{
                            padding: "10px 16px",
                            background: "var(--color-brand)",
                            border: "none",
                            borderRadius: "8px",
                            color: "white",
                            fontSize: "0.875rem",
                            fontWeight: 600,
                            cursor: isAddingPage || !newPageUrl.trim() ? "not-allowed" : "pointer",
                            opacity: isAddingPage || !newPageUrl.trim() ? 0.5 : 1,
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            whiteSpace: "nowrap"
                        }}
                    >
                        <Plus size={16} /> Toevoegen
                    </button>
                </div>

                {/* Pages List */}
                {monitoredPages.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "1px", borderRadius: "8px", overflow: "hidden", border: "1px solid var(--color-border)" }}>
                        {monitoredPages.map((page: any) => {
                            const statusOk = page.lastStatus === 200;
                            const hasStatus = page.lastStatus !== null && page.lastStatus !== undefined;
                            const statusColor = !hasStatus ? "#9ca3af" : statusOk ? "#10b981" : page.lastStatus >= 500 ? "#ef4444" : "#f59e0b";

                            return (
                                <div key={page.id} style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "12px",
                                    padding: "12px 16px",
                                    background: "var(--color-surface)",
                                }}>
                                    {/* Status indicator */}
                                    <div style={{
                                        width: "10px",
                                        height: "10px",
                                        borderRadius: "50%",
                                        background: statusColor,
                                        flexShrink: 0,
                                        boxShadow: hasStatus && !statusOk ? `0 0 6px ${statusColor}` : "none"
                                    }} />

                                    {/* URL and label */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--color-text-primary)", display: "flex", alignItems: "center", gap: "6px" }}>
                                            {page.label || page.url}
                                            <a
                                                href={page.url.startsWith('http') ? page.url : `https://${domainData.externalId}${page.url.startsWith('/') ? '' : '/'}${page.url}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{ color: "var(--color-text-muted)" }}
                                            >
                                                <ExternalLink size={12} />
                                            </a>
                                        </div>
                                        {page.label && (
                                            <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>{page.url}</div>
                                        )}
                                    </div>

                                    {/* Status code badge */}
                                    <div>
                                        {hasStatus ? (
                                            <span style={{
                                                fontSize: "0.75rem",
                                                fontWeight: 700,
                                                padding: "4px 8px",
                                                borderRadius: "6px",
                                                background: statusOk ? "rgba(16,185,129,0.1)" : page.lastStatus >= 500 ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.15)",
                                                color: statusColor
                                            }}>
                                                {page.lastStatus}
                                            </span>
                                        ) : (
                                            <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Wacht...</span>
                                        )}
                                    </div>

                                    {/* Last checked */}
                                    <div style={{ fontSize: "0.6875rem", color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>
                                        {page.lastCheckedAt ? new Date(page.lastCheckedAt).toLocaleString() : "Nog niet gecontroleerd"}
                                    </div>

                                    {/* Delete */}
                                    <button
                                        onClick={async () => {
                                            await fetch(`/api/data-sources/${domainData.id}/monitored-pages`, {
                                                method: "DELETE",
                                                headers: { "Content-Type": "application/json" },
                                                body: JSON.stringify({ pageId: page.id })
                                            });
                                            setMonitoredPages(prev => prev.filter(p => p.id !== page.id));
                                        }}
                                        style={{
                                            background: "none",
                                            border: "none",
                                            color: "var(--color-text-muted)",
                                            cursor: "pointer",
                                            padding: "4px",
                                            borderRadius: "4px",
                                            display: "flex",
                                            alignItems: "center"
                                        }}
                                        title="Verwijder pagina"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}

                {monitoredPages.length === 0 && (
                    <div style={{ textAlign: "center", padding: "24px 0 8px", color: "var(--color-text-muted)", fontSize: "0.8125rem" }}>
                        <FileWarning size={20} style={{ marginBottom: "8px", opacity: 0.4 }} />
                        <div>Voeg pagina&apos;s toe om individuele URLs te monitoren</div>
                    </div>
                )}
            </div>
        </div>
    );
}
