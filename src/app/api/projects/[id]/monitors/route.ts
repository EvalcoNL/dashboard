export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/projects/[id]/monitors
 * Create a new DOMAIN-type DataSource for monitoring.
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    // Verify client exists
    const client = await (prisma as any).client.findUnique({ where: { id } });
    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

    const body = await request.json();
    const { url, name } = body;

    if (!url) return NextResponse.json({ error: "URL is required" }, { status: 400 });

    // Clean the URL for externalId (strip protocol for storage)
    const cleanUrl = url.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const displayName = name || cleanUrl;

    // Create a DOMAIN data source with uptime + SSL monitoring enabled
    const dataSource = await (prisma as any).dataSource.create({
        data: {
            clientId: id,
            type: "DOMAIN",
            name: displayName,
            externalId: cleanUrl,
            token: "",
            config: {
                uptime: true,
                ssl: true,
                uptimeInterval: 5
            }
        }
    });

    return NextResponse.json({ dataSource }, { status: 201 });
}
