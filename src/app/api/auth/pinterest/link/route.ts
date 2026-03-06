export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { encodeOAuthState } from "@/lib/oauth-state";

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    if (!projectId) return NextResponse.json({ error: "Missing projectId" }, { status: 400 });

    if (!process.env.PINTEREST_APP_ID) {
        return NextResponse.json({ error: "Pinterest credentials not configured" }, { status: 500 });
    }

    const origin = process.env.NEXTAUTH_URL || new URL(req.url).origin;
    const redirectUri = `${origin}/api/auth/pinterest/callback`;

    const scopes = ["boards:read", "pins:read", "user_accounts:read", "ads:read"].join(",");

    const qs = new URLSearchParams({
        project_id: process.env.PINTEREST_APP_ID,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: scopes,
        state: encodeOAuthState(projectId),
    });

    return NextResponse.redirect(`https://www.pinterest.com/oauth/?${qs.toString()}`);
}
