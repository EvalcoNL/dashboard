export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/db";

/**
 * Pre-login check: validates email+password and returns whether 2FA is required.
 * This avoids relying on NextAuth error codes for the two-step login flow.
 */
export async function POST(req: Request) {
    try {
        const { email, password } = await req.json();

        if (!email || !password) {
            return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { email },
            select: { passwordHash: true, twoFactorEnabled: true },
        });

        if (!user) {
            return NextResponse.json({ valid: false });
        }

        const isValid = await compare(password, user.passwordHash);
        if (!isValid) {
            return NextResponse.json({ valid: false });
        }

        return NextResponse.json({
            valid: true,
            twoFactorRequired: user.twoFactorEnabled,
        });
    } catch {
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
