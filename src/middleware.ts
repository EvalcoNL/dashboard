import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Initialize a lightweight NextAuth instance for the Edge Middleware.
// This ensures that the middleware does not import Node-only dependencies.
const { auth: middleware } = NextAuth(authConfig);

export default middleware((req) => {
    const { pathname } = req.nextUrl;

    // Public routes (don't require auth)
    const publicRoutes = ["/login", "/api/auth", "/api/cron", "/invite", "/forgot-password", "/reset-password"];
    const isPublic = publicRoutes.some((route) => pathname.startsWith(route));

    if (isPublic) return NextResponse.next();

    // Check if user is authenticated (req.auth is populated by the middleware wrapper)
    const session = req.auth;

    if (!session) {
        const loginUrl = new URL("/login", req.url);
        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl);
    }

    // Note: 2FA enforcement (redirecting users without 2FA to setup) is disabled
    // because the JWT twoFactorEnabled flag becomes stale after enabling 2FA,
    // causing infinite redirect loops. 2FA remains available as an optional feature
    // in dashboard settings. To enforce, implement a session refresh mechanism.

    return NextResponse.next();
});

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
