export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: sourceId } = await params;
    const body = await req.json();
    const { externalId, name, loginCustomerId } = body;

    if (!externalId) {
        return NextResponse.json({ error: "Missing externalId" }, { status: 400 });
    }

    try {
        // Get the pending source to know which client it belongs to
        const pendingSource = await prisma.dataSource.findUnique({
            where: { id: sourceId },
        });
        if (!pendingSource) {
            return NextResponse.json({ error: "Source not found" }, { status: 404 });
        }

        // Check if another source with the same externalId+type already exists for this client
        const existingSource = await prisma.dataSource.findFirst({
            where: {
                clientId: pendingSource.clientId,
                type: pendingSource.type,
                externalId,
                id: { not: sourceId }, // exclude the current pending source
            },
        });

        if (existingSource) {
            // Reconnect: update the existing source with the new token, then delete the pending record
            await prisma.dataSource.update({
                where: { id: existingSource.id },
                data: {
                    token: pendingSource.token,
                    active: true,
                    name: name || existingSource.name,
                    config: loginCustomerId ? { loginCustomerId } : (existingSource.config as object) || undefined,
                },
            });

            // Delete the pending source (no longer needed)
            await prisma.dataSource.delete({ where: { id: sourceId } });

            return NextResponse.json(existingSource);
        }

        // No existing source — finalize the pending one
        const source = await prisma.dataSource.update({
            where: { id: sourceId },
            data: {
                externalId,
                name: name || `Google Ads (${externalId})`,
                active: true,
                config: loginCustomerId ? { loginCustomerId } : undefined,
            },
        });

        return NextResponse.json(source);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: sourceId } = await params;

    try {
        await prisma.dataSource.delete({
            where: { id: sourceId },
        });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
