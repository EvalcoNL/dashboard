export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

// PATCH /api/advisor-reports/[id] — Update status/notes
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role === "VIEWER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    try {
        const { id } = await params;
        const body = await req.json();
        const { status, notes } = body;

        const updateData: Record<string, unknown> = {};
        if (status) {
            updateData.status = status;
            updateData.reviewedById = session.user.id;
            updateData.reviewedAt = new Date();
            if (status === "EXECUTED") {
                updateData.executedAt = new Date();
            }
        }
        if (notes !== undefined) {
            updateData.notes = notes;
        }

        const report = await prisma.advisorReport.update({
            where: { id },
            data: updateData,
        });

        return NextResponse.json(report);
    } catch (error: any) {
        console.error("Error updating advisor report:", error);
        return NextResponse.json({ error: "Fout bij bijwerken" }, { status: 500 });
    }
}
