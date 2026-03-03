export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { verify } from "otplib";
import { prisma } from "@/lib/db";
import { randomBytes } from "crypto";
import { hash } from "bcryptjs";
import { encrypt } from "@/lib/encryption";
import { auditLog } from "@/lib/audit";

/**
 * Generate 10 backup codes.
 * Returns plaintext codes (to show to user) and hashed codes (to store in DB).
 */
async function generateBackupCodes(): Promise<{ plainCodes: string[]; hashedCodes: string[] }> {
    const plainCodes: string[] = [];
    const hashedCodes: string[] = [];

    for (let i = 0; i < 10; i++) {
        // Generate 8-character alphanumeric code in format XXXX-XXXX
        const code = randomBytes(4).toString('hex').toUpperCase();
        const formatted = `${code.slice(0, 4)}-${code.slice(4, 8)}`;
        plainCodes.push(formatted);
        hashedCodes.push(await hash(formatted, 10));
    }

    return { plainCodes, hashedCodes };
}

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

        // Generate backup codes
        const { plainCodes, hashedCodes } = await generateBackupCodes();

        // Encrypt the 2FA secret and enable 2FA
        const encryptedSecret = encrypt(secret);

        await prisma.user.update({
            where: { id: session.user.id },
            data: {
                twoFactorEnabled: true,
                twoFactorSecret: encryptedSecret,
                backupCodes: hashedCodes,
            }
        });

        auditLog({ userId: session.user.id, action: '2FA_ENABLED' });

        return NextResponse.json({
            message: "Two-factor authentication enabled successfully",
            backupCodes: plainCodes,
        });
    } catch (error: any) {
        console.error("2FA verification error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
