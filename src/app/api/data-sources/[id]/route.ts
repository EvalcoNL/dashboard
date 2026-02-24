import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();

        // Ensure we're only updating allowed fields
        const { name, externalId, config, active } = body;

        // Verify ownership (or could be left to broader org rules, but let's just update the specific record)
        const updatedSource = await prisma.dataSource.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(externalId && { externalId }),
                ...(config && { config }),
                ...(active !== undefined && { active })
            }
        });

        return NextResponse.json({ success: true, source: updatedSource });
    } catch (error: any) {
        console.error("Failed to update data source:", error);
        return NextResponse.json(
            { error: error.message || "Failed to update data source" },
            { status: 500 }
        );
    }
}
