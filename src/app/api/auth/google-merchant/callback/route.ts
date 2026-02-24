export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const clientId = searchParams.get("state");

    if (!code || !clientId) {
        return NextResponse.json({ error: "Missing code or state" }, { status: 400 });
    }

    try {
        const origin = new URL(req.url).origin;
        const redirectUri = `${origin}/api/auth/google-merchant/callback`;

        // Exchange code for tokens
        const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                code,
                client_id: process.env.GOOGLE_OAUTH_CLIENT_ID || "",
                client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || "",
                redirect_uri: redirectUri,
                grant_type: "authorization_code",
            }),
        });

        const tokenData = await tokenResponse.json();
        if (tokenData.error) throw new Error(tokenData.error_description || tokenData.error);

        const refreshToken = tokenData.refresh_token;

        if (!refreshToken) {
            return NextResponse.redirect(`${origin}/dashboard/projects/${clientId}/data/sources?error=NoRefreshToken`);
        }

        const pendingSource = await prisma.dataSource.create({
            data: {
                clientId: clientId,
                type: "GOOGLE_MERCHANT",
                category: "APP",
                externalId: "PENDING",
                token: refreshToken,
                active: false,
                name: "Pending Google Merchant Center Link"
            }
        });

        // Redirect to selection UI
        return NextResponse.redirect(`${origin}/dashboard/projects/${clientId}/link-merchant?sourceId=${pendingSource.id}`);
    } catch (error: any) {
        console.error("Google Merchant OAuth Callback Error:", error);
        return NextResponse.redirect(`${origin}/dashboard/projects/${clientId}/data/sources?error=MerchantLinkFailed`);
    }
}
