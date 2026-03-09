export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

/**
 * GET /api/notifications
 * Fetch notifications. Supports filtering by projectId and unread status.
 * Query params: ?projectId=xxx&unreadOnly=true&limit=50
 */
export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const where: any = {};
    if (projectId) where.projectId = projectId;
    if (unreadOnly) where.read = false;

    const notifications = await prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: Math.min(limit, 100),
        include: {
            project: { select: { name: true } }
        }
    });

    const unreadCount = await prisma.notification.count({
        where: { ...where, read: false }
    });

    return NextResponse.json({ notifications, unreadCount });
}

/**
 * PUT /api/notifications
 * Mark notifications as read.
 * Body: { ids: string[] } or { all: true, projectId?: string }
 */
export async function PUT(req: NextRequest) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    if (body.all) {
        const where: any = { read: false };
        if (body.projectId) where.projectId = body.projectId;

        await prisma.notification.updateMany({
            where,
            data: { read: true }
        });

        return NextResponse.json({ success: true, message: "Alle notificaties gelezen" });
    }

    if (body.ids && Array.isArray(body.ids)) {
        await prisma.notification.updateMany({
            where: { id: { in: body.ids } },
            data: { read: true }
        });

        return NextResponse.json({ success: true, message: `${body.ids.length} notificatie(s) gelezen` });
    }

    return NextResponse.json({ error: "Missing ids or all parameter" }, { status: 400 });
}

/**
 * DELETE /api/notifications
 * Delete (dismiss) notifications by IDs.
 * Body: { ids: string[] }
 */
export async function DELETE(req: NextRequest) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const body = await req.json();

        if (!body.ids || !Array.isArray(body.ids) || body.ids.length === 0) {
            return NextResponse.json({ error: "Missing or empty ids array" }, { status: 400 });
        }

        // Limit batch size to prevent abuse
        const ids = body.ids.slice(0, 100);

        const result = await prisma.notification.deleteMany({
            where: { id: { in: ids } },
        });

        return NextResponse.json({
            success: true,
            deleted: result.count,
            message: `${result.count} notificatie(s) verwijderd`,
        });
    } catch (error) {
        console.error("[DELETE /api/notifications]", error);
        return NextResponse.json({ error: "Failed to delete notifications" }, { status: 500 });
    }
}
