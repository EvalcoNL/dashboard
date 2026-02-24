"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import React from "react";

interface SourceCardProps {
    href?: string;
    onClick?: () => void;
    icon: React.ReactNode;
    title: string;
    description: string;
    isComingSoon?: boolean;
}

export default function SourceCard({ href, onClick, icon, title, description, isComingSoon }: SourceCardProps) {
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
        cursor: "pointer",
        position: "relative",
        overflow: "hidden"
    };

    // If onClick is provided, render a button-like div
    if (onClick && !href) {
        return (
            <>
                <div
                    style={sharedStyle}
                    className="source-card"
                    onClick={onClick}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && onClick()}
                >
                    {content}
                </div>
                <style jsx>{`
                    .source-card:hover {
                        transform: translateY(-4px);
                        border-color: var(--color-brand) !important;
                        background: rgba(99, 102, 241, 0.05) !important;
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
            >
                {content}
            </Link>

            <style jsx>{`
                .source-card:hover {
                    transform: translateY(-4px);
                    border-color: var(--color-brand) !important;
                    background: rgba(99, 102, 241, 0.05) !important;
                }
            `}</style>
        </>
    );
}
