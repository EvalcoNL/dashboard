"use client";

export default function ProjectLoading() {
    return (
        <div style={{
            padding: "32px",
            maxWidth: "1200px",
            margin: "0 auto",
            animation: "pulse 1.5s ease-in-out infinite"
        }}>
            {/* Breadcrumb skeleton */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "24px" }}>
                <div style={{ height: "14px", width: "60px", background: "rgba(51,65,85,0.2)", borderRadius: "4px" }} />
                <div style={{ height: "14px", width: "8px", background: "rgba(51,65,85,0.15)", borderRadius: "2px" }} />
                <div style={{ height: "14px", width: "120px", background: "rgba(51,65,85,0.2)", borderRadius: "4px" }} />
            </div>

            {/* Title */}
            <div style={{ height: "32px", width: "280px", background: "rgba(51,65,85,0.3)", borderRadius: "8px", marginBottom: "8px" }} />
            <div style={{ height: "16px", width: "200px", background: "rgba(51,65,85,0.2)", borderRadius: "6px", marginBottom: "32px" }} />

            {/* Cards grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px", marginBottom: "32px" }}>
                {[1, 2, 3].map(i => (
                    <div key={i} className="glass-card" style={{ padding: "24px", height: "140px" }}>
                        <div style={{ height: "14px", width: "100px", background: "rgba(51,65,85,0.25)", borderRadius: "4px", marginBottom: "16px" }} />
                        <div style={{ height: "28px", width: "60px", background: "rgba(51,65,85,0.2)", borderRadius: "6px", marginBottom: "12px" }} />
                        <div style={{ height: "12px", width: "140px", background: "rgba(51,65,85,0.15)", borderRadius: "4px" }} />
                    </div>
                ))}
            </div>

            {/* Content block */}
            <div className="glass-card" style={{ padding: "24px", height: "300px" }}>
                <div style={{ height: "20px", width: "200px", background: "rgba(51,65,85,0.25)", borderRadius: "6px", marginBottom: "24px" }} />
                {[1, 2, 3, 4].map(i => (
                    <div key={i} style={{
                        display: "flex", gap: "16px", padding: "14px 0",
                        borderBottom: "1px solid rgba(51,65,85,0.1)"
                    }}>
                        <div style={{ height: "14px", width: "25%", background: "rgba(51,65,85,0.2)", borderRadius: "4px" }} />
                        <div style={{ height: "14px", width: "20%", background: "rgba(51,65,85,0.15)", borderRadius: "4px" }} />
                        <div style={{ height: "14px", width: "15%", background: "rgba(51,65,85,0.1)", borderRadius: "4px" }} />
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
