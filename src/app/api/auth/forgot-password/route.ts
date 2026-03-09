import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/services/email-service";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
    // Rate limit: 5 forgot-password requests per minute
    const rateLimited = checkRateLimit(`forgot-pw:${getClientIp(req)}`, 5, 60_000);
    if (rateLimited) return rateLimited;

    try {
        const { email } = await req.json();

        if (!email) {
            return NextResponse.json({ error: "E-mailadres is verplicht" }, { status: 400 });
        }


        const user = await prisma.user.findUnique({
            where: { email },
        });

        // Even if user doesn't exist, we return success to prevent email enumeration
        if (!user) {
            return NextResponse.json({ success: true });
        }

        // Generate a random token
        const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now

        // Delete any existing tokens for this email
        await prisma.passwordResetToken.deleteMany({
            where: { email },
        });

        // Save new token
        await prisma.passwordResetToken.create({
            data: {
                email,
                token,
                expiresAt,
            },
        });

        // Send email
        await sendPasswordResetEmail(email, token);

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error("Forgot password API error:", error);
        if (error instanceof Error) {
            console.error("[Stack Trace]:", error.stack);
        }

        return NextResponse.json({ error: "Interne serverfout bij het verwerken van de aanvraag." }, { status: 500 });
    }
}
