"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Search,
    Download,
    ChevronLeft,
    ChevronRight,
    Filter,
    Calendar,
    User,
    Shield,
    LogIn,
    LogOut,
    Key,
    UserPlus,
    Settings,
    Trash2,
    Database,
    FileText,
    AlertTriangle,
    RefreshCw,
} from "lucide-react";

interface AuditLogEntry {
    id: string;
    userId: string | null;
    userName: string;
    userEmail: string | null;
    action: string;
    target: string | null;
    details: string | null;
    ip: string | null;
    userAgent: string | null;
    createdAt: string;
}

const ACTION_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
    LOGIN: { label: "Ingelogd", icon: LogIn, color: "#22c55e" },
    LOGIN_FAILED: { label: "Login mislukt", icon: AlertTriangle, color: "#ef4444" },
    LOGOUT: { label: "Uitgelogd", icon: LogOut, color: "#6b7280" },
    "2FA_ENABLED": { label: "2FA ingeschakeld", icon: Shield, color: "#22c55e" },
    "2FA_DISABLED": { label: "2FA uitgeschakeld", icon: Shield, color: "#f59e0b" },
    BACKUP_CODE_USED: { label: "Backup code gebruikt", icon: Key, color: "#f59e0b" },
    PASSWORD_CHANGED: { label: "Wachtwoord gewijzigd", icon: Key, color: "#6366f1" },
    PASSWORD_RESET_REQUESTED: { label: "Wachtwoord reset aangevraagd", icon: Key, color: "#f59e0b" },
    PASSWORD_RESET_COMPLETED: { label: "Wachtwoord reset voltooid", icon: Key, color: "#22c55e" },
    PROFILE_UPDATED: { label: "Profiel bijgewerkt", icon: User, color: "#6366f1" },
    EMAIL_CHANGE_REQUESTED: { label: "Email wijziging aangevraagd", icon: Settings, color: "#f59e0b" },
    EMAIL_VERIFIED: { label: "Email geverifieerd", icon: Shield, color: "#22c55e" },
    USER_CREATED: { label: "Gebruiker aangemaakt", icon: UserPlus, color: "#22c55e" },
    USER_UPDATED: { label: "Gebruiker bijgewerkt", icon: User, color: "#6366f1" },
    USER_DELETED: { label: "Gebruiker verwijderd", icon: Trash2, color: "#ef4444" },
    USER_INVITED: { label: "Gebruiker uitgenodigd", icon: UserPlus, color: "#6366f1" },
    USER_ROLE_CHANGED: { label: "Rol gewijzigd", icon: Shield, color: "#f59e0b" },
    PROJECT_CREATED: { label: "Project aangemaakt", icon: Database, color: "#22c55e" },
    PROJECT_UPDATED: { label: "Project bijgewerkt", icon: Database, color: "#6366f1" },
    PROJECT_DELETED: { label: "Project verwijderd", icon: Trash2, color: "#ef4444" },
    DATA_SOURCE_CREATED: { label: "Data bron gekoppeld", icon: Database, color: "#22c55e" },
    DATA_SOURCE_DELETED: { label: "Data bron verwijderd", icon: Trash2, color: "#ef4444" },
    REPORT_GENERATED: { label: "Rapport gegenereerd", icon: FileText, color: "#6366f1" },
    EXPORT_CSV: { label: "CSV export", icon: Download, color: "#6366f1" },
    SETTINGS_CHANGED: { label: "Instellingen gewijzigd", icon: Settings, color: "#6366f1" },
    ADMIN_ACTION: { label: "Admin actie", icon: Shield, color: "#f59e0b" },
};

function timeAgo(dateStr: string): string {
    const now = new Date();
    const d = new Date(dateStr);
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diff < 60) return "Zojuist";
    if (diff < 3600) return `${Math.floor(diff / 60)}m geleden`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}u geleden`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d geleden`;
    return d.toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
}

