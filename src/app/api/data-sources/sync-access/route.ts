export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { getAccessProvider, formatTokenError } from "@/lib/integrations/access-providers";
import { decrypt } from "@/lib/encryption";

/**
 * POST: Sync users from platform APIs (e.g. Google Ads) into LinkedAccounts.
 * Fetches active users, pending invitations, and MCC links, then upserts them.
 */
export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId } = await req.json();
    if (!projectId) {
        return NextResponse.json({ error: "projectId is required" }, { status: 400 });
    }

    // Get all data sources for this client that have an access provider with listUsers
    const dataSources = await prisma.dataSource.findMany({
        where: { projectId, active: true },
    });

    let totalSynced = 0;
    let totalCreated = 0;
    let totalUpdated = 0;
    const errors: string[] = [];

    for (const ds of dataSources) {
        // Skip data sources that haven't completed account selection
        if (!ds.externalId || ds.externalId === "PENDING" || ds.externalId === "default") {
            console.log(`[SyncAccess] Skipping ${ds.type} (${ds.name}) — externalId is ${ds.externalId}`);
            continue;
        }

        const provider = getAccessProvider(ds.type);
        if (!provider || !provider.listUsers) {
            console.log(`[SyncAccess] Skipping ${ds.type} (${ds.name}) — no listUsers provider`);
            continue;
        }

        console.log(`[SyncAccess] Syncing ${ds.type} (${ds.name}, externalId: ${ds.externalId})...`);

        try {
            // For providers that store access tokens (META), decrypt first
            const tokenTypes = ["META", "MICROSOFT_ADS", "LINKEDIN", "MAGENTO", "SHOPWARE"];
            let rawToken = tokenTypes.includes(ds.type) ? decrypt(ds.token) : ds.token;

            // Support new JSON token format: { accessToken: "...", refreshToken: "..." }
            if (tokenTypes.includes(ds.type)) {
                try {
                    const parsed = JSON.parse(rawToken);
                    if (parsed.accessToken) rawToken = parsed.accessToken;
                } catch {
                    // Legacy plain string token, use as-is
                }
            }

            const { users } = await provider.listUsers({
                token: rawToken,
                externalId: ds.externalId,
                config: ds.config as Record<string, any> | undefined,
            });

            // Get existing linked accounts for this data source
            const existing = await prisma.linkedAccount.findMany({
                where: { dataSourceId: ds.id },
            });
            const existingMap = new Map(existing.map(e => [e.email, e]));

            // Track which emails we've seen from the platform
            const seenEmails = new Set<string>();

            for (const user of users) {
                seenEmails.add(user.email);
                const existingAccount = existingMap.get(user.email);

                if (existingAccount) {
                    // Update if status or role changed
                    const needsUpdate =
                        existingAccount.status !== user.status ||
                        existingAccount.role !== user.role ||
                        existingAccount.kind !== user.kind;

                    if (needsUpdate) {
                        await prisma.linkedAccount.update({
                            where: { id: existingAccount.id },
                            data: {
                                status: user.status,
                                role: user.role,
                                kind: user.kind,
                                name: user.name || existingAccount.name,
                            },
                        });
                        totalUpdated++;
                    }
                } else {
                    // Create new linked account
                    await prisma.linkedAccount.create({
                        data: {
                            dataSourceId: ds.id,
                            email: user.email,
                            name: user.name || (user.kind === "USER" ? user.email.split("@")[0] : user.email),
                            role: user.role,
                            status: user.status,
                            kind: user.kind,
                        },
                    });
                    totalCreated++;
                }
            }

            // Mark users that exist locally but not on the platform as REVOKED
            // (only for USER kind — MCC links may legitimately disappear)
            for (const [email, account] of existingMap) {
                if (!seenEmails.has(email) && account.kind === "USER" && account.status !== "REVOKED") {
                    await prisma.linkedAccount.update({
                        where: { id: account.id },
                        data: { status: "REVOKED" },
                    });
                    totalUpdated++;
                }
            }

            console.log(`[SyncAccess] ${ds.type}: found ${users.length} users, created ${totalCreated}, updated ${totalUpdated}`);
            totalSynced++;
        } catch (err: any) {
            console.error(`[SyncAccess] Failed for ${ds.type} (${ds.externalId}):`, err);
            const msg = err.message || String(err);
            errors.push(formatTokenError(ds.name || ds.type, msg));
        }
    }

    // Separate token errors for frontend UI
    const tokenErrors = errors.filter(e => e.includes("Token verlopen"));
    const otherErrors = errors.filter(e => !e.includes("Token verlopen"));

    return NextResponse.json({
        success: true,
        synced: totalSynced,
        created: totalCreated,
        updated: totalUpdated,
        errors: errors.length > 0 ? errors : undefined,
        tokenErrors: tokenErrors.length > 0 ? tokenErrors : undefined,
        otherErrors: otherErrors.length > 0 ? otherErrors : undefined,
        message: `Sync voltooid: ${totalCreated} nieuw, ${totalUpdated} bijgewerkt`,
    });
}
