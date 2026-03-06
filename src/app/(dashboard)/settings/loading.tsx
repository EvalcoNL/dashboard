"use client";

export default function SettingsLoading() {
    return (
        <div className="animate-fade-in" style={{
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "0 24px",
            animation: "pulse 1.5s ease-in-out infinite"
        }}>
            <div style={{ height: "28px", width: "180px", background: "rgba(51,65,85,0.3)", borderRadius: "8px", marginBottom: "8px" }} />
            <div style={{ height: "16px", width: "280px", background: "rgba(51,65,85,0.2)", borderRadius: "6px", marginBottom: "32px" }} />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: "24px", alignItems: "start" }}>
                <div style={{ display: "grid", gap: "24px" }}>
                    {/* Profile card skeleton */}
                    <div className="glass-card" style={{ padding: "24px", height: "280px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
                            <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "rgba(51,65,85,0.3)" }} />
                            <div>
                                <div style={{ height: "16px", width: "140px", background: "rgba(51,65,85,0.3)", borderRadius: "4px", marginBottom: "6px" }} />
                                <div style={{ height: "12px", width: "200px", background: "rgba(51,65,85,0.2)", borderRadius: "4px" }} />
                            </div>
                        </div>
                        {[1, 2, 3].map(i => (
                            <div key={i} style={{ marginBottom: "16px" }}>
                                <div style={{ height: "12px", width: "60px", background: "rgba(51,65,85,0.2)", borderRadius: "4px", marginBottom: "8px" }} />
                                <div style={{ height: "40px", background: "rgba(51,65,85,0.15)", borderRadius: "8px" }} />
                            </div>
                        ))}
                    </div>

                    {/* Security card skeleton */}
                    <div className="glass-card" style={{ padding: "24px", height: "160px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
                            <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "rgba(51,65,85,0.3)" }} />
                            <div>
                                <div style={{ height: "16px", width: "100px", background: "rgba(51,65,85,0.3)", borderRadius: "4px", marginBottom: "6px" }} />
                                <div style={{ height: "12px", width: "180px", background: "rgba(51,65,85,0.2)", borderRadius: "4px" }} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right column skeleton */}
                <div className="glass-card" style={{ padding: "24px", height: "200px" }}>
                    <div style={{ height: "16px", width: "120px", background: "rgba(51,65,85,0.3)", borderRadius: "4px", marginBottom: "20px" }} />
                    {[1, 2, 3].map(i => (
                        <div key={i} style={{ height: "14px", width: `${80 - i * 15}%`, background: "rgba(51,65,85,0.15)", borderRadius: "4px", marginBottom: "12px" }} />
                    ))}
                </div>
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
