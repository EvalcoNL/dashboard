import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/api-guard";

/**
 * GET — Get a single account group with members and projects
 */
export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const [, authError] = await requireAdmin();
        if (authError) return authError;

        const { id } = await params;

        const group = await prisma.accountGroup.findUnique({
            where: { id },
            include: {
                members: {
                    include: {
                        user: { select: { id: true, name: true, email: true, role: true } },
                    },
                },
                projects: { select: { id: true, name: true } },
            },
        });

        if (!group) {
            return NextResponse.json({ error: "Accountgroep niet gevonden." }, { status: 404 });
        }

        return NextResponse.json({ success: true, group });
    } catch (error) {
        console.error("[GET /api/admin/account-groups/[id]]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

/**
 * PATCH — Update account group (name, members, projects)
 */
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const [, authError] = await requireAdmin();
        if (authError) return authError;

        const { id } = await params;
        const body = await req.json();

        // Verify group exists
        const existing = await prisma.accountGroup.findUnique({ where: { id } });
        if (!existing) {
            return NextResponse.json({ error: "Accountgroep niet gevonden." }, { status: 404 });
        }

        // Update name if provided
        if (body.name && typeof body.name === "string") {
            const slug = body.name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-|-$/g, "");

            await prisma.accountGroup.update({
                where: { id },
                data: { name: body.name.trim(), slug },
            });
        }

        // Update members if provided: [{ userId, role }]
        if (Array.isArray(body.members)) {
            // Remove all current members
            await prisma.accountGroupMember.deleteMany({ where: { accountGroupId: id } });

            // Add new members
            if (body.members.length > 0) {
                await prisma.accountGroupMember.createMany({
                    data: body.members.map((m: { userId: string; role?: string }) => ({
                        accountGroupId: id,
                        userId: m.userId,
                        role: m.role || "MEMBER",
                    })),
                });
            }
        }

        // Update project assignments if provided: [projectId, ...]
        if (Array.isArray(body.projectIds)) {
            // Unlink all current projects from this group
            await prisma.project.updateMany({
                where: { accountGroupId: id },
                data: { accountGroupId: null },
            });

            // Link new projects
            if (body.projectIds.length > 0) {
                await prisma.project.updateMany({
                    where: { id: { in: body.projectIds } },
                    data: { accountGroupId: id },
                });
            }
        }

        // Return updated group
        const group = await prisma.accountGroup.findUnique({
            where: { id },
            include: {
                members: {
                    include: {
                        user: { select: { id: true, name: true, email: true, role: true } },
                    },
                },
                projects: { select: { id: true, name: true } },
            },
        });

        return NextResponse.json({ success: true, group });
    } catch (error) {
        console.error("[PATCH /api/admin/account-groups/[id]]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

/**
 * DELETE — Delete an account group
 */
export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const [, authError] = await requireAdmin();
        if (authError) return authError;

        const { id } = await params;

        // Unlink projects first (set accountGroupId to null)
        await prisma.project.updateMany({
            where: { accountGroupId: id },
            data: { accountGroupId: null },
        });

        // Delete group (members cascade)
        await prisma.accountGroup.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[DELETE /api/admin/account-groups/[id]]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
