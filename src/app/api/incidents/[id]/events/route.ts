export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

// POST /api/incidents/[id]/events — add comment/event
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const { message, type } = body;

    if (!message) return NextResponse.json({ error: "Message required" }, { status: 400 });

    const incident = await (prisma as any).incident.findUnique({ where: { id } });
    if (!incident) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const event = await (prisma as any).incidentEvent.create({
        data: {
            incidentId: id,
            type: type || "COMMENT",
            message,
            userId: session.user?.id || null,
            userName: session.user?.name || "Onbekend",
        },
    });

    return NextResponse.json(event, { status: 201 });
}
