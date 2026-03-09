export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

// GET /api/incidents — list incidents (optionally filtered by projectId)
export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");

    const where: any = {};
    if (projectId) where.projectId = projectId;
    if (status) where.status = status;

    const incidents = await prisma.incident.findMany({
        where,
        orderBy: { startedAt: "desc" },
        take: limit,
        include: {
            project: { select: { id: true, name: true } },
            dataSource: { select: { id: true, name: true, externalId: true } },
            events: { orderBy: { createdAt: "desc" }, take: 1 },
        },
    });

    return NextResponse.json(incidents);
}

// POST /api/incidents — create an incident
export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { projectId, dataSourceId, title, cause, causeCode, checkedUrl, httpMethod, statusCode, responseTime, resolvedIp } = body;

    if (!projectId || !title || !cause) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const incident = await prisma.incident.create({
        data: {
            projectId,
            dataSourceId: dataSourceId || null,
            title,
            cause,
            causeCode: causeCode || null,
            status: "ONGOING",
            checkedUrl: checkedUrl || null,
            httpMethod: httpMethod || "GET",
            statusCode: statusCode || null,
            responseTime: responseTime || null,
            resolvedIp: resolvedIp || null,
            events: {
                create: {
                    type: "CREATED",
                    message: `Incident aangemaakt: ${cause}`,
                    userId: session.user?.id || null,
                    userName: session.user?.name || "Systeem",
                },
            },
        },
        include: { events: true },
    });

    return NextResponse.json(incident, { status: 201 });
}
