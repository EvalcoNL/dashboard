export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { toCSV } from "@/lib/export-csv";

/**
 * GET /api/notifications/export
 * Export notifications as CSV.
 * Query params: ?projectId=xxx
 */
export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    const where: any = {};
    if (projectId) where.projectId = projectId;

    const notifications = await prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 1000,
        include: {
            project: { select: { name: true } },
        },
    });

    const csvData = notifications.map((n: any) => ({
        datum: new Date(n.createdAt).toLocaleString("nl-NL"),
        project: n.project?.name || "",
        type: n.type,
        titel: n.title,
        bericht: n.message,
        ernst: n.severity,
        gelezen: n.read ? "Ja" : "Nee",
        url: n.url || "",
    }));

    const columns = [
        { key: "datum", label: "Datum" },
        { key: "project", label: "Project" },
        { key: "type", label: "Type" },
        { key: "titel", label: "Titel" },
        { key: "bericht", label: "Bericht" },
        { key: "ernst", label: "Ernst" },
        { key: "gelezen", label: "Gelezen" },
        { key: "url", label: "URL" },
    ];

    const csv = toCSV(csvData, columns);

    return new Response(csv, {
        status: 200,
        headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="notificaties-${new Date().toISOString().split('T')[0]}.csv"`,
        },
    });
}
