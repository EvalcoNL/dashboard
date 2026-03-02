import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hash } from "bcryptjs";

export async function POST(req: NextRequest) {
    try {
        const { token, password } = await req.json();

        if (!token || !password) {
            return NextResponse.json({ error: "Token en wachtwoord zijn verplicht" }, { status: 400 });
        }

        const resetToken = await (prisma as any).passwordResetToken.findUnique({
            where: { token },
        });

        if (!resetToken) {
            return NextResponse.json({ error: "Ongeldige token" }, { status: 400 });
        }

        if (resetToken.expiresAt < new Date()) {
            await (prisma as any).passwordResetToken.delete({ where: { token } });
            return NextResponse.json({ error: "Token is verlopen" }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { email: resetToken.email },
        });

        if (!user) {
            return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 404 });
        }

        // Hash the new password
        const passwordHash = await hash(password, 12);

        // Update user password and delete the token
        await prisma.$transaction([
            prisma.user.update({
                where: { email: resetToken.email },
                data: { passwordHash },
            }),
            (prisma as any).passwordResetToken.delete({
                where: { token },
            }),
        ]);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Reset password API error:", error);
        return NextResponse.json({ error: "Interne serverfout" }, { status: 500 });
    }
}
