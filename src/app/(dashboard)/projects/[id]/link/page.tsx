export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { googleAdsService } from "@/lib/integrations/google-ads";
import { decrypt } from "@/lib/encryption";
import { AlertCircle } from "lucide-react";
import LinkSelectionClient from "./LinkSelectionClient";

export default async function LinkPage({
    params,
    searchParams
}: {
    params: Promise<{ id: string }>,
    searchParams: Promise<{ sourceId: string }>
}) {
    const session = await auth();
    if (!session) redirect("/login");

    const { id: projectId } = await params;
    const { sourceId } = await searchParams;

    if (!sourceId) notFound();

    const client = await prisma.project.findUnique({
        where: { id: projectId }
    });

    if (!client) notFound();

    const pendingSource = await prisma.dataSource.findUnique({
        where: { id: sourceId }
    });

    if (!pendingSource || pendingSource.projectId !== projectId) {
        notFound();
    }

    let accounts = [];
    try {
        accounts = await googleAdsService.listAccessibleCustomers(decrypt(pendingSource.token));
    } catch (error: any) {
        return (
            <div className="glass-card" style={{ padding: "40px", textAlign: "center", maxWidth: "500px", margin: "100px auto" }}>
                <AlertCircle size={40} color="#f87171" style={{ marginBottom: "16px" }} />
                <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "8px" }}>Fout bij ophalen accounts</h2>
                <p style={{ color: "var(--color-text-secondary)", fontSize: "0.9rem" }}>{error instanceof Error ? error.message : "Onbekende fout"}</p>
                <a href={`/projects/${projectId}`} className="btn btn-secondary" style={{ marginTop: "24px" }}>Terug naar project</a>
            </div>
        );
    }

    return (
        <div className="animate-fade-in" style={{ maxWidth: "600px", margin: "0 auto", paddingTop: "40px" }}>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "8px" }}>Koppel Google Ads Account</h1>
            <p style={{ color: "var(--color-text-secondary)", fontSize: "0.9rem", marginBottom: "32px" }}>
                Selecteer welk Google Ads account je wilt koppelen aan <strong>{client.name}</strong>.
            </p>

            <LinkSelectionClient
                projectId={projectId}
                sourceId={sourceId}
                accounts={accounts}
            />
        </div>
    );
}
