import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    const session = await auth();
    if (!session || (session.user as any)?.role !== "SUPER_ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const userId = searchParams.get("userId");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    const where: any = {};
    if (action) where.action = action;
    if (userId) where.userId = userId;
    if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) where.createdAt.gte = new Date(dateFrom);
        if (dateTo) where.createdAt.lte = new Date(dateTo + "T23:59:59.999Z");
    }

    const logs = await prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 10000,
    });

    const userIds = [...new Set(logs.map(l => l.userId).filter(Boolean))] as string[];
    const users = userIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, name: true, email: true },
        })
        : [];
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));

    const escapeCSV = (val: string | null) => {
        if (!val) return "";
        if (val.includes(",") || val.includes('"') || val.includes("\n")) {
            return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
    };

    const headers = ["Datum", "Gebruiker", "Email", "Actie", "Doel", "Details", "IP", "User Agent"];
    const rows = logs.map(log => [
        new Date(log.createdAt).toLocaleString("nl-NL"),
        escapeCSV(log.userId ? userMap[log.userId]?.name || "Onbekend" : "Systeem"),
        escapeCSV(log.userId ? userMap[log.userId]?.email || "" : ""),
        escapeCSV(log.action),
        escapeCSV(log.target),
        escapeCSV(log.details),
        escapeCSV(log.ip),
        escapeCSV(log.userAgent),
    ].join(","));

    const csv = "\uFEFF" + [headers.join(","), ...rows].join("\n");

    return new NextResponse(csv, {
        headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="audit-log-${new Date().toISOString().split("T")[0]}.csv"`,
        },
    });
}
