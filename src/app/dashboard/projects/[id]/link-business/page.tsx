export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import BusinessSelectionClient from "./BusinessSelectionClient";

export default async function LinkBusinessPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ sourceId?: string }>;
}) {
    const session = await auth();
    if (!session) redirect("/login");

    const { id: clientId } = await params;
    const { sourceId } = await searchParams;

    if (!sourceId) redirect(`/dashboard/projects/${clientId}/data/sources/new`);

    const client = await prisma.client.findUnique({
        where: { id: clientId }
    });
    if (!client) notFound();

    const pendingSource = await prisma.dataSource.findUnique({
        where: { id: sourceId }
    });

    if (!pendingSource || pendingSource.active || pendingSource.type !== "GOOGLE_BUSINESS") {
        redirect(`/dashboard/projects/${clientId}/data/sources`);
    }

    const config = pendingSource.config as { accounts?: Array<{ id: string; name: string; type: string }> } | null;
    const accounts = config?.accounts || [];

    return (
        <div style={{ padding: "32px", maxWidth: "800px", margin: "0 auto" }}>
            <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "8px" }}>
                Selecteer Google Business Profile
            </h1>
            <p style={{ color: "var(--color-text-secondary)", marginBottom: "32px" }}>
                Koppel een Google Business Profile aan <strong>{client.name}</strong>.
            </p>

            <BusinessSelectionClient
                clientId={clientId}
                sourceId={sourceId}
                accounts={accounts}
            />
        </div>
    );
}
