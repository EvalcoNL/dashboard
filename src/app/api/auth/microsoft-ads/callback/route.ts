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
    if (!code || !clientId) return NextResponse.json({ error: "Missing code or state" }, { status: 400 });

    const origin = new URL(req.url).origin;

    try {
        const redirectUri = `${origin}/api/auth/microsoft-ads/callback`;
        const tokenRes = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                client_id: process.env.MICROSOFT_ADS_CLIENT_ID || "",
                client_secret: process.env.MICROSOFT_ADS_CLIENT_SECRET || "",
                grant_type: "authorization_code",
                code,
                redirect_uri: redirectUri,
            }),
        });
        const tokenData = await tokenRes.json();
        if (tokenData.error) throw new Error(tokenData.error_description || tokenData.error);

        const refreshToken = tokenData.refresh_token || tokenData.access_token;

        await prisma.dataSource.create({
            data: {
                clientId, type: "MICROSOFT_ADS", category: "APP",
                externalId: "microsoft-ads",
                name: "Microsoft Ads",
                token: refreshToken, active: true,
            },
        });

        return NextResponse.redirect(`${origin}/dashboard/projects/${clientId}/data/sources`);
    } catch (error: any) {
        console.error("Microsoft Ads OAuth Error:", error);
        return NextResponse.redirect(`${origin}/dashboard/projects/${clientId}/data/sources?error=MSAdsLinkFailed`);
    }
}
