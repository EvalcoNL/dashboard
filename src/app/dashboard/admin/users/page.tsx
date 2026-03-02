import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import UserManagementTable from "@/components/admin/UserManagementTable";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
    const session = await auth();

    // Security check: Only admin@evalco.nl can access this page
    if (!session || (session.user as any)?.email !== "admin@evalco.nl") {
        redirect("/dashboard");
    }

    const [users, roles] = await Promise.all([
        prisma.user.findMany({
            orderBy: { createdAt: "desc" },
            include: {
                clients: {
                    select: { id: true, name: true }
                }
            }
        }),
        prisma.userRole.findMany({
            select: { name: true },
            orderBy: { sortOrder: "asc" }
        })
    ]);

    return (
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
            <div style={{ marginBottom: "32px", display: "flex", alignItems: "center", gap: "16px" }}>
                <div style={{
                    padding: "12px",
                    background: "rgba(99, 102, 241, 0.1)",
                    borderRadius: "12px",
                    color: "#6366f1"
                }}>
                    <ShieldCheck size={24} />
                </div>
                <div>
                    <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--color-text-primary)" }}>Gebruikersbeheer</h1>
                    <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}>Beheer alle gebruikers, hun rollen en toegang</p>
                </div>
            </div>

            <UserManagementTable initialUsers={users} roles={roles} />
        </div>
    );
}
