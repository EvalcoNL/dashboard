"use client";

export default function DashboardLoading() {
    return (
        <div style={{
            padding: "32px",
            maxWidth: "1200px",
            margin: "0 auto",
            animation: "pulse 1.5s ease-in-out infinite"
        }}>
            {/* Header skeleton */}
            <div style={{ marginBottom: "32px" }}>
                <div style={{
                    height: "28px",
                    width: "240px",
                    background: "rgba(51, 65, 85, 0.3)",
                    borderRadius: "8px",
                    marginBottom: "8px"
                }} />
                <div style={{
                    height: "16px",
                    width: "320px",
                    background: "rgba(51, 65, 85, 0.2)",
                    borderRadius: "6px"
                }} />
            </div>

            {/* Stat cards skeleton */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "16px",
                marginBottom: "32px"
            }}>
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="glass-card" style={{
                        padding: "24px",
                        height: "110px",
                    }}>
                        <div style={{
                            height: "14px",
                            width: "100px",
                            background: "rgba(51, 65, 85, 0.3)",
                            borderRadius: "4px",
                            marginBottom: "16px"
                        }} />
                        <div style={{
                            height: "32px",
                            width: "80px",
                            background: "rgba(51, 65, 85, 0.2)",
                            borderRadius: "6px"
                        }} />
                    </div>
                ))}
            </div>

            {/* Table skeleton */}
            <div className="glass-card" style={{ padding: "24px" }}>
                <div style={{
                    height: "18px",
                    width: "160px",
                    background: "rgba(51, 65, 85, 0.3)",
                    borderRadius: "6px",
                    marginBottom: "24px"
                }} />
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} style={{
                        display: "flex",
                        gap: "16px",
                        padding: "16px 0",
                        borderBottom: "1px solid rgba(51, 65, 85, 0.15)"
                    }}>
                        <div style={{ height: "16px", width: "30%", background: "rgba(51, 65, 85, 0.2)", borderRadius: "4px" }} />
                        <div style={{ height: "16px", width: "15%", background: "rgba(51, 65, 85, 0.15)", borderRadius: "4px" }} />
                        <div style={{ height: "16px", width: "10%", background: "rgba(51, 65, 85, 0.15)", borderRadius: "4px" }} />
                        <div style={{ height: "16px", width: "20%", background: "rgba(51, 65, 85, 0.1)", borderRadius: "4px" }} />
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
