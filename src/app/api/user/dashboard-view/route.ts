import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(req: NextRequest) {
    const session = await auth();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { dashboardView } = await req.json();

        if (!["cards", "table"].includes(dashboardView)) {
            return NextResponse.json({ error: "Invalid view type" }, { status: 400 });
        }

        await prisma.user.update({
            where: { id: session.user.id },
            data: { dashboardView },
        });

        return NextResponse.json({ ok: true });
    } catch (error: unknown) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Onbekende fout" }, { status: 500 });
    }
}
