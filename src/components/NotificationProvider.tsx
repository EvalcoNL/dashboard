"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { X, Check, AlertTriangle, Info, AlertCircle } from "lucide-react";

type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
    id: string;
    type: ToastType;
    message: string;
}

interface ConfirmOptions {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    type?: "danger" | "primary";
}

interface NotificationContextType {
    showToast: (type: ToastType, message: string) => void;
    confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [confirmDialog, setConfirmDialog] = useState<{
        options: ConfirmOptions;
        resolve: (value: boolean) => void;
    } | null>(null);

    const showToast = useCallback((type: ToastType, message: string) => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts((prev) => [...prev, { id, type, message }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 5000);
    }, []);

    const confirm = useCallback((options: ConfirmOptions) => {
        return new Promise<boolean>((resolve) => {
            setConfirmDialog({ options, resolve });
        });
    }, []);

    const handleConfirm = (value: boolean) => {
        if (confirmDialog) {
            confirmDialog.resolve(value);
            setConfirmDialog(null);
        }
    };

    return (
        <NotificationContext.Provider value={{ showToast, confirm }}>
            {children}

            {/* Toast Container */}
            <div style={{
                position: "fixed",
                top: "24px",
                right: "24px",
                zIndex: 9999,
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                pointerEvents: "none",
            }}>
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        style={{
                            pointerEvents: "auto",
                            padding: "14px 20px",
                            borderRadius: "10px",
                            background: "var(--color-surface-elevated)",
                            border: `1px solid ${getToastBorder(toast.type)}`,
                            color: getToastColor(toast.type),
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
                        {getToastIcon(toast.type)}
                        <div style={{ flex: 1 }}>{toast.message}</div>
                        <button
                            onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                            style={{
                                background: "none",
                                border: "none",
                                color: "inherit",
                                cursor: "pointer",
                                padding: "2px",
                                opacity: 0.7,
                            }}
                        >
                            <X size={14} />
                        </button>
                    </div>
                ))}
            </div>

            {/* Confirm Dialog */}
            {confirmDialog && (
                <>
                    <div
                        onClick={() => handleConfirm(false)}
                        style={{
                            position: "fixed",
                            inset: 0,
                            background: "rgba(0,0,0,0.6)",
                            zIndex: 10000,
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
                            width: "calc(100% - 32px)",
                            maxWidth: "420px",
                            background: "var(--color-surface-elevated)",
                            border: "1px solid var(--color-border)",
                            borderRadius: "16px",
                            padding: "32px",
                            zIndex: 10001,
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
                                background: confirmDialog.options.type === "danger" ? "rgba(239, 68, 68, 0.1)" : "rgba(99, 102, 241, 0.1)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                            }}>
                                <AlertTriangle size={22} color={confirmDialog.options.type === "danger" ? "#ef4444" : "var(--color-brand)"} />
                            </div>
                            <h2 style={{
                                fontSize: "1.1rem",
                                fontWeight: 700,
                                color: "var(--color-text-primary)",
                                margin: 0,
                            }}>
                                {confirmDialog.options.title}
                            </h2>
                        </div>

                        <p style={{
                            fontSize: "0.9rem",
                            color: "var(--color-text-secondary)",
                            lineHeight: 1.6,
                            marginBottom: "24px",
                            margin: "0 0 24px 0",
                        }}>
                            {confirmDialog.options.message}
                        </p>

                        <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                            <button
                                onClick={() => handleConfirm(false)}
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
                                {confirmDialog.options.cancelLabel || "Annuleren"}
                            </button>
                            <button
                                onClick={() => handleConfirm(true)}
                                style={{
                                    padding: "10px 24px",
                                    borderRadius: "8px",
                                    border: "none",
                                    background: confirmDialog.options.type === "danger"
                                        ? "linear-gradient(135deg, #ef4444, #dc2626)"
                                        : "var(--color-brand)",
                                    color: "white",
                                    fontSize: "0.875rem",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    transition: "all 0.15s",
                                }}
                            >
                                {confirmDialog.options.confirmLabel || "Bevestigen"}
                            </button>
                        </div>
                    </div>
                </>
            )}

            <style jsx global>{`
                @keyframes slideIn {
                    from { opacity: 0; transform: translateX(20px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { opacity: 0; transform: translate(-50%, -45%); }
                    to { opacity: 1; transform: translate(-50%, -50%); }
                }
            `}</style>
        </NotificationContext.Provider>
    );
}

export function useNotification() {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error("useNotification must be used within a NotificationProvider");
    }
    return context;
}

function getToastColor(type: ToastType) {
    switch (type) {
        case "success": return "#10b981";
        case "error": return "#ef4444";
        case "warning": return "#f59e0b";
        case "info": return "var(--color-brand)";
    }
}

function getToastBorder(type: ToastType) {
    switch (type) {
        case "success": return "rgba(16, 185, 129, 0.3)";
        case "error": return "rgba(239, 68, 68, 0.3)";
        case "warning": return "rgba(245, 158, 11, 0.3)";
        case "info": return "rgba(99, 102, 241, 0.3)";
    }
}

function getToastIcon(type: ToastType) {
    switch (type) {
        case "success": return <Check size={18} />;
        case "error": return <AlertCircle size={18} />;
        case "warning": return <AlertTriangle size={18} />;
        case "info": return <Info size={18} />;
    }
}
