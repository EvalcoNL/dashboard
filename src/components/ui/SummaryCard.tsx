import React from "react";

export default function SummaryCard({
    icon,
    label,
    value,
    color,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    color: string;
}) {
    return (
        <div
            className="glass-card"
            style={{ padding: "20px" }}
        >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                    style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "10px",
                        background: `${color}15`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color,
                    }}
                >
                    {icon}
                </div>
                <div>
                    <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginBottom: "2px" }}>
                        {label}
                    </p>
                    <p style={{ fontSize: "1.25rem", fontWeight: 700, color }}>
                        {value}
                    </p>
                </div>
            </div>
        </div>
    );
}
