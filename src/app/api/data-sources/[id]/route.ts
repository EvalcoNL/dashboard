import { prisma } from "@/lib/db";
import { requireDataSourceAccess } from "@/lib/api-guard";
import { NextResponse } from "next/server";

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const [, authError] = await requireDataSourceAccess(id);
        if (authError) return authError;

        const body = await request.json();

        // Ensure we're only updating allowed fields
        const { name, externalId, config, active } = body;

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
            { error: "Failed to update data source" },
            { status: 500 }
        );
    }
}

export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const [, authError] = await requireDataSourceAccess(id);
        if (authError) return authError;

        await prisma.dataSource.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Failed to delete data source:", error);
        return NextResponse.json(
            { error: "Failed to delete data source" },
            { status: 500 }
        );
    }
}

