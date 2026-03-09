export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { toCSV } from "@/lib/export-csv";

/**
 * GET /api/incidents/export
 * Export incidents as CSV.
 * Query params: ?projectId=xxx
 */
export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    const where: any = {};
    if (projectId) where.projectId = projectId;

    const incidents = await prisma.incident.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 1000,
        include: {
            project: { select: { name: true } },
        },
    });

    const csvData = incidents.map((i: any) => ({
        datum: new Date(i.createdAt).toLocaleString("nl-NL"),
        opgelost: i.resolvedAt ? new Date(i.resolvedAt).toLocaleString("nl-NL") : "",
        project: i.project?.name || "",
        type: i.type,
        titel: i.title,
        beschrijving: i.description || "",
        status: i.status,
        ernst: i.severity,
        bron: i.source || "",
    }));

    const columns = [
        { key: "datum", label: "Datum" },
        { key: "opgelost", label: "Opgelost Op" },
        { key: "project", label: "Project" },
        { key: "type", label: "Type" },
        { key: "titel", label: "Titel" },
        { key: "beschrijving", label: "Beschrijving" },
        { key: "status", label: "Status" },
        { key: "ernst", label: "Ernst" },
        { key: "bron", label: "Bron" },
    ];

    const csv = toCSV(csvData, columns);

    return new Response(csv, {
        status: 200,
        headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="incidenten-${new Date().toISOString().split('T')[0]}.csv"`,
        },
    });
}
