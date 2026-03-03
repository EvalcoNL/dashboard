export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/db";
import { rateLimitLogin } from "@/lib/rate-limit";

/**
 * Pre-login check: validates email+password and returns whether 2FA is required.
 * This avoids relying on NextAuth error codes for the two-step login flow.
 * Rate-limited to prevent brute-force attacks (5 attempts per minute per IP).
 */
export async function POST(req: Request) {
    // Rate limit: same as login (5 per minute per IP)
    const rateLimited = rateLimitLogin(req);
    if (rateLimited) return rateLimited;

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
