import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hash } from "bcryptjs";
import { randomUUID } from "crypto";
import { sendVerificationEmail } from "@/lib/services/email-verification";
import { rateLimitLogin } from "@/lib/rate-limit";

export async function POST(req: Request) {
    // Rate limit: 5 registration attempts per minute per IP
    const rateLimited = rateLimitLogin(req);
    if (rateLimited) return rateLimited;

    try {
        const { name, email, password } = await req.json();

        if (!name || !email || !password) {
            return NextResponse.json(
                { error: "Vul alle velden in." },
                { status: 400 }
            );
        }

        // Validate name length
        if (typeof name !== 'string' || name.length > 100) {
            return NextResponse.json(
                { error: "Naam mag maximaal 100 karakters zijn." },
                { status: 400 }
            );
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (typeof email !== 'string' || !emailRegex.test(email)) {
            return NextResponse.json(
                { error: "Ongeldig e-mailadres." },
                { status: 400 }
            );
        }

        // Validate password strength
        if (typeof password !== 'string' || password.length < 8) {
            return NextResponse.json(
                { error: "Wachtwoord moet minimaal 8 karakters zijn." },
                { status: 400 }
            );
        }

        if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
            return NextResponse.json(
                { error: "Wachtwoord moet minimaal één hoofdletter, één kleine letter en één cijfer bevatten." },
                { status: 400 }
            );
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Check if user already exists
        const existing = await prisma.user.findUnique({
            where: { email: normalizedEmail },
        });

        if (existing) {
            return NextResponse.json(
                { error: "Er bestaat al een account met dit e-mailadres." },
                { status: 409 }
            );
        }

        // Create user
        const passwordHash = await hash(password, 12);
        await (prisma.user.create as any)({
            data: {
                name,
                email: normalizedEmail,
                passwordHash,
                role: "USER",
                emailVerified: false,
            },
        });

        // Create verification token (24h expiry)
        const token = randomUUID();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        await (prisma as any).emailVerificationToken.create({
            data: {
                email: normalizedEmail,
                token,
                expiresAt,
            },
        });

        // Send verification email
        await sendVerificationEmail(normalizedEmail, token);

        return NextResponse.json({
            success: true,
            message: "Account aangemaakt. Controleer je e-mail voor de verificatie link.",
        });
    } catch (error: any) {
        console.error("[POST /api/auth/register]", error);
        return NextResponse.json(
            { error: "Er is een fout opgetreden. Probeer het opnieuw." },
            { status: 500 }
        );
    }
}
