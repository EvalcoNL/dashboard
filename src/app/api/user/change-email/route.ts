export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { randomBytes } from "crypto";
import { sendEmailChangeVerification } from "@/lib/services/email-service";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: Request) {
    // Rate limit: 3 email change requests per minute
    const rateLimited = checkRateLimit(`change-email:${getClientIp(req)}`, 3, 60_000);
    if (rateLimited) return rateLimited;

    const session = await auth();
    if (!session || !session.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { email } = await req.json();

        if (!email || typeof email !== "string") {
            return NextResponse.json({ error: "E-mailadres is verplicht" }, { status: 400 });
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json({ error: "Ongeldig e-mailadres" }, { status: 400 });
        }

        // Check if email is the same as current
        const currentUser = await prisma.user.findUnique({ where: { id: session.user.id } });
        if (currentUser?.email === email) {
            return NextResponse.json({ error: "Dit is al je huidige e-mailadres" }, { status: 400 });
        }

        // Check if email is already in use by another user
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return NextResponse.json({ error: "Dit e-mailadres is al in gebruik" }, { status: 400 });
        }

        // Delete any existing email change tokens for this user
        await prisma.emailVerificationToken.deleteMany({
            where: { email: `${session.user.id}:${email}` },
        });

        // Create verification token
        const token = randomBytes(32).toString("hex");
        await prisma.emailVerificationToken.create({
            data: {
                email: `${session.user.id}:${email}`, // Store userId:newEmail as key
                token,
                expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
            },
        });

        // Send verification email to the NEW email address
        const result = await sendEmailChangeVerification(email, token);

        if (!result.success) {
            console.error("[EmailChange] Failed to send verification email:", result.error);
            return NextResponse.json({ error: "Verificatie-e-mail kon niet worden verzonden" }, { status: 500 });
        }

        return NextResponse.json({
            message: "Verificatie-e-mail verzonden naar " + email,
        });
    } catch (error: any) {
        console.error("[EmailChange] Error:", error);
        return NextResponse.json({ error: "Er is een fout opgetreden" }, { status: 500 });
    }
}
