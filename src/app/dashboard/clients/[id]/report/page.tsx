export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { FileText, Download } from "lucide-react";

export default async function ClientReportPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const session = await auth();
    if (!session) redirect("/login");

    const { id } = await params;
    const client = await prisma.client.findUnique({
        where: { id }
    });

    if (!client) notFound();

    return (
        <div style={{ padding: "32px", maxWidth: "1200px", margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
                <div>
                    <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "8px" }}>
                        Reports
                    </h1>
                    <p style={{ color: "var(--color-text-secondary)" }}>
                        Performance reports for {client.name}
                    </p>
                </div>
                <button
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "10px 20px",
                        background: "var(--color-brand)",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        fontWeight: 600,
                        cursor: "pointer"
                    }}
                >
                    <Download size={20} />
                    Report Genereren
                </button>
            </div>

            <div style={{
                padding: "64px",
                textAlign: "center",
                background: "var(--color-surface-elevated)",
                border: "1px dashed var(--color-border)",
                borderRadius: "12px",
                color: "var(--color-text-secondary)"
            }}>
                <FileText size={48} style={{ margin: "0 auto 16px", opacity: 0.3 }} />
                Geen rapporten beschikbaar voor deze periode.
            </div>
        </div>
    );
}
