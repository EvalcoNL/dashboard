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

console.log("[Auth] Initializing NextAuth. AUTH_SECRET exists:", !!process.env.AUTH_SECRET);

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
                    console.log("[Auth] Missing email or password");
                    return null;
                }

                console.log("[Auth] Authorizing user:", credentials.email);
                try {
                    const user = await prisma.user.findUnique({
                        where: { email: credentials.email as string },
                    });

                    if (!user) {
                        console.log("[Auth] User not found:", credentials.email);
                        return null;
                    }

                    const isValid = await compare(
                        credentials.password as string,
                        user.passwordHash
                    );

                    if (!isValid) {
                        console.log("[Auth] Invalid password for user:", credentials.email);
                        return null;
                    }

                    if (user.twoFactorEnabled) {
                        const token = credentials.twoFactorToken as string;
                        if (!token) {
                            console.log("[Auth] 2FA required for user:", credentials.email);
                            throw new TwoFactorRequiredError();
                        }

                        const result = await verify({
                            token,
                            secret: user.twoFactorSecret as string,
                        });

                        if (!result.valid) {
                            console.log("[Auth] Invalid 2FA token for user:", credentials.email);
                            throw new InvalidTwoFactorError();
                        }
                    }

                    console.log("[Auth] Authorization successful for:", credentials.email);
                    return {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        role: user.role,
                    };
                } catch (error) {
                    console.error("[Auth] Authorize error:", error);
                    throw error;
                }
            },
        }),
    ],
    secret: process.env.AUTH_SECRET,
    debug: process.env.NODE_ENV === "development" || process.env.DEBUG === "true",
});
