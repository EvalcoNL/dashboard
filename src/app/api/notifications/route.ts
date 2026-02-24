export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

/**
 * GET /api/notifications
 * Fetch notifications. Supports filtering by clientId and unread status.
 * Query params: ?clientId=xxx&unreadOnly=true&limit=50
 */
export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const where: any = {};
    if (clientId) where.clientId = clientId;
    if (unreadOnly) where.read = false;

    const notifications = await (prisma as any).notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: Math.min(limit, 100),
        include: {
            client: { select: { name: true } }
        }
    });

    const unreadCount = await (prisma as any).notification.count({
        where: { ...where, read: false }
    });

    return NextResponse.json({ notifications, unreadCount });
}

/**
 * PUT /api/notifications
 * Mark notifications as read.
 * Body: { ids: string[] } or { all: true, clientId?: string }
 */
export async function PUT(req: NextRequest) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    if (body.all) {
        const where: any = { read: false };
        if (body.clientId) where.clientId = body.clientId;

        await (prisma as any).notification.updateMany({
            where,
            data: { read: true }
        });

        return NextResponse.json({ success: true, message: "Alle notificaties gelezen" });
    }

    if (body.ids && Array.isArray(body.ids)) {
        await (prisma as any).notification.updateMany({
            where: { id: { in: body.ids } },
            data: { read: true }
        });

        return NextResponse.json({ success: true, message: `${body.ids.length} notificatie(s) gelezen` });
    }

    return NextResponse.json({ error: "Missing ids or all parameter" }, { status: 400 });
}
