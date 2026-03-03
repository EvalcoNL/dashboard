import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/db";
import { verify } from "otplib";
import { authConfig } from "@/auth.config";
import { decrypt } from "@/lib/encryption";
import { auditLog } from "@/lib/audit";

class TwoFactorRequiredError extends CredentialsSignin {
    code = "TWO_FACTOR_REQUIRED";
}

class InvalidTwoFactorError extends CredentialsSignin {
    code = "INVALID_2FA_TOKEN";
}

const isDebug = process.env.NODE_ENV === "development" || process.env.DEBUG === "true";
const authLog = (...args: unknown[]) => isDebug && console.log("[Auth]", ...args);

/**
 * Try to validate a backup code against stored hashed codes.
 * If valid, consumes the code (removes it from DB) and returns true.
 */
async function tryBackupCode(userId: string, token: string, storedCodes: string[]): Promise<boolean> {
    for (let i = 0; i < storedCodes.length; i++) {
        const isMatch = await compare(token.toUpperCase(), storedCodes[i]);
        if (isMatch) {
            // Remove the used backup code
            const remainingCodes = [...storedCodes];
            remainingCodes.splice(i, 1);
            await prisma.user.update({
                where: { id: userId },
                data: { backupCodes: remainingCodes } as any,
            });
            authLog("Backup code used, remaining:", remainingCodes.length);
            // Audit log backup code usage
            auditLog({ userId, action: 'BACKUP_CODE_USED', details: `${remainingCodes.length} codes remaining` });
            return true;
        }
    }
    return false;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
    ...authConfig,
    providers: [
        Credentials({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
                twoFactorToken: { label: "2FA Token", type: "text" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null;
                }

                try {
                    const user = await prisma.user.findUnique({
                        where: { email: credentials.email as string },
                    });

                    if (!user) {
                        auditLog({ action: 'LOGIN_FAILED', details: `Unknown email: ${credentials.email}` });
                        return null;
                    }

                    const isValid = await compare(
                        credentials.password as string,
                        user.passwordHash
                    );

                    if (!isValid) {
                        auditLog({ userId: user.id, action: 'LOGIN_FAILED', details: 'Invalid password' });
                        return null;
                    }

                    if (user.twoFactorEnabled) {
                        const token = credentials.twoFactorToken as string;
                        if (!token) throw new TwoFactorRequiredError();

                        try {
                            // Decrypt the 2FA secret (backward compatible with plain text)
                            const secret = decrypt(user.twoFactorSecret as string);

                            // First try TOTP verification
                            const result = await verify({ token, secret });

                            if (!result.valid) {
                                // If TOTP fails, try backup code
                                const backupCodes = ((user as any).backupCodes as string[]) || [];
                                if (backupCodes.length > 0) {
                                    const backupValid = await tryBackupCode(user.id, token, backupCodes);
                                    if (!backupValid) throw new InvalidTwoFactorError();
                                } else {
                                    throw new InvalidTwoFactorError();
                                }
                            }
                        } catch (e) {
                            if (e instanceof CredentialsSignin) throw e;
                            console.error("[Auth] 2FA verification error:", e);
                            throw new InvalidTwoFactorError();
                        }
                    }

                    authLog("Authorized:", credentials.email);
                    auditLog({ userId: user.id, action: 'LOGIN', details: user.email });
                    return {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        role: user.role,
                        twoFactorEnabled: user.twoFactorEnabled,
                    };
                } catch (error: any) {
                    if (error instanceof CredentialsSignin) throw error;
                    console.error("[Auth] Authorize error:", error.message);
                    return null;
                }
            },
        }),
    ],
    secret: process.env.AUTH_SECRET,
    debug: isDebug,
});
