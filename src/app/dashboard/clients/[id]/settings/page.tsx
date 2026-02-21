export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { Save } from "lucide-react";

export default async function ClientSettingsPage({
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
        <div style={{ padding: "32px", maxWidth: "800px", margin: "0 auto" }}>
            <div style={{ marginBottom: "32px" }}>
                <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "8px" }}>
                    Client Settings
                </h1>
                <p style={{ color: "var(--color-text-secondary)" }}>
                    Configure {client.name} settings
                </p>
            </div>

            <div style={{
                padding: "32px",
                background: "var(--color-surface-elevated)",
                border: "1px solid var(--color-border)",
                borderRadius: "12px"
            }}>
                <div style={{ display: "grid", gap: "24px" }}>
                    <div>
                        <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, color: "var(--color-text-primary)", marginBottom: "8px" }}>
                            Account Naam
                        </label>
                        <input
                            defaultValue={client.name}
                            style={{
                                width: "100%",
                                padding: "10px 14px",
                                background: "var(--color-surface)",
                                border: "1px solid var(--color-border)",
                                borderRadius: "8px",
                                color: "var(--color-text-primary)"
                            }}
                        />
                    </div>
                </div>

                <div style={{ marginTop: "32px", display: "flex", justifyContent: "flex-end" }}>
                    <button
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "10px 24px",
                            background: "var(--color-brand)",
                            color: "white",
                            border: "none",
                            borderRadius: "8px",
                            fontWeight: 600,
                            cursor: "pointer"
                        }}
                    >
                        <Save size={20} />
                        Opslaan
                    </button>
                </div>
            </div>
        </div>
    );
}
