export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireProjectAccess, requireAdmin } from "@/lib/api-guard";

// GET /api/projects/[id] — Get single client
export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const [session, authError] = await requireProjectAccess(id);
    if (authError) return authError;

    const client = await prisma.project.findUnique({
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

    if (!client) return NextResponse.json({ error: "Project niet gevonden" }, { status: 404 });

    const response = NextResponse.json(client);
    response.headers.set('Cache-Control', 'private, s-maxage=60, stale-while-revalidate=120');
    return response;
}

// PUT /api/projects/[id] — Update client
export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const [, authError] = await requireAdmin();
    if (authError) return authError;

    try {
        const { id } = await params;
        const body = await req.json();
        const { name, industryType, targetType, targetValue, tolerancePct, evaluationWindowDays, profitMarginPct, currency } = body;

        const client = await prisma.project.update({
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
    } catch (error: unknown) {
        console.error("Error updating client:", error);
        return NextResponse.json({ error: "Fout bij bijwerken project" }, { status: 500 });
    }
}

// DELETE /api/projects/[id] — Delete client
export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const [, authError] = await requireAdmin();
    if (authError) return authError;

    try {
        const { id } = await params;
        await prisma.project.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error("Error deleting client:", error);
        return NextResponse.json({ error: "Fout bij verwijderen project" }, { status: 500 });
    }
}
