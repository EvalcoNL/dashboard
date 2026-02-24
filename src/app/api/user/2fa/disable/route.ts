export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST() {
    const session = await auth();
    if (!session || !session.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        await prisma.user.update({
            where: { id: session.user.id },
            data: {
                twoFactorEnabled: false,
                twoFactorSecret: null
            }
        });

        return NextResponse.json({ message: "Two-factor authentication disabled successfully" });
    } catch (error: any) {
        console.error("2FA disable error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
