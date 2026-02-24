export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

/**
 * POST /api/data-sources/api-key
 * Creates a DataSource from an API key or login credentials.
 * Body: { clientId, platformType, name, config: { apiKey?, username?, password?, storeUrl?, ... } }
 */
export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const body = await req.json();
        const { clientId, platformType, name, config } = body;

        if (!clientId || !platformType || !config) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Determine the token value — API key or encoded credentials
        const token = config.apiKey || JSON.stringify(config);
        const externalId = config.storeUrl || config.domain || config.username || platformType;

        // Create the data source
        const dataSource = await prisma.dataSource.create({
            data: {
                clientId,
                type: platformType,
                category: "APP",
                name: name || platformType,
                externalId,
                token,
                config: config,
                active: true,
            },
        });

        return NextResponse.json({
            success: true,
            dataSource: { id: dataSource.id, name: dataSource.name },
        });
    } catch (error: any) {
        console.error("[api-key] Error creating data source:", error);
        return NextResponse.json({ error: error.message || "Failed to create data source" }, { status: 500 });
    }
}
