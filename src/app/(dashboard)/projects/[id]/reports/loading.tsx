"use client";

export default function ReportsLoading() {
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
            </div>

            {/* Reports cards skeleton */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                gap: "16px",
                marginBottom: "24px"
            }}>
                {[1, 2, 3].map((i) => (
                    <div key={i} className="glass-card" style={{
                        padding: "24px",
                        height: "160px",
                    }}>
                        <div style={{
                            height: "14px",
                            width: "120px",
                            background: "rgba(51, 65, 85, 0.3)",
                            borderRadius: "4px",
                            marginBottom: "16px"
                        }} />
                        <div style={{
                            height: "12px",
                            width: "80%",
                            background: "rgba(51, 65, 85, 0.2)",
                            borderRadius: "4px",
                            marginBottom: "8px"
                        }} />
                        <div style={{
                            height: "12px",
                            width: "60%",
                            background: "rgba(51, 65, 85, 0.15)",
                            borderRadius: "4px"
                        }} />
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
