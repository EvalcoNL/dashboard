import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session || session.user.email !== "admin@evalco.nl") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

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
        const session = await auth();
        if (!session || session.user.email !== "admin@evalco.nl") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        // Prevent deleting yourself
        const userToDelete = await prisma.user.findUnique({ where: { id } });
        if (userToDelete?.email === "admin@evalco.nl") {
            return NextResponse.json({ error: "Je kunt de super admin niet verwijderen" }, { status: 403 });
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
