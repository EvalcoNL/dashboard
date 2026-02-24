export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

// POST /api/projects — Create new client
export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    try {
        const body = await req.json();
        const { name, industryType, targetType, targetValue, tolerancePct, evaluationWindowDays, profitMarginPct, currency } = body;

        if (!name || !industryType || !targetType || !targetValue) {
            return NextResponse.json({ error: "Verplichte velden ontbreken" }, { status: 400 });
        }

        const client = await prisma.client.create({
            data: {
                name,
                industryType,
                targetType,
                targetValue,
                tolerancePct: tolerancePct || 15,
                evaluationWindowDays: evaluationWindowDays || 7,
                profitMarginPct: profitMarginPct || null,
                currency: currency || "EUR",
            },
        });

        return NextResponse.json(client, { status: 201 });
    } catch (error: any) {
        console.error("Error creating client:", error);
        return NextResponse.json({ error: "Fout bij aanmaken project" }, { status: 500 });
    }
}

// GET /api/projects — List all clients
export async function GET() {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const isAdmin = session.user.role === "ADMIN";

    const clients = await prisma.client.findMany({
        where: isAdmin ? undefined : {
            users: {
                some: { id: session.user.id }
            }
        },
        include: {
            dataSources: { where: { active: true } },
        },
        orderBy: { name: "asc" },
    });

    return NextResponse.json(clients);
}
