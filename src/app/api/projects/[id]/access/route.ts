import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session || !session.user || session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized. Only admins can modify access." }, { status: 403 });
        }

        const { id: clientId } = await params;
        const { userIds } = await req.json();

        if (!Array.isArray(userIds)) {
            return NextResponse.json({ error: "Invalid payload: userIds must be an array" }, { status: 400 });
        }

        // We only allow assignment of non-ADMIN users in the UI, but let's make sure
        const validUsers = await prisma.user.findMany({
            where: { id: { in: userIds }, role: { not: "ADMIN" } },
            select: { id: true }
        });

        // Update the client's assigned users
        const updatedClient = await (prisma as any).client.update({
            where: { id: clientId },
            data: {
                users: {
                    set: validUsers.map(u => ({ id: u.id }))
                }
            },
            select: {
                id: true,
                users: { select: { id: true, name: true, email: true } }
            }
        });

        return NextResponse.json(updatedClient);
    } catch (error) {
        console.error("[PATCH /api/projects/[id]/access]", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
