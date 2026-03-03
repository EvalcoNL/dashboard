import type { NextAuthConfig } from "next-auth";

export const authConfig = {
    session: { strategy: "jwt" },
    pages: {
        signIn: "/login",
    },
    callbacks: {
        async jwt({ token, user }: any) {
            if (user) {
                token.role = user.role;
                token.id = user.id;
                token.twoFactorEnabled = user.twoFactorEnabled ?? false;
            }
            return token;
        },
        async session({ session, token }: any) {
            if (session.user) {
                session.user.role = token.role as string;
                session.user.id = token.id as string;
                session.user.twoFactorEnabled = token.twoFactorEnabled as boolean;
            }
            return session;
        },
    },
    providers: [], // Empty array, to be populated in lib/auth.ts
    trustHost: true,
    secret: process.env.AUTH_SECRET,
} satisfies NextAuthConfig;
