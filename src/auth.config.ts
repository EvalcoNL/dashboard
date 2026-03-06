import type { NextAuthConfig } from "next-auth";

export const authConfig = {
    session: { strategy: "jwt" },
    pages: {
        signIn: "/login",
    },
    callbacks: {
        async jwt({ token, user, trigger }: any) {
            if (user) {
                token.role = user.role;
                token.id = user.id;
                token.twoFactorEnabled = user.twoFactorEnabled ?? false;
            }

            // On session refresh (not initial sign-in), fetch fresh twoFactorEnabled from DB
            // This prevents stale JWT after enabling/disabling 2FA
            if (!user && token.id && trigger !== "signIn") {
                try {
                    // Dynamic import to avoid Edge bundling issues
                    const { prisma } = await import("@/lib/db");
                    const dbUser = await prisma.user.findUnique({
                        where: { id: token.id as string },
                        select: { twoFactorEnabled: true, role: true, name: true, email: true },
                    });
                    if (dbUser) {
                        token.twoFactorEnabled = dbUser.twoFactorEnabled;
                        token.role = dbUser.role;
                        token.name = dbUser.name;
                        token.email = dbUser.email;
                    }
                } catch {
                    // Silently fail — keep existing token values
                }
            }

            return token;
        },
        async session({ session, token }: any) {
            if (session.user) {
                session.user.role = token.role as string;
                session.user.id = token.id as string;
                session.user.twoFactorEnabled = token.twoFactorEnabled as boolean;
                if (token.name) session.user.name = token.name as string;
                if (token.email) session.user.email = token.email as string;
            }
            return session;
        },
    },
    providers: [], // Empty array, to be populated in lib/auth.ts
    trustHost: true,
    secret: process.env.AUTH_SECRET,
} satisfies NextAuthConfig;
