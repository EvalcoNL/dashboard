"use client";

export default function MonitoringIncidentsLoading() {
    return (
        <div style={{
            padding: "32px",
            maxWidth: "1200px",
            margin: "0 auto",
            animation: "pulse 1.5s ease-in-out infinite"
        }}>
            {/* Header skeleton */}
            <div style={{ marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                    <div style={{
                        height: "28px",
                        width: "200px",
                        background: "rgba(51, 65, 85, 0.3)",
                        borderRadius: "8px",
                        marginBottom: "8px"
                    }} />
                    <div style={{
                        height: "14px",
                        width: "300px",
                        background: "rgba(51, 65, 85, 0.2)",
                        borderRadius: "6px"
                    }} />
                </div>
                <div style={{
                    height: "40px",
                    width: "120px",
                    background: "rgba(51, 65, 85, 0.2)",
                    borderRadius: "10px"
                }} />
            </div>

            {/* Stat cards skeleton */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "16px",
                marginBottom: "24px"
            }}>
                {[1, 2, 3].map((i) => (
                    <div key={i} className="glass-card" style={{ padding: "20px" }}>
                        <div style={{ height: "12px", width: "80px", background: "rgba(51, 65, 85, 0.3)", borderRadius: "4px", marginBottom: "12px" }} />
                        <div style={{ height: "28px", width: "40px", background: "rgba(51, 65, 85, 0.2)", borderRadius: "6px" }} />
                    </div>
                ))}
            </div>

            {/* Incidents list skeleton */}
            <div className="glass-card" style={{ padding: "24px" }}>
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "16px",
                        padding: "16px 0",
                        borderBottom: "1px solid rgba(51, 65, 85, 0.15)"
                    }}>
                        <div style={{ height: "12px", width: "12px", background: "rgba(51, 65, 85, 0.3)", borderRadius: "50%" }} />
                        <div style={{ height: "16px", width: "30%", background: "rgba(51, 65, 85, 0.2)", borderRadius: "4px" }} />
                        <div style={{ height: "16px", width: "15%", background: "rgba(51, 65, 85, 0.15)", borderRadius: "4px" }} />
                        <div style={{ flex: 1 }} />
                        <div style={{ height: "24px", width: "80px", background: "rgba(51, 65, 85, 0.2)", borderRadius: "6px" }} />
                    </div>
                ))}
            </div>

            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
            `}</style>
        </div>
    );
}
