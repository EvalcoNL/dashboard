import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/db";
import { verify } from "otplib";
import { authConfig } from "@/auth.config";

class TwoFactorRequiredError extends CredentialsSignin {
    code = "TWO_FACTOR_REQUIRED";
}

class InvalidTwoFactorError extends CredentialsSignin {
    code = "INVALID_2FA_TOKEN";
}

const isDebug = process.env.NODE_ENV === "development" || process.env.DEBUG === "true";
const authLog = (...args: unknown[]) => isDebug && console.log("[Auth]", ...args);

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

                    if (!user) return null;

                    const isValid = await compare(
                        credentials.password as string,
                        user.passwordHash
                    );

                    if (!isValid) return null;

                    if (user.twoFactorEnabled) {
                        const token = credentials.twoFactorToken as string;
                        if (!token) throw new TwoFactorRequiredError();

                        const result = await verify({
                            token,
                            secret: user.twoFactorSecret as string,
                        });

                        if (!result.valid) throw new InvalidTwoFactorError();
                    }

                    authLog("Authorized:", credentials.email);
                    return {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        role: user.role,
                    };
                } catch (error: any) {
                    if (error instanceof CredentialsSignin) throw error;
                    console.error("[Auth] Authorize error:", error.message);
                    throw error;
                }
            },
        }),
    ],
    secret: process.env.AUTH_SECRET,
    debug: isDebug,
});
