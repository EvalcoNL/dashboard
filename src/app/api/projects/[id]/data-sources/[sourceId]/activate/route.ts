export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string; sourceId: string }> }
) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: clientId, sourceId } = await params;

    try {
        const body = await req.json();
        const { externalId, name } = body;

        if (!externalId || !name) {
            return NextResponse.json({ error: "Missing externalId or name" }, { status: 400 });
        }

        const source = await prisma.dataSource.findUnique({
            where: { id: sourceId, clientId }
        });

        if (!source || !source.token) {
            return NextResponse.json({ error: "Invalid data source" }, { status: 400 });
        }

        // We can do another fetch here to get userinfo with the token to seed linkedAccounts if needed,
        // but the core request is just setting the selected ID and marking it active.

        await prisma.dataSource.update({
            where: { id: source.id },
            data: {
                externalId: externalId,
                name: name,
                category: "APP",
                active: true,
                linkedAt: new Date()
            }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Error activating data source:", error);
        return NextResponse.json({ error: error.message || "Failed to activate source" }, { status: 500 });
    }
}
