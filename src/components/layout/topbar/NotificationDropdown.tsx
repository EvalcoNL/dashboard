"use client";

import React, { useState, useEffect, useRef } from "react";
import {
    Bell,
    AlertTriangle,
    AlertCircle,
    Info,
    CheckCheck
} from "lucide-react";

export default function NotificationDropdown() {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const ref = useRef<HTMLDivElement>(null);

    // Click outside to close
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        function handleEscape(event: KeyboardEvent) {
            if (event.key === "Escape") setIsOpen(false);
        }
        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleEscape);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleEscape);
        };
    }, []);

    // Fetch notifications
    const fetchNotifications = async () => {
        try {
            const res = await fetch("/api/notifications?limit=20");
            if (res.ok) {
                const data = await res.json();
                setNotifications(data.notifications || []);
                setUnreadCount(data.unreadCount || 0);
            }
        } catch (err) {
            console.error("Failed to fetch notifications:", err);
        }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, []);

    const markAsRead = async (id: string) => {
        await fetch("/api/notifications", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: [id] })
        });
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
    };

    const markAllRead = async () => {
        await fetch("/api/notifications", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ all: true })
        });
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
    };

    const getSeverityIcon = (severity: string) => {
        if (severity === "critical") return <AlertCircle size={16} color="#ef4444" />;
        if (severity === "warning") return <AlertTriangle size={16} color="#f59e0b" />;
        return <Info size={16} color="#3b82f6" />;
    };

    const getTimeAgo = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return "Zojuist";
        if (mins < 60) return `${mins}m geleden`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}u geleden`;
        const days = Math.floor(hrs / 24);
        return `${days}d geleden`;
    };

    return (
        <div ref={ref} style={{ position: "relative" }}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    background: "none",
                    border: "none",
                    color: "var(--color-text-secondary)",
                    cursor: "pointer",
                    padding: "8px",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                }}
                className="hover-bg"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span style={{
                        position: "absolute",
                        top: "4px",
                        right: "4px",
                        width: unreadCount > 9 ? "20px" : "16px",
                        height: "16px",
                        borderRadius: "8px",
                        background: "#ef4444",
                        color: "white",
                        fontSize: "0.625rem",
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        lineHeight: 1,
                    }}>
                        {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div style={{
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    marginTop: "8px",
                    width: "380px",
                    background: "var(--color-surface-elevated)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "12px",
                    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.3)",
                    zIndex: 120,
                    overflow: "hidden",
                    animation: "fadeIn 0.2s ease-out"
                }}>
                    <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "14px 16px",
                        borderBottom: "1px solid var(--color-border)"
                    }}>
                        <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--color-text-primary)" }}>
                            Notificaties
                        </span>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllRead}
                                style={{
                                    background: "none",
                                    border: "none",
                                    color: "var(--color-brand)",
                                    cursor: "pointer",
                                    fontSize: "0.75rem",
                                    fontWeight: 600,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "4px"
                                }}
                            >
                                <CheckCheck size={14} /> Alles gelezen
                            </button>
                        )}
                    </div>

                    <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                        {notifications.length === 0 ? (
                            <div style={{ padding: "40px 16px", textAlign: "center", color: "var(--color-text-muted)", fontSize: "0.875rem" }}>
                                <Bell size={24} style={{ marginBottom: "8px", opacity: 0.3 }} />
                                <div>Geen notificaties</div>
                            </div>
                        ) : (
                            notifications.map((notif: any) => (
                                <div
                                    key={notif.id}
                                    style={{
                                        display: "flex",
                                        gap: "12px",
                                        padding: "12px 16px",
                                        borderBottom: "1px solid rgba(255,255,255,0.03)",
                                        background: notif.read ? "transparent" : "rgba(99, 102, 241, 0.04)",
                                        cursor: "pointer",
                                        transition: "background 0.15s"
                                    }}
                                    onClick={() => !notif.read && markAsRead(notif.id)}
                                    onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
                                    onMouseLeave={(e) => e.currentTarget.style.background = notif.read ? "transparent" : "rgba(99, 102, 241, 0.04)"}
                                >
                                    <div style={{ paddingTop: "2px" }}>
                                        {getSeverityIcon(notif.severity)}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                                            <span style={{
                                                fontSize: "0.8125rem",
                                                fontWeight: notif.read ? 500 : 600,
                                                color: "var(--color-text-primary)",
                                                lineHeight: 1.3
                                            }}>
                                                {notif.title}
                                            </span>
                                            {notif.statusCode && (
                                                <span style={{
                                                    fontSize: "0.6875rem",
                                                    fontWeight: 700,
                                                    padding: "2px 6px",
                                                    borderRadius: "4px",
                                                    background: notif.statusCode >= 500 ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.15)",
                                                    color: notif.statusCode >= 500 ? "#ef4444" : "#f59e0b",
                                                    flexShrink: 0
                                                }}>
                                                    {notif.statusCode}
                                                </span>
                                            )}
                                        </div>
                                        <div style={{
                                            fontSize: "0.75rem",
                                            color: "var(--color-text-muted)",
                                            marginTop: "2px",
                                            whiteSpace: "nowrap",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis"
                                        }}>
                                            {notif.url || notif.message}
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                                            <span style={{ fontSize: "0.6875rem", color: "var(--color-text-muted)" }}>
                                                {getTimeAgo(notif.createdAt)}
                                            </span>
                                            {notif.client?.name && (
                                                <span style={{ fontSize: "0.6875rem", color: "var(--color-text-muted)" }}>
                                                    • {notif.client.name}
                                                </span>
                                            )}
                                            {!notif.read && (
                                                <span style={{
                                                    width: "6px",
                                                    height: "6px",
                                                    borderRadius: "50%",
                                                    background: "var(--color-brand)",
                                                    marginLeft: "auto"
                                                }} />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