export default function AuditLogTable() {
    const [logs, setLogs] = useState<AuditLogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [perPage, setPerPage] = useState(25);
    const [search, setSearch] = useState("");
    const [actionFilter, setActionFilter] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [availableActions, setAvailableActions] = useState<string[]>([]);
    const [showFilters, setShowFilters] = useState(false);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.set("page", String(page));
            params.set("perPage", String(perPage));
            if (search) params.set("search", search);
            if (actionFilter) params.set("action", actionFilter);
            if (dateFrom) params.set("dateFrom", dateFrom);
            if (dateTo) params.set("dateTo", dateTo);

            const res = await fetch(`/api/admin/audit-logs?${params}`);
            const data = await res.json();
            if (data.success) {
                setLogs(data.logs);
                setTotalPages(data.totalPages);
                setTotal(data.total);
                setAvailableActions(data.availableActions || []);
            }
        } catch (err) {
            console.error("Failed to fetch audit logs:", err);
        }
        setLoading(false);
    }, [page, perPage, search, actionFilter, dateFrom, dateTo]);

    useEffect(() => { fetchLogs(); }, [fetchLogs]);

    const handleExport = () => {
        const params = new URLSearchParams();
        if (actionFilter) params.set("action", actionFilter);
        if (dateFrom) params.set("dateFrom", dateFrom);
        if (dateTo) params.set("dateTo", dateTo);
        window.open(`/api/admin/audit-logs/export?${params}`, "_blank");
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        fetchLogs();
    };

    return (
        <div>
            {/* Toolbar */}
            <div style={{
                display: "flex",
                gap: "12px",
                marginBottom: "20px",
                flexWrap: "wrap",
                alignItems: "center",
            }}>
                {/* Search */}
                <form onSubmit={handleSearchSubmit} style={{ flex: 1, minWidth: "250px", position: "relative" }}>
                    <Search
                        size={16}
                        style={{
                            position: "absolute",
                            left: "12px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            color: "var(--color-text-muted)",
                        }}
                    />
                    <input
                        type="text"
                        placeholder="Zoek op actie, doel, details, of IP..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{
                            width: "100%",
                            padding: "10px 12px 10px 36px",
                            background: "var(--color-bg-secondary)",
                            border: "1px solid var(--color-border)",
                            borderRadius: "10px",
                            color: "var(--color-text-primary)",
                            fontSize: "0.875rem",
                        }}
                    />
                </form>

                {/* Filter toggle */}
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "10px 16px",
                        background: showFilters ? "rgba(99, 102, 241, 0.1)" : "var(--color-bg-secondary)",
                        border: `1px solid ${showFilters ? "#6366f1" : "var(--color-border)"}`,
                        borderRadius: "10px",
                        color: showFilters ? "#6366f1" : "var(--color-text-primary)",
                        fontSize: "0.875rem",
                        fontWeight: 500,
                        cursor: "pointer",
                    }}
                >
                    <Filter size={16} />
                    Filters
                </button>

                {/* Refresh */}
                <button
                    onClick={fetchLogs}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "10px 16px",
                        background: "var(--color-bg-secondary)",
                        border: "1px solid var(--color-border)",
                        borderRadius: "10px",
                        color: "var(--color-text-primary)",
                        fontSize: "0.875rem",
                        fontWeight: 500,
                        cursor: "pointer",
                    }}
                >
                    <RefreshCw size={16} />
                </button>

                {/* Export */}
                <button
                    onClick={handleExport}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "10px 16px",
                        background: "var(--color-brand)",
                        border: "none",
                        borderRadius: "10px",
                        color: "white",
                        fontSize: "0.875rem",
                        fontWeight: 600,
                        cursor: "pointer",
                    }}
                >
                    <Download size={16} />
                    Export CSV
                </button>
            </div>

            {/* Filter panel */}
            {showFilters && (
                <div style={{
                    display: "flex",
                    gap: "16px",
                    marginBottom: "20px",
                    padding: "16px",
                    background: "var(--color-bg-secondary)",
                    borderRadius: "12px",
                    border: "1px solid var(--color-border)",
                    flexWrap: "wrap",
                }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-muted)" }}>Actie</label>
                        <select
                            value={actionFilter}
                            onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
                            style={{
                                padding: "8px 12px",
                                background: "var(--color-bg-primary)",
                                border: "1px solid var(--color-border)",
                                borderRadius: "8px",
                                color: "var(--color-text-primary)",
                                fontSize: "0.875rem",
                                minWidth: "200px",
                            }}
                        >
                            <option value="">Alle acties</option>
                            {availableActions.map(a => (
                                <option key={a} value={a}>
                                    {ACTION_CONFIG[a]?.label || a}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-muted)" }}>
                            <Calendar size={12} style={{ display: "inline", marginRight: "4px" }} />
                            Van
                        </label>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                            style={{
                                padding: "8px 12px",
                                background: "var(--color-bg-primary)",
                                border: "1px solid var(--color-border)",
                                borderRadius: "8px",
                                color: "var(--color-text-primary)",
                                fontSize: "0.875rem",
                            }}
                        />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-muted)" }}>Tot</label>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                            style={{
                                padding: "8px 12px",
                                background: "var(--color-bg-primary)",
                                border: "1px solid var(--color-border)",
                                borderRadius: "8px",
                                color: "var(--color-text-primary)",
                                fontSize: "0.875rem",
                            }}
                        />
                    </div>
                    {(actionFilter || dateFrom || dateTo) && (
                        <button
                            onClick={() => { setActionFilter(""); setDateFrom(""); setDateTo(""); setPage(1); }}
                            style={{
                                alignSelf: "flex-end",
                                padding: "8px 16px",
                                background: "transparent",
                                border: "1px solid var(--color-border)",
                                borderRadius: "8px",
                                color: "var(--color-text-muted)",
                                fontSize: "0.75rem",
                                cursor: "pointer",
                            }}
                        >
                            Filters wissen
                        </button>
                    )}
                </div>
            )}

            {/* Results count */}
            <div style={{ marginBottom: "12px", fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                {total} resultaten gevonden
            </div>

            {/* Table */}
            <div style={{
                background: "var(--color-bg-secondary)",
                borderRadius: "12px",
                border: "1px solid var(--color-border)",
                overflow: "hidden",
            }}>
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                                {["Wanneer", "Gebruiker", "Actie", "Doel", "Details", "IP"].map(h => (
                                    <th key={h} style={{
                                        padding: "14px 16px",
                                        fontSize: "0.7rem",
                                        fontWeight: 600,
                                        color: "var(--color-text-muted)",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.05em",
                                        textAlign: "left",
                                        whiteSpace: "nowrap",
                                    }}>
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} style={{ padding: "48px", textAlign: "center", color: "var(--color-text-muted)" }}>
                                        <RefreshCw size={20} style={{ animation: "spin 1s linear infinite", marginBottom: "8px" }} />
                                        <br />Laden...
                                    </td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} style={{ padding: "48px", textAlign: "center", color: "var(--color-text-muted)" }}>
                                        Geen audit logs gevonden
                                    </td>
                                </tr>
                            ) : logs.map((log) => {
                                const config = ACTION_CONFIG[log.action] || { label: log.action, icon: Settings, color: "#6b7280" };
                                const ActionIcon = config.icon;
                                return (
                                    <tr
                                        key={log.id}
                                        style={{
                                            borderBottom: "1px solid var(--color-border)",
                                            transition: "background 0.15s",
                                        }}
                                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(99, 102, 241, 0.03)")}
                                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                                    >
                                        <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                                            <span style={{ fontSize: "0.875rem", color: "var(--color-text-primary)" }}>
                                                {timeAgo(log.createdAt)}
                                            </span>
                                            <br />
                                            <span style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>
                                                {new Date(log.createdAt).toLocaleString("nl-NL")}
                                            </span>
                                        </td>
                                        <td style={{ padding: "12px 16px" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                <div style={{
                                                    width: "28px",
                                                    height: "28px",
                                                    borderRadius: "50%",
                                                    background: "var(--color-bg-primary)",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    flexShrink: 0,
                                                }}>
                                                    <User size={14} style={{ color: "var(--color-text-muted)" }} />
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--color-text-primary)" }}>
                                                        {log.userName}
                                                    </div>
                                                    {log.userEmail && (
                                                        <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>
                                                            {log.userEmail}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: "12px 16px" }}>
                                            <div style={{
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: "6px",
                                                padding: "4px 10px",
                                                borderRadius: "6px",
                                                background: `${config.color}15`,
                                                color: config.color,
                                                fontSize: "0.75rem",
                                                fontWeight: 600,
                                            }}>
                                                <ActionIcon size={12} />
                                                {config.label}
                                            </div>
                                        </td>
                                        <td style={{ padding: "12px 16px", fontSize: "0.875rem", color: "var(--color-text-secondary)", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis" }}>
                                            {log.target || "—"}
                                        </td>
                                        <td style={{ padding: "12px 16px", fontSize: "0.8rem", color: "var(--color-text-muted)", maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis" }}>
                                            {log.details || "—"}
                                        </td>
                                        <td style={{ padding: "12px 16px", fontSize: "0.75rem", color: "var(--color-text-muted)", fontFamily: "monospace" }}>
                                            {log.ip || "—"}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: "16px",
                padding: "0 4px",
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Rijen per pagina:</span>
                    <select
                        value={perPage}
                        onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
                        style={{
                            padding: "4px 8px",
                            background: "var(--color-bg-secondary)",
                            border: "1px solid var(--color-border)",
                            borderRadius: "6px",
                            color: "var(--color-text-primary)",
                            fontSize: "0.75rem",
                        }}
                    >
                        {[10, 25, 50, 100].map(n => (
                            <option key={n} value={n}>{n}</option>
                        ))}
                    </select>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                        Pagina {page} van {totalPages}
                    </span>
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page <= 1}
                        style={{
                            padding: "6px",
                            background: "var(--color-bg-secondary)",
                            border: "1px solid var(--color-border)",
                            borderRadius: "6px",
                            color: page <= 1 ? "var(--color-text-muted)" : "var(--color-text-primary)",
                            cursor: page <= 1 ? "not-allowed" : "pointer",
                            opacity: page <= 1 ? 0.5 : 1,
                        }}
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages}
                        style={{
                            padding: "6px",
                            background: "var(--color-bg-secondary)",
                            border: "1px solid var(--color-border)",
                            borderRadius: "6px",
                            color: page >= totalPages ? "var(--color-text-muted)" : "var(--color-text-primary)",
                            cursor: page >= totalPages ? "not-allowed" : "pointer",
                            opacity: page >= totalPages ? 0.5 : 1,
                        }}
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}
