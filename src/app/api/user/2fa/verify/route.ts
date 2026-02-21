export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { verify } from "otplib";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
    const session = await auth();
    if (!session || !session.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { secret, token } = await req.json();

        if (!secret || !token) {
            return NextResponse.json({ error: "Secret and token are required" }, { status: 400 });
        }

        const result = await verify({ token, secret });

        if (!result.valid) {
            return NextResponse.json({ error: "Invalid verification code" }, { status: 400 });
        }

        // Enable 2FA for the user
        await prisma.user.update({
            where: { id: session.user.id },
            data: {
                twoFactorEnabled: true,
                twoFactorSecret: secret
            }
        });

        return NextResponse.json({ message: "Two-factor authentication enabled successfully" });
    } catch (error) {
        console.error("2FA verification error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
