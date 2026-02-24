"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { MoreVertical, Trash2, RefreshCw, Settings, Users, AlertTriangle, X, Check } from "lucide-react";

export default function DataSourceActions({
    sourceId,
    clientId,
    sourceName,

    sourceType
}: {
    sourceId: string;
    clientId: string;
    sourceName: string;

    sourceType?: string;
}) {
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
    const router = useRouter();
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (toast) {
            const t = setTimeout(() => setToast(null), 4000);
            return () => clearTimeout(t);
        }
    }, [toast]);

    useEffect(() => {
        if (!isOpen) return;
        const handleClick = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [isOpen]);

    const handleDelete = async () => {
        setShowDeleteConfirm(false);
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/data-sources/${sourceId}/link`, {
                method: "DELETE"
            });

            if (res.ok) {
                router.refresh();
            } else {
                setToast({ type: "error", message: "Er is iets misgegaan bij het verwijderen." });
                setIsDeleting(false);
            }
        } catch (error: any) {
            console.error("Delete failed:", error);
            setToast({ type: "error", message: "Er is iets misgegaan bij het verwijderen." });
            setIsDeleting(false);
        }
    };

    const handleReconnect = () => {
        const linkRoutes: Record<string, string> = {
            GOOGLE_ADS: "/api/auth/google-ads/link",
            GOOGLE_ANALYTICS: "/api/auth/google-analytics/link",
            GOOGLE_BUSINESS: "/api/auth/google-business/link",
            GOOGLE_MERCHANT: "/api/auth/google-merchant/link",
            GOOGLE_TAG_MANAGER: "/api/auth/google-tagmanager/link",
            YOUTUBE: "/api/auth/youtube/link",
        };
        const route = linkRoutes[sourceType || ""] || "/api/auth/google-ads/link";
        window.location.href = `${route}?clientId=${clientId}`;
    };

    const handleSettings = () => {
        router.push(`/dashboard/projects/${clientId}/data/sources/${sourceId}/edit`);
    };

    const menuItemStyle: React.CSSProperties = {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "8px 12px",
        fontSize: "0.875rem",
        borderRadius: "4px",
        cursor: "pointer",
        color: "var(--color-text-primary)",
        outline: "none",
        background: "none",
        border: "none",
        width: "100%",
        textAlign: "left",
    };

    return (
        <>
            <div ref={dropdownRef} style={{ position: "relative" }}>
                <button
                    disabled={isDeleting}
                    onClick={() => setIsOpen(!isOpen)}
                    style={{
                        background: "none",
                        border: "none",
                        padding: "8px",
                        cursor: "pointer",
                        borderRadius: "8px",
                        color: "var(--color-text-muted)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all 0.2s"
                    }}
                    onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                    onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = "none"}
                >
                    <MoreVertical size={20} />
                </button>

                {isOpen && (
                    <div
                        style={{
                            position: "absolute",
                            top: "100%",
                            right: 0,
                            marginTop: "5px",
                            background: "var(--color-surface-elevated)",
                            border: "1px solid var(--color-border)",
                            borderRadius: "8px",
                            padding: "4px",
                            minWidth: "180px",
                            boxShadow: "0 10px 30px -10px rgba(0,0,0,0.5)",
                            animation: "fadeIn 0.1s ease",
                            zIndex: 50
                        }}
                    >
                        {sourceType === "DOMAIN" ? (
                            <button
                                onClick={() => { setIsOpen(false); handleSettings(); }}
                                style={menuItemStyle}
                                onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                                onMouseLeave={(e) => e.currentTarget.style.background = "none"}
                            >
                                <Settings size={16} />
                                Instellingen
                            </button>
                        ) : (
                            <button
                                onClick={() => { setIsOpen(false); handleReconnect(); }}
                                style={menuItemStyle}
                                onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                                onMouseLeave={(e) => e.currentTarget.style.background = "none"}
                            >
                                <RefreshCw size={16} />
                                Opnieuw koppelen
                            </button>
                        )}

                        <button
                            onClick={() => { setIsOpen(false); router.push(`/dashboard/projects/${clientId}/data/access?sourceId=${sourceId}`); }}
                            style={menuItemStyle}
                            onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                            onMouseLeave={(e) => e.currentTarget.style.background = "none"}
                        >
                            <Users size={16} />
                            Toegangen
                        </button>

                        <button
                            onClick={() => { setIsOpen(false); setShowDeleteConfirm(true); }}
                            style={{ ...menuItemStyle, color: "#ef4444" }}
                            onMouseEnter={(e) => e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)"}
                            onMouseLeave={(e) => e.currentTarget.style.background = "none"}
                        >
                            <Trash2 size={16} />
                            {isDeleting ? "Verwijderen..." : "Verwijderen"}
                        </button>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Dialog */}
            {showDeleteConfirm && (
                <>
                    <div
                        onClick={() => setShowDeleteConfirm(false)}
                        style={{
                            position: "fixed",
                            inset: 0,
                            background: "rgba(0,0,0,0.6)",
                            zIndex: 1100,
                            backdropFilter: "blur(4px)",
                            animation: "fadeIn 0.2s ease",
                        }}
                    />
                    <div
                        style={{
                            position: "fixed",
                            top: "50%",
                            left: "50%",
                            transform: "translate(-50%, -50%)",
                            width: "100%",
                            maxWidth: "420px",
                            background: "var(--color-surface-elevated)",
                            border: "1px solid var(--color-border)",
                            borderRadius: "16px",
                            padding: "32px",
                            zIndex: 1101,
                            animation: "slideUp 0.3s ease",
                            boxShadow: "0 20px 60px -15px rgba(0,0,0,0.5)",
                        }}
                    >
                        <div style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            marginBottom: "16px",
                        }}>
                            <div style={{
                                width: "44px",
                                height: "44px",
                                borderRadius: "12px",
                                background: "rgba(239, 68, 68, 0.1)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                            }}>
                                <AlertTriangle size={22} color="#ef4444" />
                            </div>
                            <h2 style={{
                                fontSize: "1.1rem",
                                fontWeight: 700,
                                color: "var(--color-text-primary)",
                            }}>
                                Bron verwijderen
                            </h2>
                        </div>

                        <p style={{
                            fontSize: "0.9rem",
                            color: "var(--color-text-secondary)",
                            lineHeight: 1.6,
                            marginBottom: "8px",
                        }}>
                            Weet je zeker dat je <strong style={{ color: "var(--color-text-primary)" }}>{sourceName}</strong> wilt verwijderen?
                        </p>
                        <p style={{
                            fontSize: "0.8rem",
                            color: "var(--color-text-muted)",
                            lineHeight: 1.5,
                            marginBottom: "24px",
                        }}>
                            Alle gekoppelde data en metrics voor deze source zullen permanent worden verwijderd. Dit kan niet ongedaan worden gemaakt.
                        </p>

                        <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                style={{
                                    padding: "10px 20px",
                                    borderRadius: "8px",
                                    border: "1px solid var(--color-border)",
                                    background: "none",
                                    color: "var(--color-text-secondary)",
                                    fontSize: "0.875rem",
                                    fontWeight: 500,
                                    cursor: "pointer",
                                    transition: "all 0.15s",
                                }}
                            >
                                Annuleren
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={isDeleting}
                                style={{
                                    padding: "10px 24px",
                                    borderRadius: "8px",
                                    border: "none",
                                    background: "linear-gradient(135deg, #ef4444, #dc2626)",
                                    color: "white",
                                    fontSize: "0.875rem",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    transition: "all 0.15s",
                                }}
                            >
                                <Trash2 size={16} />
                                Ja, verwijderen
                            </button>
                        </div>
                    </div>
                    <style>{`
                        @keyframes fadeIn {
                            from { opacity: 0; }
                            to { opacity: 1; }
                        }
                        @keyframes slideUp {
                            from { opacity: 0; transform: translate(-50%, -45%); }
                            to { opacity: 1; transform: translate(-50%, -50%); }
                        }
                    `}</style>
                </>
            )}

            {/* Toast Notification */}
            {toast && (
                <div
                    style={{
                        position: "fixed",
                        top: "24px",
                        right: "24px",
                        zIndex: 200,
                        padding: "14px 20px",
                        borderRadius: "10px",
                        background: toast.type === "success"
                            ? "rgba(16, 185, 129, 0.15)"
                            : "rgba(239, 68, 68, 0.15)",
                        border: `1px solid ${toast.type === "success" ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
                        color: toast.type === "success" ? "#10b981" : "#ef4444",
                        fontSize: "0.875rem",
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        boxShadow: "0 8px 24px -8px rgba(0,0,0,0.3)",
                        backdropFilter: "blur(8px)",
                        animation: "slideIn 0.3s ease",
                        maxWidth: "400px",
                    }}
                >
                    {toast.type === "success" ? <Check size={18} /> : <X size={18} />}
                    {toast.message}
                    <button
                        onClick={() => setToast(null)}
                        style={{
                            background: "none",
                            border: "none",
                            color: "inherit",
                            cursor: "pointer",
                            padding: "2px",
                            marginLeft: "8px",
                            opacity: 0.7,
                        }}
                    >
                        <X size={14} />
                    </button>
                    <style>{`
                        @keyframes slideIn {
                            from { opacity: 0; transform: translateX(20px); }
                            to { opacity: 1; transform: translateX(0); }
                        }
                    `}</style>
                </div>
            )}
        </>
    );
}
