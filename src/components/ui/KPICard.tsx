import { formatPercent, formatNumber } from "@/lib/services/kpi-engine";

export default function KPICard({
    label,
    value,
    target,
    delta,
    deviation,
    inverse,
}: {
    label: string;
    value: string;
    target?: string;
    delta?: number;
    deviation?: number;
    inverse?: boolean;
}) {
    const deltaPositive = inverse ? (delta ?? 0) < 0 : (delta ?? 0) > 0;
    const deltaColor = delta === undefined || delta === 0 ? "var(--color-text-muted)" : deltaPositive ? "var(--color-success)" : "var(--color-danger)";

    return (
        <div className="glass-card" style={{ padding: "16px" }}>
            <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginBottom: "8px" }}>
                {label}
            </p>
            <p style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "4px" }}>{value}</p>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                {delta !== undefined && (
                    <span style={{ fontSize: "0.75rem", color: deltaColor, fontWeight: 500 }}>
                        {formatPercent(delta)} WoW
                    </span>
                )}
                {target && (
                    <span style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>
                        vs {target} target
                    </span>
                )}
                {deviation !== undefined && (
                    <span
                        style={{
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            color: ((inverse ? deviation > 0 : deviation < 0) ? "var(--color-danger)" : "var(--color-success)"),
                        }}
                    >
                        ({deviation > 0 ? "+" : ""}{formatNumber(deviation, 1)}%)
                    </span>
                )}
            </div>
        </div>
    );
}
