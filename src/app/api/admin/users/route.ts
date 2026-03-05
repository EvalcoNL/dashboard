import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/api-guard";
import bcrypt from "bcryptjs";

/**
 * POST — Create a new user (admin only)
 */
export async function POST(req: NextRequest) {
    try {
        const [, authError] = await requireAdmin();
        if (authError) return authError;

        const { name, email, password, role } = await req.json();

        if (!name || !email || !password) {
            return NextResponse.json(
                { error: "Naam, e-mail en wachtwoord zijn verplicht." },
                { status: 400 }
            );
        }

        // Check for existing user
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return NextResponse.json(
                { error: "Er bestaat al een gebruiker met dit e-mailadres." },
                { status: 409 }
            );
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const newUser = await prisma.user.create({
            data: {
                name,
                email,
                passwordHash,
                role: role || "USER",
                emailVerified: true, // Admin-created users are pre-verified
            },
            include: {
                clients: { select: { id: true, name: true } }
            }
        });

        return NextResponse.json(newUser, { status: 201 });
    } catch (error) {
        console.error("[AdminUserCreate] Error:", error);
        return NextResponse.json({ error: "Interne serverfout" }, { status: 500 });
    }
}
