export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { encrypt } from "@/lib/encryption";

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const clientId = searchParams.get("state");
    const error = searchParams.get("error");

    const origin = process.env.NEXTAUTH_URL || new URL(req.url).origin;

    if (error || !code || !clientId) {
        const redirectPath = clientId
            ? `/dashboard/projects/${clientId}/data/sources?error=${error === "access_denied" ? "Koppeling geannuleerd" : "PinterestLinkFailed"}`
            : "/dashboard";
        return NextResponse.redirect(`${origin}${redirectPath}`);
    }

    try {
        const redirectUri = `${origin}/api/auth/pinterest/callback`;
        const basicAuth = Buffer.from(`${process.env.PINTEREST_APP_ID}:${process.env.PINTEREST_APP_SECRET}`).toString("base64");

        const tokenRes = await fetch("https://api.pinterest.com/v5/oauth/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Authorization: `Basic ${basicAuth}`,
            },
            body: new URLSearchParams({
                grant_type: "authorization_code",
                code,
                redirect_uri: redirectUri,
            }),
        });
        const tokenData = await tokenRes.json();
        if (tokenData.error) throw new Error(tokenData.message || tokenData.error);

        const accessToken = tokenData.access_token;

        // Fetch user account
        const userRes = await fetch("https://api.pinterest.com/v5/user_account", {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        const userData = await userRes.json();

        await prisma.dataSource.create({
            data: {
                clientId, type: "PINTEREST", category: "APP",
                externalId: userData.username || "default",
                name: `Pinterest - ${userData.username || "Account"}`,
                token: encrypt(accessToken), active: true,
            },
        });

        return NextResponse.redirect(`${origin}/dashboard/projects/${clientId}/data/sources`);
    } catch (error: any) {
        console.error("Pinterest OAuth Error:", error);
        return NextResponse.redirect(`${origin}/dashboard/projects/${clientId}/data/sources?error=PinterestLinkFailed`);
    }
}
