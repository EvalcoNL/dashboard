export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Activity } from "lucide-react";

export default async function DataTrackingPage() {
    const session = await auth();
    if (!session) redirect("/login");

    return (
        <div style={{ padding: "32px", maxWidth: "1200px", margin: "0 auto", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div className="glass-card" style={{ padding: "64px", textAlign: "center", maxWidth: "600px", width: "100%" }}>
                <div style={{
                    width: "80px",
                    height: "80px",
                    borderRadius: "50%",
                    background: "rgba(99, 102, 241, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--color-brand)",
                    margin: "0 auto 24px"
                }}>
                    <Activity size={40} />
                </div>
                <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "16px" }}>
                    Data Tracking <br /> Komt Binnenkort
                </h1>
                <p style={{ color: "var(--color-text-secondary)", fontSize: "1.1rem", lineHeight: 1.6 }}>
                    We werken hard aan een nieuwe functie waarmee we de kwaliteit van je data tracking kunnen monitoren.
                    Binnenkort kun je hier zien of je Google Analytics, Google Tag Manager en conversie pixels correct vuren.
                </p>
                <div style={{ marginTop: "32px", display: "inline-flex", padding: "8px 16px", borderRadius: "100px", background: "rgba(255,255,255,0.05)", border: "1px solid var(--color-border)", fontSize: "0.875rem", fontWeight: 600, color: "var(--color-text-muted)" }}>
                    In Ontwikkeling
                </div>
            </div>
        </div>
    );
}
