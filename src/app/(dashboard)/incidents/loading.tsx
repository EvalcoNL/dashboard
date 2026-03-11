"use client";

export default function IncidentsLoading() {
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
                    width: "200px",
                    background: "rgba(51, 65, 85, 0.3)",
                    borderRadius: "8px",
                    marginBottom: "8px"
                }} />
                <div style={{
                    height: "16px",
                    width: "280px",
                    background: "rgba(51, 65, 85, 0.2)",
                    borderRadius: "6px"
                }} />
            </div>

            {/* Incidents list skeleton */}
            <div className="glass-card" style={{ padding: "24px" }}>
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "16px",
                        padding: "16px 0",
                        borderBottom: "1px solid rgba(51, 65, 85, 0.15)"
                    }}>
                        <div style={{ height: "12px", width: "12px", background: "rgba(51, 65, 85, 0.3)", borderRadius: "50%" }} />
                        <div style={{ height: "16px", width: "25%", background: "rgba(51, 65, 85, 0.2)", borderRadius: "4px" }} />
                        <div style={{ height: "16px", width: "15%", background: "rgba(51, 65, 85, 0.15)", borderRadius: "4px" }} />
                        <div style={{ height: "16px", width: "10%", background: "rgba(51, 65, 85, 0.15)", borderRadius: "4px" }} />
                        <div style={{ flex: 1 }} />
                        <div style={{ height: "28px", width: "80px", background: "rgba(51, 65, 85, 0.2)", borderRadius: "6px" }} />
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
