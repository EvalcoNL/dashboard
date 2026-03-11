import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Initialize a lightweight NextAuth instance for the Edge Middleware.
// This ensures that the middleware does not import Node-only dependencies.
const { auth: middleware } = NextAuth(authConfig);

export default middleware((req) => {
    const { pathname } = req.nextUrl;

    // Public routes (don't require auth)
    const publicRoutes = ["/login", "/api/auth", "/api/cron", "/api/data-integration/sync/cron", "/api/health", "/invite", "/forgot-password", "/reset-password"];
    const isPublic = publicRoutes.some((route) => pathname.startsWith(route));

    if (isPublic) return NextResponse.next();

    // Check if user is authenticated (req.auth is populated by the middleware wrapper)
    const session = req.auth;

    if (!session) {
        const loginUrl = new URL("/login", req.url);
        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl);
    }

    // 2FA enforcement: redirect users without 2FA to setup page
    // The JWT callback in auth.config.ts refreshes twoFactorEnabled from DB
    // to prevent stale JWT issues after enabling 2FA
    const twoFactorEnabled = (session.user as any)?.twoFactorEnabled;
    const is2FASetupPage = pathname.startsWith("/security/2fa-setup");
    const isSettingsPage = pathname.startsWith("/settings");
    const isApiRoute = pathname.startsWith("/api/");

    if (!twoFactorEnabled && !is2FASetupPage && !isSettingsPage && !isApiRoute) {
        return NextResponse.redirect(new URL("/security/2fa-setup", req.url));
    }

    return NextResponse.next();
});

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|images/).*)"],
};
