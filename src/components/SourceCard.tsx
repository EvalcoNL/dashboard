"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import React from "react";

interface SourceCardProps {
    href?: string;
    icon: React.ReactNode;
    title: string;
    description: string;
    isComingSoon?: boolean;
}

export default function SourceCard({ href, icon, title, description, isComingSoon }: SourceCardProps) {
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

    return (
        <>
            <Link
                href={href || "#"}
                style={{
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
                }}
                className="source-card"
            >
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
