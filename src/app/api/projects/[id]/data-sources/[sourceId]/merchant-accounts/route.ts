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

        if (!source || source.type !== "GOOGLE_MERCHANT" || !source.token) {
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
        if (tokenData.error) {
            console.error("[GMC] Token refresh failed:", tokenData);
            throw new Error(tokenData.error_description || tokenData.error);
        }

        const accessToken = tokenData.access_token;
        const accounts: Array<{ id: string; name: string }> = [];

        // Strategy 1: Try authinfo endpoint (Content API v2.1)
        console.log("[GMC] Fetching authinfo...");
        const authInfoRes = await fetch("https://shoppingcontent.googleapis.com/content/v2.1/accounts/authinfo", {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        if (authInfoRes.ok) {
            const authInfoData = await authInfoRes.json();
            console.log("[GMC] authinfo response:", JSON.stringify(authInfoData));
            const identifiers = authInfoData.accountIdentifiers || [];

            for (const acc of identifiers) {
                const merchantId = acc.merchantId || acc.aggregatorId;
                if (!merchantId) continue;

                try {
                    const accountRes = await fetch(
                        `https://shoppingcontent.googleapis.com/content/v2.1/${merchantId}/accounts/${merchantId}`,
                        { headers: { Authorization: `Bearer ${accessToken}` } }
                    );
                    if (accountRes.ok) {
                        const accountData = await accountRes.json();
                        accounts.push({
                            id: merchantId,
                            name: accountData.name || `Merchant Account ${merchantId}`
                        });
                    } else {
                        accounts.push({
                            id: merchantId,
                            name: `Merchant Account ${merchantId}`
                        });
                    }
                } catch {
                    accounts.push({
                        id: merchantId,
                        name: `Merchant Account ${merchantId}`
                    });
                }
            }
        } else {
            const errBody = await authInfoRes.text();
            console.error("[GMC] authinfo failed:", authInfoRes.status, errBody);
        }

        // Strategy 2: If authinfo returned nothing, try the Merchant API (newer)
        if (accounts.length === 0) {
            console.log("[GMC] authinfo returned no accounts, trying Merchant API v1beta...");
            try {
                const merchantApiRes = await fetch(
                    "https://merchantapi.googleapis.com/accounts/v1beta/accounts",
                    { headers: { Authorization: `Bearer ${accessToken}` } }
                );
                if (merchantApiRes.ok) {
                    const merchantApiData = await merchantApiRes.json();
                    console.log("[GMC] Merchant API response:", JSON.stringify(merchantApiData));
                    const merchantAccounts = merchantApiData.accounts || [];
                    for (const acc of merchantAccounts) {
                        // account name format: "accounts/{accountId}"
                        const accountId = acc.name?.replace("accounts/", "") || acc.accountId;
                        if (accountId) {
                            accounts.push({
                                id: accountId,
                                name: acc.accountName || acc.displayName || `Merchant Account ${accountId}`
                            });
                        }
                    }
                } else {
                    const errBody = await merchantApiRes.text();
                    console.error("[GMC] Merchant API v1beta failed:", merchantApiRes.status, errBody);
                }
            } catch (err) {
                console.error("[GMC] Merchant API v1beta error:", err);
            }
        }

        // Strategy 3: If still nothing, try listing CSS accounts (for CSS partners)
        if (accounts.length === 0) {
            console.log("[GMC] Still no accounts found. Trying accounts.list with known merchant IDs...");
            // Last resort: check if the token has access to list any accounts
            try {
                const listRes = await fetch(
                    "https://shoppingcontent.googleapis.com/content/v2.1/accounts/authinfo",
                    {
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                            "Accept": "application/json",
                        }
                    }
                );
                if (listRes.ok) {
                    const listData = await listRes.json();
                    console.log("[GMC] Final authinfo attempt:", JSON.stringify(listData));
                }
            } catch (err) {
                console.error("[GMC] Final attempt error:", err);
            }
        }

        console.log(`[GMC] Returning ${accounts.length} accounts`);
        return NextResponse.json({ accounts });
    } catch (error: any) {
        console.error("Error fetching GMC accounts:", error);
        return NextResponse.json({ error: error.message || "Failed to fetch accounts" }, { status: 500 });
    }
}
