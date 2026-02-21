export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import SourceCard from "@/components/SourceCard";

export default async function NewDataSourcePage({
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
            <Link
                href={`/dashboard/clients/${id}/data/sources`}
                style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    color: "var(--color-text-muted)",
                    textDecoration: "none",
                    fontSize: "0.85rem",
                    marginBottom: "24px",
                }}
            >
                <ArrowLeft size={16} /> Terug naar bronnen
            </Link>

            <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "8px" }}>
                Nieuwe Bron Toevoegen
            </h1>
            <p style={{ color: "var(--color-text-secondary)", marginBottom: "40px" }}>
                Selecteer een platform om te koppelen aan {client.name}
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "24px" }}>
                <SourceCard
                    href={`/api/auth/google-ads/link?clientId=${id}`}
                    icon={
                        <svg viewBox="0 0 533.3 533.3" width="48" height="48">
                            <path d="M316.7 178.3L170 431.7c-8.3 15-25 25-43.3 25s-35-10-43.3-25L25 333.3c-8.3-15-8.3-35 0-50L171.7 30c8.3-15 25-25 43.3-25s35 10 43.3 25l58.3 101.7c8.4 15 8.4 35 .1 46.6z" fill="#FBBC04" />
                            <path d="M371.7 453.3l-55-96.7c-8.3-15-8.3-35 0-50l146.7-253.3c8.3-15 25-25 43.3-25s35 10 43.3 25l38.3 66.7c8.3 15 8.3 35 0 50L415 453.3c-8.3 15-25 25-43.3 25s-35-10-43.3-25z" fill="#4285F4" />
                            <path d="M170 431.7c8.3 15 25 25 43.3 25s35-10 43.3-25l58.3-101.7c8.3-15 8.3-35 0-50l-58.3-101.7c-8.3-15-25-25-43.3-25s-35 10-43.3 25L170 431.7z" fill="#34A853" />
                        </svg>
                    }
                    title="Google Ads"
                    description="Koppel Google Ads campagnes voor performance tracking"
                />

                <SourceCard
                    isComingSoon
                    icon="Logo"
                    title="Meta Ads"
                    description="Performance data vanuit Facebook en Instagram"
                />
            </div>
        </div>
    );
}
