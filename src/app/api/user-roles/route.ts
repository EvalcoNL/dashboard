export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET: List all user roles, ordered by sortOrder.
 */
export async function GET() {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const roles = await prisma.userRole.findMany({
        orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({ roles });
}

/**
 * POST: Create a new user role.
 */
export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, color, roleMapping } = body as {
        name: string;
        description?: string;
        color?: string;
        roleMapping: Record<string, string>;
    };

    if (!name || !roleMapping) {
        return NextResponse.json({ error: "name and roleMapping are required" }, { status: 400 });
    }

    // Get max sortOrder for new role
    const maxOrder = await prisma.userRole.aggregate({ _max: { sortOrder: true } });
    const nextOrder = (maxOrder._max.sortOrder ?? -1) + 1;

    const role = await prisma.userRole.create({
        data: {
            name,
            description: description || null,
            color: color || "#6366f1",
            roleMapping,
            sortOrder: nextOrder,
        },
    });

    return NextResponse.json({ success: true, role });
}

/**
 * PUT: Update an existing user role.
 */
export async function PUT(req: NextRequest) {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, name, description, color, roleMapping } = body as {
        id: string;
        name?: string;
        description?: string;
        color?: string;
        roleMapping?: Record<string, string>;
    };

    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const data: Record<string, any> = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (color !== undefined) data.color = color;
    if (roleMapping !== undefined) data.roleMapping = roleMapping;

    const role = await prisma.userRole.update({ where: { id }, data });

    return NextResponse.json({ success: true, role });
}

/**
 * DELETE: Delete a user role (blocks deletion of default roles).
 */
export async function DELETE(req: NextRequest) {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const existing = await prisma.userRole.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Role not found" }, { status: 404 });
    if (existing.isDefault) {
        return NextResponse.json({ error: "Standaardrollen kunnen niet worden verwijderd" }, { status: 400 });
    }

    await prisma.userRole.delete({ where: { id } });

    return NextResponse.json({ success: true });
}
