import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await req.json();

        // Validate client exists
        const client = await prisma.client.findUnique({ where: { id } });
        if (!client) {
            return NextResponse.json({ error: "Client not found" }, { status: 404 });
        }

        if (body.type !== "DOMAIN") {
            return NextResponse.json({ error: "Only DOMAIN type Data Sources can be created via this endpoint." }, { status: 400 });
        }

        if (!body.name || !body.externalId) {
            return NextResponse.json({ error: "Name and domain (externalId) are required." }, { status: 400 });
        }

        // Check if domain already exists for this client
        const existingSource = await prisma.dataSource.findFirst({
            where: {
                clientId: id,
                type: "DOMAIN",
                externalId: body.externalId
            }
        });

        if (existingSource) {
            return NextResponse.json({ error: "Dit domein is al toegevoegd voor deze project." }, { status: 400 });
        }

        const newSource = await prisma.dataSource.create({
            data: {
                clientId: id,
                type: "DOMAIN",
                name: body.name,
                externalId: body.externalId,
                config: body.config || {},
                token: "", // No oauth token for a basic domain 
                active: true,
            }
        });

        return NextResponse.json(newSource, { status: 201 });
    } catch (error: any) {
        console.error("Failed to create DOMAIN data source:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
