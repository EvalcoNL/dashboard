import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // Public routes
    const publicRoutes = ["/login", "/api/auth"];
    const isPublic = publicRoutes.some((route) => pathname.startsWith(route));

    if (isPublic) return NextResponse.next();

    // Check JWT token (works in Edge runtime)
    const token = await getToken({
        req,
        secret: process.env.AUTH_SECRET,
    });

    if (!token) {
        console.log(`[Middleware] No token found for ${pathname}. Redirecting to login.`);
        // Also log if the cookie exists but token is null
        const sessionCookie = req.cookies.get("next-auth.session-token") || req.cookies.get("__Secure-next-auth.session-token");
        if (sessionCookie) {
            console.log(`[Middleware] Session cookie exists but token could not be decoded. Check AUTH_SECRET.`);
        }

        const loginUrl = new URL("/login", req.url);
        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl);
    }

    console.log(`[Middleware] Token found for ${pathname}. User: ${token.email}`);
    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
