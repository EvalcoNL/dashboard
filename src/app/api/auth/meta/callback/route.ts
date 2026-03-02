export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

import { syncScheduler } from "@/lib/data-integration/sync-scheduler";

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
            ? `/dashboard/projects/${clientId}/data/sources?error=${error === "access_denied" ? "Koppeling geannuleerd" : "MetaLinkFailed"}`
            : "/dashboard";
        return NextResponse.redirect(`${origin}${redirectPath}`);
    }

    try {
        const redirectUri = `${origin}/api/auth/meta/callback`;

        // Exchange code for access token
        const tokenRes = await fetch(
            `https://graph.facebook.com/v19.0/oauth/access_token?` +
            new URLSearchParams({
                client_id: process.env.META_APP_ID || "",
                client_secret: process.env.META_APP_SECRET || "",
                redirect_uri: redirectUri,
                code,
            })
        );
        const tokenData = await tokenRes.json();
        if (tokenData.error) throw new Error(tokenData.error.message);

        // Exchange for long-lived token
        const longLivedRes = await fetch(
            `https://graph.facebook.com/v19.0/oauth/access_token?` +
            new URLSearchParams({
                grant_type: "fb_exchange_token",
                client_id: process.env.META_APP_ID || "",
                client_secret: process.env.META_APP_SECRET || "",
                fb_exchange_token: tokenData.access_token,
            })
        );
        const longLivedData = await longLivedRes.json();
        const accessToken = longLivedData.access_token || tokenData.access_token;

        // Fetch business accounts
        const bizRes = await fetch(
            "https://graph.facebook.com/v19.0/me/businesses?fields=id,name",
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const bizData = await bizRes.json();
        const biz = bizData.data?.[0];

        const newSource = await prisma.dataSource.create({
            data: {
                clientId, type: "META", category: "APP",
                externalId: biz?.id || "default",
                name: biz?.name || "Meta Business Suite",
                token: accessToken, active: true,
            },
        });

        // Auto-trigger first sync in background
        syncScheduler.scheduleNow(newSource.id).catch(err =>
            console.error(`[AutoSync] Failed to schedule sync for Meta source ${newSource.id}:`, err)
        );

        return NextResponse.redirect(`${origin}/dashboard/projects/${clientId}/data/sources`);
    } catch (error: any) {
        console.error("Meta OAuth Error:", error);
        return NextResponse.redirect(`${origin}/dashboard/projects/${clientId}/data/sources?error=MetaLinkFailed`);
    }
}
