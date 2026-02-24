export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

/**
 * GET /api/data-sources/[id]/monitored-pages
 * List all monitored pages for a domain data source.
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const pages = await (prisma as any).monitoredPage.findMany({
        where: { dataSourceId: id },
        orderBy: { url: "asc" }
    });

    return NextResponse.json({ pages });
}

/**
 * POST /api/data-sources/[id]/monitored-pages
 * Add a new monitored page.
 * Body: { url: string, label?: string }
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();

    if (!body.url) {
        return NextResponse.json({ error: "URL is verplicht" }, { status: 400 });
    }

    // Verify the data source exists and is a DOMAIN type
    const ds = await prisma.dataSource.findUnique({ where: { id } });
    if (!ds || ds.type !== "DOMAIN") {
        return NextResponse.json({ error: "Data source niet gevonden of geen domein" }, { status: 404 });
    }

    // Check for duplicate URL
    const existing = await (prisma as any).monitoredPage.findFirst({
        where: { dataSourceId: id, url: body.url }
    });
    if (existing) {
        return NextResponse.json({ error: "Deze URL wordt al gemonitord" }, { status: 409 });
    }

    const page = await (prisma as any).monitoredPage.create({
        data: {
            dataSourceId: id,
            url: body.url,
            label: body.label || null,
        }
    });

    return NextResponse.json({ page }, { status: 201 });
}

/**
 * DELETE /api/data-sources/[id]/monitored-pages
 * Remove a monitored page.
 * Body: { pageId: string }
 */
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    if (!body.pageId) {
        return NextResponse.json({ error: "pageId is verplicht" }, { status: 400 });
    }

    await (prisma as any).monitoredPage.delete({
        where: { id: body.pageId }
    });

    return NextResponse.json({ success: true, message: "Pagina verwijderd" });
}
