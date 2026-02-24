export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { Plus, Globe, ArrowLeft } from "lucide-react";
import Link from "next/link";
import DataSourceActions from "./DataSourceActions";
import DataSourceIcon from "./DataSourceIcon";

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

    // Deduplicate: if a source exists with same externalId+type in both categories, keep only one
    const seenKeys = new Set<string>();
    const deduplicatedSources = client.dataSources.filter((s) => {
        const key = `${s.externalId}:${s.type}`;
        if (seenKeys.has(key)) return false;
        seenKeys.add(key);
        return true;
    });

    return (
        <div style={{ padding: "32px", maxWidth: "1200px", margin: "0 auto" }}>
            <Link
                href={`/dashboard/projects/${id}`}
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
                    href={`/dashboard/projects/${id}/data/sources/new`}
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

            {/* APPS SECTION */}
            <div style={{ marginBottom: "32px" }}>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--color-text-primary)", marginBottom: "16px" }}>
                    Connected Apps (Productiviteit)
                </h2>
                <div style={{ display: "grid", gap: "16px" }}>
                    {deduplicatedSources.filter(s => s.category === "APP" || s.type === "GOOGLE_ADS").map((source) => (
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
                            <DataSourceIcon type={source.type} />
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, color: "var(--color-text-primary)" }}>{source.name || source.type}</div>
                                <div style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>{source.externalId}</div>
                            </div>
                            <div style={{
                                padding: "4px 12px",
                                borderRadius: "100px",
                                fontSize: "0.75rem",
                                fontWeight: 600,
                                background: source.active
                                    ? "rgba(16, 185, 129, 0.1)"
                                    : "rgba(245, 158, 11, 0.1)",
                                color: source.active ? "#10b981" : "#f59e0b"
                            }}>
                                {source.active ? "Connected" : "Pending"}
                            </div>
                            <DataSourceActions
                                sourceId={source.id}
                                clientId={source.clientId}
                                sourceName={source.name || source.type}
                                sourceType={source.type}
                            />
                        </div>
                    ))}

                    {deduplicatedSources.filter(s => s.category === "APP" || s.type === "GOOGLE_ADS").length === 0 && (
                        <div style={{
                            padding: "64px",
                            textAlign: "center",
                            background: "var(--color-surface-elevated)",
                            border: "1px dashed var(--color-border)",
                            borderRadius: "12px",
                            color: "var(--color-text-secondary)"
                        }}>
                            Geen apps gekoppeld.
                        </div>
                    )}
                </div>
            </div>

            {/* DATA SOURCES SECTION */}
            <div>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--color-text-primary)", marginBottom: "16px" }}>
                    Data Bronnen (Marketing & Analytics)
                </h2>
                <div style={{ display: "grid", gap: "16px" }}>
                    {deduplicatedSources.filter(s => s.category !== "APP" && s.type !== "GOOGLE_ADS").map((source) => (
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
                            <DataSourceIcon type={source.type} />
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, color: "var(--color-text-primary)" }}>{source.name || source.type}</div>
                                <div style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>{source.externalId}</div>
                            </div>
                            <div style={{
                                padding: "4px 12px",
                                borderRadius: "100px",
                                fontSize: "0.75rem",
                                fontWeight: 600,
                                background: source.active
                                    ? "rgba(16, 185, 129, 0.1)"
                                    : "rgba(245, 158, 11, 0.1)",
                                color: source.active ? "#10b981" : "#f59e0b"
                            }}>
                                {source.active ? "Connected" : "Pending"}
                            </div>
                            <DataSourceActions
                                sourceId={source.id}
                                clientId={source.clientId}
                                sourceName={source.name || source.type}
                                sourceType={source.type}
                            />
                        </div>
                    ))}

                    {deduplicatedSources.filter(s => s.category !== "APP" && s.type !== "GOOGLE_ADS").length === 0 && (
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
        </div>
    );
}
