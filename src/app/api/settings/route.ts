import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const settings = await (prisma as any).globalSetting.findMany();
        const settingsMap = settings.reduce((acc: Record<string, string>, s: any) => {
            acc[s.key] = s.value;
            return acc;
        }, {} as Record<string, string>);

        return NextResponse.json(settingsMap);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { key, value } = body;

        if (!key) {
            return NextResponse.json({ error: "Missing key" }, { status: 400 });
        }

        const setting = await (prisma as any).globalSetting.upsert({
            where: { key },
            update: { value },
            create: { key, value },
        });

        return NextResponse.json(setting);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
