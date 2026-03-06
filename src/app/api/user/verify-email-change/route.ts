export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const token = url.searchParams.get("token");

        if (!token) {
            return redirectWithMessage("/settings", "error", "Ongeldige verificatielink");
        }

        // Find the token
        const verificationToken = await prisma.emailVerificationToken.findUnique({
            where: { token },
        });

        if (!verificationToken) {
            return redirectWithMessage("/settings", "error", "Verificatielink is ongeldig of al gebruikt");
        }

        // Check expiry
        if (verificationToken.expiresAt < new Date()) {
            await prisma.emailVerificationToken.delete({ where: { id: verificationToken.id } });
            return redirectWithMessage("/settings", "error", "Verificatielink is verlopen");
        }

        // Parse userId and newEmail from the stored email field (format: "userId:newEmail")
        const [userId, newEmail] = verificationToken.email.split(":");
        if (!userId || !newEmail) {
            await prisma.emailVerificationToken.delete({ where: { id: verificationToken.id } });
            return redirectWithMessage("/settings", "error", "Ongeldige verificatiedata");
        }

        // Check if the new email is still available
        const existingUser = await prisma.user.findUnique({ where: { email: newEmail } });
        if (existingUser) {
            await prisma.emailVerificationToken.delete({ where: { id: verificationToken.id } });
            return redirectWithMessage("/settings", "error", "Dit e-mailadres is inmiddels al in gebruik");
        }

        // Update the user's email
        await prisma.user.update({
            where: { id: userId },
            data: { email: newEmail },
        });

        // Delete the token
        await prisma.emailVerificationToken.delete({ where: { id: verificationToken.id } });

        return redirectWithMessage("/settings", "success", "E-mailadres succesvol gewijzigd");
    } catch (error: any) {
        console.error("[VerifyEmailChange] Error:", error);
        return redirectWithMessage("/settings", "error", "Er is een fout opgetreden");
    }
}

function redirectWithMessage(path: string, type: string, message: string) {
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const url = new URL(path, baseUrl);
    url.searchParams.set("email_status", type);
    url.searchParams.set("email_message", message);
    return NextResponse.redirect(url);
}
