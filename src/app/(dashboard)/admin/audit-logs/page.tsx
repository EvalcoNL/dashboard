import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { FileText } from "lucide-react";
import AuditLogTable from "@/components/admin/AuditLogTable";

export const dynamic = "force-dynamic";

export default async function AuditLogPage() {
    const session = await auth();
    if (!session || (session.user as any)?.role !== "SUPER_ADMIN") {
        redirect("/");
    }

    return (
        <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
            <div style={{ marginBottom: "32px", display: "flex", alignItems: "center", gap: "16px" }}>
                <div style={{
                    padding: "12px",
                    background: "rgba(99, 102, 241, 0.1)",
                    borderRadius: "12px",
                    color: "#6366f1"
                }}>
                    <FileText size={24} />
                </div>
                <div>
                    <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--color-text-primary)" }}>Audit Log</h1>
                    <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}>Bekijk alle gebruikersacties en beveiligingsgebeurtenissen</p>
                </div>
            </div>

            <AuditLogTable />
        </div>
    );
}
