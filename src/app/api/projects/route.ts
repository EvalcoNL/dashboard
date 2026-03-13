export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

// POST /api/projects — Create new client with optional domain
export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    try {
        const body = await req.json();
        const {
            name,
            industryType,
            targetType,
            targetValue,
            tolerancePct,
            evaluationWindowDays,
            profitMarginPct,
            currency,
            domain,
        } = body;

        if (!name || !industryType || !targetType || !targetValue) {
            return NextResponse.json({ error: "Verplichte velden ontbreken" }, { status: 400 });
        }

        // Create the client/project
        const client = await prisma.project.create({
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

        // If a domain was provided, create a DOMAIN DataSource for monitoring
        if (domain && domain.trim()) {
            const cleanDomain = domain.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");

            await prisma.dataSource.create({
                data: {
                    projectId: client.id,
                    type: "DOMAIN",
                    name: cleanDomain,
                    externalId: cleanDomain,
                    token: "", // not needed for website monitoring
                    active: true,
                    config: {
                        uptime: true,
                        ssl: true,
                        uptimeInterval: 5,
                    },
                },
            });
        }

        return NextResponse.json(client, { status: 201 });
    } catch (error: unknown) {
        console.error("Error creating client:", error);
        return NextResponse.json({ error: "Fout bij aanmaken project" }, { status: 500 });
    }
}

// GET /api/projects — List all clients
export async function GET() {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const isAdmin = session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";

    const clients = await prisma.project.findMany({
        where: isAdmin ? undefined : {
            OR: [
                { users: { some: { id: session.user.id } } },
                { accountGroup: { members: { some: { userId: session.user.id } } } },
            ],
        },
        include: {
            dataSources: { where: { active: true } },
        },
        orderBy: { name: "asc" },
    });

    return NextResponse.json(clients);
}
