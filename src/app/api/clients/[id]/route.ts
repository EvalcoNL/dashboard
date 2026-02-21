export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

// GET /api/clients/[id] — Get single client
export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const client = await prisma.client.findUnique({
        where: { id },
        include: {
            dataSources: true,
            analystReports: {
                orderBy: { createdAt: "desc" },
                take: 1,
                include: { advisorReport: true },
            },
        },
    });

    if (!client) return NextResponse.json({ error: "Klant niet gevonden" }, { status: 404 });

    return NextResponse.json(client);
}

// PUT /api/clients/[id] — Update client
export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    try {
        const { id } = await params;
        const body = await req.json();
        const { name, industryType, targetType, targetValue, tolerancePct, evaluationWindowDays, profitMarginPct, currency } = body;

        const client = await prisma.client.update({
            where: { id },
            data: {
                name,
                industryType,
                targetType,
                targetValue,
                tolerancePct,
                evaluationWindowDays,
                profitMarginPct: profitMarginPct || null,
                currency,
            },
        });

        return NextResponse.json(client);
    } catch (error) {
        console.error("Error updating client:", error);
        return NextResponse.json({ error: "Fout bij bijwerken klant" }, { status: 500 });
    }
}

// DELETE /api/clients/[id] — Delete client
export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    try {
        const { id } = await params;
        await prisma.client.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting client:", error);
        return NextResponse.json({ error: "Fout bij verwijderen klant" }, { status: 500 });
    }
}
