"use client";

import { Plus, Loader2 } from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";

interface SourceCardProps {
    href?: string;
    onClick?: () => void;
    icon: React.ReactNode;
    title: string;
    description: string;
    isComingSoon?: boolean;
}

export default function SourceCard({ href, onClick, icon, title, description, isComingSoon }: SourceCardProps) {
    const [loading, setLoading] = useState(false);

    if (isComingSoon) {
        return (
            <div style={{
                padding: "32px",
                background: "var(--color-surface-elevated)",
                border: "1px solid var(--color-border)",
                borderRadius: "16px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "20px",
                opacity: 0.5,
                cursor: "not-allowed"
            }}>
                <div style={{
                    width: "80px",
                    height: "80px",
                    borderRadius: "20px",
                    background: "var(--color-surface)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--color-text-muted)",
                    fontSize: "0.75rem",
                    textAlign: "center"
                }}>
                    Coming Soon
                </div>
                <div style={{ textAlign: "center" }}>
                    <div style={{ fontWeight: 700, fontSize: "1.25rem", color: "var(--color-text-primary)", marginBottom: "4px" }}>
                        {title}
                    </div>
                    <div style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>
                        {description}
                    </div>
                </div>
            </div>
        );
    }

    const content = (
        <>
            {/* Loading overlay */}
            {loading && (
                <div style={{
                    position: "absolute",
                    inset: 0,
                    background: "rgba(15, 15, 25, 0.85)",
                    borderRadius: "16px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "12px",
                    zIndex: 10,
                    backdropFilter: "blur(4px)",
                }}>
                    <Loader2
                        size={28}
                        color="var(--color-brand)"
                        style={{ animation: "spin 1s linear infinite" }}
                    />
                    <span style={{
                        color: "var(--color-text-secondary)",
                        fontSize: "0.85rem",
                        fontWeight: 500,
                    }}>
                        Verbinden...
                    </span>
                </div>
            )}

            <div style={{
                width: "80px",
                height: "80px",
                borderRadius: "20px",
                background: "rgba(99, 102, 241, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
            }}>
                {icon}
            </div>
            <div style={{ textAlign: "center" }}>
                <div style={{ fontWeight: 700, fontSize: "1.25rem", color: "var(--color-text-primary)", marginBottom: "4px" }}>
                    {title}
                </div>
                <div style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>
                    {description}
                </div>
            </div>

            <div style={{
                marginTop: "12px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                color: "var(--color-brand)",
                fontWeight: 600,
                fontSize: "0.875rem"
            }}>
                <Plus size={16} />
                Koppelen
            </div>
        </>
    );

    const sharedStyle: React.CSSProperties = {
        padding: "32px",
        background: "var(--color-surface-elevated)",
        border: "1px solid var(--color-border)",
        borderRadius: "16px",
        textDecoration: "none",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "20px",
        transition: "all 0.2s ease",
        cursor: loading ? "wait" : "pointer",
        position: "relative",
        overflow: "hidden"
    };

    const handleClick = () => {
        if (loading) return;
        setLoading(true);
        if (onClick) {
            onClick();
            // Reset after a short delay for modals
            setTimeout(() => setLoading(false), 500);
        }
    };

    // If onClick is provided, render a button-like div
    if (onClick && !href) {
        return (
            <>
                <div
                    style={sharedStyle}
                    className="source-card"
                    onClick={handleClick}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && handleClick()}
                >
                    {content}
                </div>
                <style jsx>{`
                    .source-card:hover {
                        transform: translateY(-4px);
                        border-color: var(--color-brand) !important;
                        background: rgba(99, 102, 241, 0.05) !important;
                    }
                    @keyframes spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                `}</style>
            </>
        );
    }

    return (
        <>
            <Link
                href={href || "#"}
                style={sharedStyle}
                className="source-card"
                onClick={() => setLoading(true)}
            >
                {content}
            </Link>

            <style jsx>{`
                .source-card:hover {
                    transform: translateY(-4px);
                    border-color: var(--color-brand) !important;
                    background: rgba(99, 102, 241, 0.05) !important;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </>
    );
}
