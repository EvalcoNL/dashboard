import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Layers } from "lucide-react";
import AccountGroupsManager from "@/components/admin/AccountGroupsManager";

export const dynamic = "force-dynamic";

export default async function AccountGroupsPage() {
    const session = await auth();

    // Security check: Only SUPER_ADMIN can access this page
    if (!session || (session.user as any)?.role !== "SUPER_ADMIN") {
        redirect("/");
    }

    const [groups, allUsers, allProjects] = await Promise.all([
        prisma.accountGroup.findMany({
            orderBy: { createdAt: "desc" },
            include: {
                members: {
                    include: {
                        user: { select: { id: true, name: true, email: true, role: true } },
                    },
                },
                projects: { select: { id: true, name: true } },
            },
        }),
        prisma.user.findMany({
            where: { role: { not: "SUPER_ADMIN" } },
            select: { id: true, name: true, email: true, role: true },
            orderBy: { name: "asc" },
        }),
        prisma.project.findMany({
            select: { id: true, name: true, accountGroupId: true },
            orderBy: { name: "asc" },
        }),
    ]);

    return (
        <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
            <div style={{ marginBottom: "32px", display: "flex", alignItems: "center", gap: "16px" }}>
                <div style={{
                    padding: "12px",
                    background: "rgba(99, 102, 241, 0.1)",
                    borderRadius: "12px",
                    color: "#6366f1"
                }}>
                    <Layers size={24} />
                </div>
                <div>
                    <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--color-text-primary)" }}>Accountgroepen</h1>
                    <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}>Beheer groepen van projecten en gebruikers (MCC-stijl)</p>
                </div>
            </div>

            <AccountGroupsManager
                initialGroups={groups}
                allUsers={allUsers}
                allProjects={allProjects}
            />
        </div>
    );
}
