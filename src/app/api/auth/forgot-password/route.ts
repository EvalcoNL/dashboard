import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/services/email-service";

export async function POST(req: NextRequest) {
    try {
        const { email } = await req.json();

        if (!email) {
            return NextResponse.json({ error: "E-mailadres is verplicht" }, { status: 400 });
        }

        console.log("[ForgotPassword] RESEND_API_KEY present:", !!process.env.RESEND_API_KEY);

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
        await (prisma as any).passwordResetToken.deleteMany({
            where: { email },
        });

        // Save new token
        await (prisma as any).passwordResetToken.create({
            data: {
                email,
                token,
                expiresAt,
            },
        });

        // Send email
        await sendPasswordResetEmail(email, token);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Forgot password API error:", error);
        // Log more details to server console
        if (error.code) console.error("[Prisma Error Code]:", error.code);
        if (error.meta) console.error("[Prisma Error Meta]:", error.meta);
        if (error.stack) console.error("[Stack Trace]:", error.stack);

        return NextResponse.json({ error: "Interne serverfout bij het verwerken van de aanvraag." }, { status: 500 });
    }
}
