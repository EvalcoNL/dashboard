"use client";

export default function MonitoringLoading() {
    return (
        <div style={{ padding: "32px", maxWidth: "1100px", margin: "0 auto", animation: "pulse 1.5s ease-in-out infinite" }}>
            <div style={{ marginBottom: "28px" }}>
                <div style={{ height: "28px", width: "180px", background: "rgba(51,65,85,0.3)", borderRadius: "8px", marginBottom: "8px" }} />
                <div style={{ height: "14px", width: "120px", background: "rgba(51,65,85,0.2)", borderRadius: "6px" }} />
            </div>
            <div style={{ display: "flex", gap: "24px", marginBottom: "24px", borderBottom: "1px solid var(--color-border)", paddingBottom: "1px" }}>
                {[1, 2, 3].map(i => <div key={i} style={{ height: "14px", width: "80px", background: "rgba(51,65,85,0.2)", borderRadius: "4px", paddingBottom: "12px" }} />)}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "16px", marginBottom: "24px" }}>
                <div style={{ height: "120px", background: "rgba(51,65,85,0.15)", borderRadius: "12px" }} />
                <div style={{ width: "200px", height: "120px", background: "rgba(51,65,85,0.15)", borderRadius: "12px" }} />
            </div>
            {[1, 2, 3, 4].map(i => (
                <div key={i} style={{ display: "flex", gap: "16px", padding: "16px 0", borderBottom: "1px solid rgba(51,65,85,0.1)" }}>
                    <div style={{ height: "16px", width: "25%", background: "rgba(51,65,85,0.2)", borderRadius: "4px" }} />
                    <div style={{ height: "16px", width: "15%", background: "rgba(51,65,85,0.15)", borderRadius: "4px" }} />
                    <div style={{ height: "16px", width: "20%", background: "rgba(51,65,85,0.1)", borderRadius: "4px" }} />
                </div>
            ))}
            <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
        </div>
    );
}
