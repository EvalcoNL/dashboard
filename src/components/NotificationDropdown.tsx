"use client";

import React, { useState, useEffect, useRef } from "react";
import {
    Bell,
    Check,
    CheckCheck,
    AlertTriangle,
    AlertCircle,
    Info,
    Activity,
    X,
    ExternalLink,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface Notification {
    id: string;
    type: string;
    title: string;
    message: string;
    severity: string;
    read: boolean;
    url?: string;
    createdAt: string;
    project?: { name: string };
}

export default function NotificationDropdown() {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/notifications?limit=20");
            if (res.ok) {
                const data = await res.json();
                setNotifications(data.notifications || []);
                setUnreadCount(data.unreadCount || 0);
            }
        } catch (err) {
            console.error("Failed to fetch notifications:", err);
        } finally {
            setLoading(false);
        }
    };

    // Fetch on mount and poll every 60s
    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 60_000);
        return () => clearInterval(interval);
    }, []);

    // Refetch when opening
    useEffect(() => {
        if (isOpen) fetchNotifications();
    }, [isOpen]);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const markAsRead = async (ids: string[]) => {
        try {
            await fetch("/api/notifications", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids }),
            });
            setNotifications(prev =>
                prev.map(n => ids.includes(n.id) ? { ...n, read: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - ids.length));
        } catch (err) {
            console.error("Failed to mark notifications as read:", err);
        }
    };

    const markAllRead = async () => {
        try {
            await fetch("/api/notifications", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ all: true }),
            });
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            setUnreadCount(0);
        } catch (err) {
            console.error("Failed to mark all as read:", err);
        }
    };

    const handleNotificationClick = (notification: Notification) => {
        if (!notification.read) {
            markAsRead([notification.id]);
        }
        if (notification.url) {
            router.push(notification.url);
            setIsOpen(false);
        }
    };

    const getSeverityIcon = (severity: string) => {
        switch (severity) {
            case "critical": return <AlertCircle size={16} color="#ef4444" />;
            case "warning": return <AlertTriangle size={16} color="#f59e0b" />;
            case "info": return <Info size={16} color="var(--color-brand)" />;
            default: return <Activity size={16} color="var(--color-text-muted)" />;
        }
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case "critical": return "rgba(239, 68, 68, 0.1)";
            case "warning": return "rgba(245, 158, 11, 0.1)";
            case "info": return "rgba(99, 102, 241, 0.1)";
            default: return "transparent";
        }
    };

    const timeAgo = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return "Zojuist";
        if (mins < 60) return `${mins}m geleden`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}u geleden`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days}d geleden`;
        return new Date(dateStr).toLocaleDateString("nl-NL");
    };

    return (
        <div ref={dropdownRef} style={{ position: "relative" }}>
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
                    transition: "background 0.2s"
                }}
                className="hover-bg"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span style={{
                        position: "absolute",
                        top: "4px",
                        right: "4px",
                        width: unreadCount > 9 ? "18px" : "16px",
                        height: "16px",
                        borderRadius: "8px",
                        background: "#ef4444",
                        color: "white",
                        fontSize: "0.65rem",
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
                    maxHeight: "480px",
                    background: "var(--color-surface-elevated)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "12px",
                    boxShadow: "0 10px 40px rgba(0, 0, 0, 0.25)",
                    zIndex: 120,
                    overflow: "hidden",
                    animation: "fadeIn 0.2s ease",
                }}>
                    {/* Header */}
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "16px",
                        borderBottom: "1px solid var(--color-border)",
                    }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--color-text-primary)" }}>
                                Notificaties
                            </span>
                            {unreadCount > 0 && (
                                <span style={{
                                    padding: "2px 8px", borderRadius: "10px",
                                    background: "rgba(239, 68, 68, 0.1)",
                                    color: "#ef4444", fontSize: "0.7rem", fontWeight: 700,
                                }}>
                                    {unreadCount} nieuw
                                </span>
                            )}
                        </div>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllRead}
                                style={{
                                    background: "none", border: "none", cursor: "pointer",
                                    color: "var(--color-brand)", fontSize: "0.75rem", fontWeight: 600,
                                    display: "flex", alignItems: "center", gap: "4px",
                                    padding: "4px 8px", borderRadius: "6px",
                                    transition: "background 0.2s",
                                }}
                                className="hover-bg"
                            >
                                <CheckCheck size={14} />
                                Alles gelezen
                            </button>
                        )}
                    </div>

                    {/* Notification List */}
                    <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                        {loading && notifications.length === 0 ? (
                            <div style={{ padding: "32px", textAlign: "center", color: "var(--color-text-muted)", fontSize: "0.85rem" }}>
                                Laden...
                            </div>
                        ) : notifications.length === 0 ? (
                            <div style={{
                                padding: "40px 24px", textAlign: "center",
                            }}>
                                <Bell size={32} color="var(--color-text-muted)" style={{ marginBottom: "12px", opacity: 0.4 }} />
                                <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem", fontWeight: 500 }}>
                                    Geen notificaties
                                </p>
                                <p style={{ color: "var(--color-text-muted)", fontSize: "0.75rem", marginTop: "4px" }}>
                                    Je bent helemaal bij!
                                </p>
                            </div>
                        ) : (
                            notifications.map((notification) => (
                                <button
                                    key={notification.id}
                                    onClick={() => handleNotificationClick(notification)}
                                    style={{
                                        display: "flex",
                                        gap: "12px",
                                        padding: "14px 16px",
                                        width: "100%",
                                        background: notification.read ? "transparent" : getSeverityColor(notification.severity),
                                        border: "none",
                                        borderBottom: "1px solid var(--color-border)",
                                        cursor: notification.url ? "pointer" : "default",
                                        textAlign: "left",
                                        transition: "background 0.15s",
                                    }}
                                    className="hover-bg-int"
                                >
                                    <div style={{ paddingTop: "2px", flexShrink: 0 }}>
                                        {getSeverityIcon(notification.severity)}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
                                            <span style={{
                                                fontSize: "0.8rem",
                                                fontWeight: notification.read ? 500 : 700,
                                                color: "var(--color-text-primary)",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                                whiteSpace: "nowrap",
                                            }}>
                                                {notification.title}
                                            </span>
                                            {!notification.read && (
                                                <div style={{
                                                    width: "6px", height: "6px", borderRadius: "50%",
                                                    background: "var(--color-brand)", flexShrink: 0,
                                                }} />
                                            )}
                                        </div>
                                        <p style={{
                                            fontSize: "0.75rem",
                                            color: "var(--color-text-muted)",
                                            margin: 0,
                                            lineHeight: 1.4,
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            display: "-webkit-box",
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: "vertical",
                                        }}>
                                            {notification.message}
                                        </p>
                                        <div style={{
                                            display: "flex", alignItems: "center", gap: "8px", marginTop: "4px",
                                        }}>
                                            {notification.project && (
                                                <span style={{ fontSize: "0.7rem", color: "var(--color-brand)", fontWeight: 600 }}>
                                                    {notification.project.name}
                                                </span>
                                            )}
                                            <span style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>
                                                {timeAgo(notification.createdAt)}
                                            </span>
                                        </div>
                                    </div>
                                    {notification.url && (
                                        <ExternalLink size={12} color="var(--color-text-muted)" style={{ flexShrink: 0, marginTop: "4px" }} />
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
