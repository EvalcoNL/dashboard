export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import MerchantSelectionClient from "./MerchantSelectionClient";

export default async function LinkMerchantPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ sourceId?: string }>;
}) {
    const session = await auth();
    if (!session) redirect("/login");

    const { id: projectId } = await params;
    const { sourceId } = await searchParams;

    if (!sourceId) redirect(`/projects/${projectId}/data/sources/new`);

    const client = await prisma.project.findUnique({
        where: { id: projectId }
    });
    if (!client) notFound();

    const pendingSource = await prisma.dataSource.findUnique({
        where: { id: sourceId }
    });

    if (!pendingSource || pendingSource.active || pendingSource.type !== "GOOGLE_MERCHANT") {
        redirect(`/projects/${projectId}/data/sources`);
    }

    return (
        <div style={{ padding: "32px", maxWidth: "800px", margin: "0 auto" }}>
            <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "8px" }}>
                Selecteer Google Merchant Center Account
            </h1>
            <p style={{ color: "var(--color-text-secondary)", marginBottom: "32px" }}>
                Koppel een Google Merchant Center account aan <strong>{client.name}</strong>.
            </p>

            <MerchantSelectionClient
                projectId={projectId}
                sourceId={sourceId}
            />
        </div>
    );
}
