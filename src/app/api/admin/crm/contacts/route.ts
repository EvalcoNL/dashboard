import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

// GET — list contacts (optionally filter by projectId)
// POST — create contact
export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session || session.user?.email !== "e.v.lieshout@evalco.nl") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    const contacts = await prisma.contact.findMany({
        where: projectId ? { projectId } : undefined,
        include: { project: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(contacts);
}

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session || session.user?.email !== "e.v.lieshout@evalco.nl") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { projectId, name, email, phone, role, isPrimary, notes } = body;

    if (!projectId || !name) {
        return NextResponse.json({ error: "projectId and name required" }, { status: 400 });
    }

    const contact = await prisma.contact.create({
        data: { projectId, name, email, phone, role, isPrimary: isPrimary || false, notes },
    });

    return NextResponse.json(contact, { status: 201 });
}
