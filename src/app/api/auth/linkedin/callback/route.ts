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
        const redirectUri = `${origin}/api/auth/linkedin/callback`;
        const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                grant_type: "authorization_code",
                code,
                client_id: process.env.LINKEDIN_CLIENT_ID || "",
                client_secret: process.env.LINKEDIN_CLIENT_SECRET || "",
                redirect_uri: redirectUri,
            }),
        });
        const tokenData = await tokenRes.json();
        if (tokenData.error) throw new Error(tokenData.error_description || tokenData.error);

        const accessToken = tokenData.access_token;

        // Fetch profile
        const profileRes = await fetch("https://api.linkedin.com/v2/me", {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        const profile = await profileRes.json();

        await prisma.dataSource.create({
            data: {
                clientId, type: "LINKEDIN", category: "APP",
                externalId: profile.id || "default",
                name: `LinkedIn - ${profile.localizedFirstName || ""} ${profile.localizedLastName || ""}`.trim(),
                token: accessToken, active: true,
            },
        });

        return NextResponse.redirect(`${origin}/dashboard/projects/${clientId}/data/sources`);
    } catch (error: any) {
        console.error("LinkedIn OAuth Error:", error);
        return NextResponse.redirect(`${origin}/dashboard/projects/${clientId}/data/sources?error=LinkedInLinkFailed`);
    }
}
