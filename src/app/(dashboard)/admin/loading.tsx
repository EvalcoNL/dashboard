"use client";

export default function AdminLoading() {
    return (
        <div style={{ padding: "32px", maxWidth: "1200px", margin: "0 auto", animation: "pulse 1.5s ease-in-out infinite" }}>
            <div style={{ marginBottom: "28px" }}>
                <div style={{ height: "28px", width: "160px", background: "rgba(51,65,85,0.3)", borderRadius: "8px", marginBottom: "8px" }} />
                <div style={{ height: "14px", width: "240px", background: "rgba(51,65,85,0.2)", borderRadius: "6px" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px", marginBottom: "24px" }}>
                {[1, 2, 3, 4].map(i => (
                    <div key={i} style={{ height: "110px", background: "rgba(51,65,85,0.15)", borderRadius: "12px" }} />
                ))}
            </div>
            {[1, 2, 3, 4, 5].map(i => (
                <div key={i} style={{ display: "flex", gap: "16px", padding: "14px 0", borderBottom: "1px solid rgba(51,65,85,0.1)" }}>
                    <div style={{ height: "14px", width: "25%", background: "rgba(51,65,85,0.2)", borderRadius: "4px" }} />
                    <div style={{ height: "14px", width: "20%", background: "rgba(51,65,85,0.15)", borderRadius: "4px" }} />
                    <div style={{ height: "14px", width: "15%", background: "rgba(51,65,85,0.1)", borderRadius: "4px" }} />
                </div>
            ))}
            <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
        </div>
    );
}
