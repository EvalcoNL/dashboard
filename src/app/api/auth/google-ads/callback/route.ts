export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { googleAdsService } from "@/lib/integrations/google-ads";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const clientId = searchParams.get("state"); // This is our internal Client.id passed in 'state'

    if (!code || !clientId) {
        return NextResponse.json({ error: "Missing code or state" }, { status: 400 });
    }

    try {
        const origin = new URL(req.url).origin;
        const redirectUri = `${origin}/api/auth/google-ads/callback`;

        console.log(`[OAuth] Processing callback with redirect_uri: ${redirectUri}`);

        const refreshToken = await googleAdsService.getRefreshToken(code, redirectUri);

        // Fetch accessible customers
        const customers = await googleAdsService.listAccessibleCustomers(refreshToken);

        if (!customers || (customers as any).length === 0) {
            return NextResponse.json({ error: "No accessible Google Ads accounts found" }, { status: 404 });
        }

        // Always redirect to selection page to allow user to pick account and see what they are linking
        // We'll pass the refreshToken securely? No, let's create a pending DataSource
        const pendingSource = await (prisma as any).dataSource.create({
            data: {
                clientId: clientId,
                type: "GOOGLE_ADS",
                category: "APP",
                externalId: "PENDING",
                token: refreshToken,
                active: false,
                name: "Pending Google Ads Link"
            }
        });

        // Redirect to selection UI
        return NextResponse.redirect(`${origin}/dashboard/projects/${clientId}/link?sourceId=${pendingSource.id}`);
    } catch (error: any) {
        console.error("OAuth Callback Error:", error);
        return NextResponse.json({ error: error.message || "Failed to link Google Ads" }, { status: 500 });
    }
}
