import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    const session = await auth();
    if (!session || (session.user as any)?.email !== "admin@evalco.nl") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const perPage = parseInt(searchParams.get("perPage") || "25");
    const action = searchParams.get("action");
    const userId = searchParams.get("userId");
    const search = searchParams.get("search");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    const where: any = {};

    if (action) where.action = action;
    if (userId) where.userId = userId;
    if (search) {
        where.OR = [
            { action: { contains: search } },
            { target: { contains: search } },
            { details: { contains: search } },
            { ip: { contains: search } },
        ];
    }
    if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) where.createdAt.gte = new Date(dateFrom);
        if (dateTo) where.createdAt.lte = new Date(dateTo + "T23:59:59.999Z");
    }

    const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * perPage,
            take: perPage,
        }),
        prisma.auditLog.count({ where }),
    ]);

    // Fetch user names for display
    const userIds = [...new Set(logs.map(l => l.userId).filter(Boolean))] as string[];
    const users = userIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, name: true, email: true },
        })
        : [];
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));

    // Get distinct actions for filter dropdown
    const actions = await prisma.auditLog.findMany({
        select: { action: true },
        distinct: ["action"],
        orderBy: { action: "asc" },
    });

    return NextResponse.json({
        success: true,
        logs: logs.map(log => ({
            ...log,
            userName: log.userId ? userMap[log.userId]?.name || "Onbekend" : "Systeem",
            userEmail: log.userId ? userMap[log.userId]?.email || null : null,
        })),
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
        availableActions: actions.map(a => a.action),
    });
}
