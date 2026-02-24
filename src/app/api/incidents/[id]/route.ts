export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

// GET /api/incidents/[id] — get single incident with events
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const incident = await (prisma as any).incident.findUnique({
        where: { id },
        include: {
            client: { select: { id: true, name: true } },
            dataSource: { select: { id: true, name: true, externalId: true } },
            events: { orderBy: { createdAt: "asc" } },
        },
    });

    if (!incident) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json(incident);
}

// PATCH /api/incidents/[id] — update status (acknowledge/resolve)
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const { action } = body; // "acknowledge" | "resolve" | "reopen"

    const incident = await (prisma as any).incident.findUnique({ where: { id } });
    if (!incident) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const userName = session.user?.name || "Onbekend";
    const userId = session.user?.id || null;

    let updateData: any = {};
    let eventType = "";
    let eventMessage = "";

    if (action === "acknowledge") {
        updateData = { status: "ACKNOWLEDGED", acknowledgedAt: new Date(), acknowledgedBy: userName };
        eventType = "ACKNOWLEDGED";
        eventMessage = `Incident bevestigd door ${userName}`;
    } else if (action === "resolve") {
        updateData = { status: "RESOLVED", resolvedAt: new Date(), resolvedBy: userName };
        eventType = "RESOLVED";
        eventMessage = `Incident opgelost door ${userName}`;
    } else if (action === "reopen") {
        updateData = { status: "ONGOING", resolvedAt: null, resolvedBy: null, acknowledgedAt: null, acknowledgedBy: null };
        eventType = "REOPENED";
        eventMessage = `Incident heropend door ${userName}`;
    } else {
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const updated = await (prisma as any).incident.update({
        where: { id },
        data: {
            ...updateData,
            events: {
                create: {
                    type: eventType,
                    message: eventMessage,
                    userId,
                    userName,
                },
            },
        },
        include: {
            client: { select: { id: true, name: true } },
            dataSource: { select: { id: true, name: true, externalId: true } },
            events: { orderBy: { createdAt: "asc" } },
        },
    });

    return NextResponse.json(updated);
}
