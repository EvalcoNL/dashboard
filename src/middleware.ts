import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // Public routes (don't require auth)
    const publicRoutes = ["/login", "/api/auth"];
    const isPublic = publicRoutes.some((route) => pathname.startsWith(route));

    if (isPublic) return NextResponse.next();

    // Use Auth.js v5 auth() helper - it handles session/cookie detection automatically
    const session = await auth();

    if (!session) {
        console.log(`[Middleware] No session found for ${pathname}. Redirecting to login.`);

        // Debug: check for the presence of session cookies (Auth.js v5 prefix is authjs)
        const hasSessionCookie = req.cookies.has("authjs.session-token") ||
            req.cookies.has("__Secure-authjs.session-token") ||
            req.cookies.has("next-auth.session-token") ||
            req.cookies.has("__Secure-next-auth.session-token");

        if (hasSessionCookie) {
            console.log(`[Middleware] Session cookie exists but auth() returned null. Possible AUTH_SECRET mismatch or environmental issue.`);
        }

        const loginUrl = new URL("/login", req.url);
        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl);
    }

    console.log(`[Middleware] Session active for ${pathname}. User: ${session.user?.email}`);
    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
