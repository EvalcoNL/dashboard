export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { Plus, Globe, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function DataSourcesPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const session = await auth();
    if (!session) redirect("/login");

    const { id } = await params;
    const client = await prisma.client.findUnique({
        where: { id },
        include: { dataSources: true }
    });

    if (!client) notFound();

    return (
        <div style={{ padding: "32px", maxWidth: "1200px", margin: "0 auto" }}>
            <Link
                href={`/dashboard/clients/${id}`}
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
                <ArrowLeft size={16} /> Terug naar dashboard
            </Link>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
                <div>
                    <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "8px" }}>
                        Data Sources
                    </h1>
                    <p style={{ color: "var(--color-text-secondary)" }}>
                        Manage data sources for {client.name}
                    </p>
                </div>
                <Link
                    href={`/dashboard/clients/${id}/data/sources/new`}
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
                        cursor: "pointer",
                        textDecoration: "none"
                    }}
                >
                    <Plus size={20} />
                    Toevoegen
                </Link>
            </div>

            <div style={{ display: "grid", gap: "16px" }}>
                {client.dataSources.map((source) => (
                    <div
                        key={source.id}
                        style={{
                            padding: "20px",
                            background: "var(--color-surface-elevated)",
                            border: "1px solid var(--color-border)",
                            borderRadius: "12px",
                            display: "flex",
                            alignItems: "center",
                            gap: "16px"
                        }}
                    >
                        <div style={{
                            width: "48px",
                            height: "48px",
                            borderRadius: "12px",
                            background: "rgba(99, 102, 241, 0.1)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                        }}>
                            {source.type === "GOOGLE_ADS" ? (
                                <svg viewBox="0 0 533.3 533.3" width="24" height="24">
                                    <path d="M316.7 178.3L170 431.7c-8.3 15-25 25-43.3 25s-35-10-43.3-25L25 333.3c-8.3-15-8.3-35 0-50L171.7 30c8.3-15 25-25 43.3-25s35 10 43.3 25l58.3 101.7c8.4 15 8.4 35 .1 46.6z" fill="#FBBC04" />
                                    <path d="M371.7 453.3l-55-96.7c-8.3-15-8.3-35 0-50l146.7-253.3c8.3-15 25-25 43.3-25s35 10 43.3 25l38.3 66.7c8.3 15 8.3 35 0 50L415 453.3c-8.3 15-25 25-43.3 25s-35-10-43.3-25z" fill="#4285F4" />
                                    <path d="M170 431.7c8.3 15 25 25 43.3 25s35-10 43.3-25l58.3-101.7c8.3-15 8.3-35 0-50l-58.3-101.7c-8.3-15-25-25-43.3-25s-35 10-43.3 25L170 431.7z" fill="#34A853" />
                                </svg>
                            ) : (
                                <Globe size={24} color="var(--color-brand)" />
                            )}
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, color: "var(--color-text-primary)" }}>{source.name || source.type}</div>
                            <div style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>{source.externalId}</div>
                        </div>
                        <div style={{
                            padding: "4px 12px",
                            borderRadius: "100px",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            background: "rgba(16, 185, 129, 0.1)",
                            color: "#10b981"
                        }}>
                            Connected
                        </div>
                    </div>
                ))}

                {client.dataSources.length === 0 && (
                    <div style={{
                        padding: "64px",
                        textAlign: "center",
                        background: "var(--color-surface-elevated)",
                        border: "1px dashed var(--color-border)",
                        borderRadius: "12px",
                        color: "var(--color-text-secondary)"
                    }}>
                        Geen data sources gevonden. Klik op &quot;Toevoegen&quot; om een koppeling te maken.
                    </div>
                )}
            </div>
        </div>
    );
}
