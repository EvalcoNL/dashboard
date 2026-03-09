import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET: Get available fields for rule conditions (metrics + dimensions from connected data sources)
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = await params;

    // Get all connected data sources with their connector definitions
    const dataSources = await prisma.dataSource.findMany({
        where: { projectId, active: true },
        include: {
            connector: {
                include: {
                    metrics: {
                        orderBy: { name: "asc" },
                    },
                    dimensions: {
                        orderBy: { name: "asc" },
                    },
                },
            },
        },
    });

    // Group fields by data source
    const fieldGroups = dataSources
        .filter(ds => ds.connector)
        .map(ds => ({
            dataSourceId: ds.id,
            dataSourceName: ds.name || ds.connector!.name,
            connectorSlug: ds.connector!.slug,
            connectorName: ds.connector!.name,
            metrics: ds.connector!.metrics.map(m => ({
                slug: m.canonicalName || m.slug,
                name: m.name,
                dataType: m.dataType,
                aggregationType: m.aggregationType,
            })),
            dimensions: ds.connector!.dimensions.map(d => ({
                slug: d.canonicalName || d.slug,
                name: d.name,
                dataType: d.dataType,
            })),
        }));

    // Also provide a universal set of common metrics
    const universalMetrics = [
        { slug: "cost", name: "Kosten", dataType: "CURRENCY" },
        { slug: "impressions", name: "Impressies", dataType: "NUMBER" },
        { slug: "clicks", name: "Klikken", dataType: "NUMBER" },
        { slug: "conversions", name: "Conversies", dataType: "NUMBER" },
        { slug: "conversion_value", name: "Conversiewaarde", dataType: "CURRENCY" },
        { slug: "ctr", name: "CTR", dataType: "PERCENTAGE" },
        { slug: "cpc", name: "CPC", dataType: "CURRENCY" },
        { slug: "roas", name: "ROAS", dataType: "NUMBER" },
    ];

    return NextResponse.json({
        success: true,
        fieldGroups,
        universalMetrics,
    });
}
