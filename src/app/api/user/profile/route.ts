export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hash } from "bcryptjs";

export async function POST(req: Request) {
    const session = await auth();
    if (!session || !session.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { name, password } = await req.json();

        const data: any = {};
        if (name) data.name = name;
        if (password) {
            data.passwordHash = await hash(password, 12);
        }

        if (Object.keys(data).length === 0) {
            return NextResponse.json({ error: "No data provided" }, { status: 400 });
        }

        const updatedUser = await prisma.user.update({
            where: { id: session.user.id },
            data,
        });

        return NextResponse.json({
            message: "Profile updated successfully",
            user: { name: updatedUser.name }
        });
    } catch (error: any) {
        console.error("Profile update error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
