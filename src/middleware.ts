import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Initialize a lightweight NextAuth instance for the Edge Middleware.
// This ensures that the middleware does not import Node-only dependencies.
const { auth: middleware } = NextAuth(authConfig);

export default middleware((req) => {
    const { pathname } = req.nextUrl;

    // Public routes (don't require auth)
    const publicRoutes = ["/login", "/api/auth", "/api/cron", "/invite"];
    const isPublic = publicRoutes.some((route) => pathname.startsWith(route));

    if (isPublic) return NextResponse.next();

    // Check if user is authenticated (req.auth is populated by the middleware wrapper)
    const session = req.auth;

    if (!session) {
        const loginUrl = new URL("/login", req.url);
        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
});

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
