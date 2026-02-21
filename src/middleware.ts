import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Initialize a lightweight NextAuth instance for the Edge Middleware.
// This ensures that the middleware does not import Node-only dependencies.
const { auth: middleware } = NextAuth(authConfig);

export default middleware((req) => {
    const { pathname } = req.nextUrl;

    // Public routes (don't require auth)
    const publicRoutes = ["/login", "/api/auth"];
    const isPublic = publicRoutes.some((route) => pathname.startsWith(route));

    if (isPublic) return NextResponse.next();

    // Check if user is authenticated (req.auth is populated by the middleware wrapper)
    const session = req.auth;

    if (!session) {
        console.log(`[Middleware] No session found for ${pathname}. Redirecting to login.`);

        // Debug: check for the presence of session cookies
        const hasSessionCookie = req.cookies.has("authjs.session-token") ||
            req.cookies.has("__Secure-authjs.session-token") ||
            req.cookies.has("next-auth.session-token") ||
            req.cookies.has("__Secure-next-auth.session-token");

        if (hasSessionCookie) {
            console.log(`[Middleware] Session cookie exists but session is null. Check AUTH_SECRET.`);
        }

        const loginUrl = new URL("/login", req.url);
        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl);
    }

    console.log(`[Middleware] Session active for ${pathname}. User: ${session.user?.email}`);
    return NextResponse.next();
});

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
