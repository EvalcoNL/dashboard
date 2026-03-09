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
        const client = await prisma.project.findUnique({ where: { id } });
        if (!client) {
            return NextResponse.json({ error: "Client not found" }, { status: 404 });
        }

        if (body.type !== "DOMAIN") {
            return NextResponse.json({ error: "Only DOMAIN type Data Sources can be created via this endpoint." }, { status: 400 });
        }

        if (!body.name || !body.externalId) {
            return NextResponse.json({ error: "Name and domain (externalId) are required." }, { status: 400 });
        }

        // Normalize domain: strip www. and lowercase
        const normalizedDomain = body.externalId.toLowerCase().replace(/^www\./, '');

        // Check if domain already exists for this client
        const existingSources = await prisma.dataSource.findMany({
            where: {
                projectId: id,
                type: "DOMAIN",
            }
        });

        const duplicate = existingSources.find(
            s => s.externalId.toLowerCase().replace(/^www\./, '') === normalizedDomain
        );

        if (duplicate) {
            return NextResponse.json({ error: "Dit domein is al toegevoegd aan dit project." }, { status: 409 });
        }

        const newSource = await prisma.dataSource.create({
            data: {
                projectId: id,
                type: "DOMAIN",
                name: normalizedDomain,
                externalId: normalizedDomain,
                config: body.config || {},
                token: "", // No oauth token for a basic domain 
                active: true,
            }
        });

        return NextResponse.json(newSource, { status: 201 });
    } catch (error: unknown) {
        console.error("Failed to create DOMAIN data source:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
