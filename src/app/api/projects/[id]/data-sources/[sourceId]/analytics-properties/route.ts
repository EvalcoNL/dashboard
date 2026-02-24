export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string; sourceId: string }> }
) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: clientId, sourceId } = await params;

    try {
        const source = await prisma.dataSource.findUnique({
            where: { id: sourceId, clientId }
        });

        if (!source || source.type !== "GOOGLE_ANALYTICS" || !source.token) {
            return NextResponse.json({ error: "Invalid data source" }, { status: 400 });
        }

        // Get fresh access token
        const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                refresh_token: source.token,
                client_id: process.env.GOOGLE_OAUTH_CLIENT_ID || "",
                client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || "",
                grant_type: "refresh_token",
            }),
        });

        const tokenData = await tokenResponse.json();
        if (tokenData.error) throw new Error(tokenData.error_description || tokenData.error);

        // Fetch Analytics Account Summaries (Admin API v1beta)
        // This endpoint requires analytics.readonly scope and lists accounts + properties the user can access
        const accountsRes = await fetch("https://analyticsadmin.googleapis.com/v1beta/accountSummaries", {
            headers: {
                Authorization: `Bearer ${tokenData.access_token}`
            }
        });

        if (!accountsRes.ok) {
            const err = await accountsRes.json();
            throw new Error(err.error?.message || "Failed to fetch Analytics accounts");
        }

        const accountsData = await accountsRes.json();

        // Flatten into a list of selectable properties
        const properties: Array<{ accountId: string; propertyId: string; name: string }> = [];

        if (accountsData.accountSummaries) {
            for (const account of accountsData.accountSummaries) {
                if (account.propertySummaries) {
                    for (const prop of account.propertySummaries) {
                        properties.push({
                            accountId: account.account,
                            propertyId: prop.property,
                            name: `${account.displayName} > ${prop.displayName}`
                        });
                    }
                }
            }
        }

        return NextResponse.json({ properties });
    } catch (error: any) {
        console.error("Error fetching GA properties:", error);
        return NextResponse.json({ error: error.message || "Failed to fetch properties" }, { status: 500 });
    }
}
