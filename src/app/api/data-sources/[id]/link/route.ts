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
        const source = await (prisma as any).dataSource.update({
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
        await (prisma as any).dataSource.delete({
            where: { id: sourceId },
        });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
