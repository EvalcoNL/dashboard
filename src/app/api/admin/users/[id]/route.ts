import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/api-guard";

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const [, authError] = await requireAdmin();
        if (authError) return authError;

        const { id } = await params;
        const { name, email, role } = await req.json();

        const updatedUser = await prisma.user.update({
            where: { id },
            data: { name, email, role }
        });

        return NextResponse.json(updatedUser);
    } catch (error) {
        console.error("[AdminUserUpdate] Error:", error);
        return NextResponse.json({ error: "Interne serverfout" }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const [session, authError] = await requireAdmin();
        if (authError) return authError;

        const { id } = await params;

        // Prevent deleting yourself
        if (id === session.user.id) {
            return NextResponse.json({ error: "Je kunt jezelf niet verwijderen" }, { status: 403 });
        }

        await prisma.user.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[AdminUserDelete] Error:", error);
        return NextResponse.json({ error: "Interne serverfout" }, { status: 500 });
    }
}
