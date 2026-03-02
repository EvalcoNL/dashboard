export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

// POST /api/projects — Create new client with optional domain
export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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

        // If a domain was provided, create a WEBSITE DataSource for monitoring
        if (domain && domain.trim()) {
            const cleanDomain = domain.trim().replace(/^https?:\/\//, "");
            const fullUrl = `https://${cleanDomain}`;

            await prisma.dataSource.create({
                data: {
                    clientId: client.id,
                    type: "WEBSITE",
                    name: cleanDomain,
                    category: "MONITOR",
                    externalId: fullUrl,
                    token: "", // not needed for website monitoring
                    active: true,
                },
            });
        }

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
