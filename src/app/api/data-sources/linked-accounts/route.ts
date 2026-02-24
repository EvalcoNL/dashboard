export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { getAccessProvider } from "@/lib/integrations/access-providers";

/**
 * POST: Add a user to one or more data sources.
 * Sends platform-level invitations where supported (e.g. Google Ads).
 */
export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { email, name, dataSourceIds, role, roles } = body as {
        email: string;
        name?: string;
        dataSourceIds: string[];
        role?: string;
        roles?: Record<string, string>; // { dsId: "ADMIN", dsId2: "VIEWER" }
    };

    if (!email || !dataSourceIds || dataSourceIds.length === 0) {
        return NextResponse.json({ error: "Missing email or dataSourceIds" }, { status: 400 });
    }

    const results: Array<{ dataSourceId: string; success: boolean; message: string }> = [];

    for (const dsId of dataSourceIds) {
        try {
            // Fetch the data source to get type, token, config
            const dataSource = await prisma.dataSource.findUnique({ where: { id: dsId } });
            if (!dataSource) {
                results.push({ dataSourceId: dsId, success: false, message: "Data source niet gevonden" });
                continue;
            }

            // Resolve the role for this specific data source
            const resolvedRole = roles?.[dsId] || role || "READ_ONLY";

            // Attempt platform-level invitation
            const provider = getAccessProvider(dataSource.type);
            if (provider) {
                const inviteResult = await provider.inviteUser({
                    email,
                    role: resolvedRole,
                    token: dataSource.token,
                    externalId: dataSource.externalId,
                    config: dataSource.config as Record<string, any> | undefined,
                });

                // Verify the invite actually landed via listUsers (if supported)
                if (inviteResult.success && provider.listUsers) {
                    try {
                        const listed = await provider.listUsers({
                            token: dataSource.token,
                            externalId: dataSource.externalId,
                            config: dataSource.config as Record<string, any> | undefined,
                        });
                        const found = listed.users.some(
                            (u) => u.email.toLowerCase() === email.toLowerCase()
                        );
                        if (found) {
                            results.push({
                                dataSourceId: dsId,
                                success: true,
                                message: `Uitnodiging verstuurd en geverifieerd voor ${dataSource.name || dataSource.type}`,
                            });
                        } else {
                            // Invite claimed success but user not found — still report success
                            // (some platforms have a delay before the user appears)
                            results.push({
                                dataSourceId: dsId,
                                success: true,
                                message: `Uitnodiging verstuurd naar ${dataSource.name || dataSource.type} (verificatie in behandeling)`,
                            });
                        }
                    } catch (verifyErr) {
                        console.warn(`[API] Verification listUsers failed for ${dsId}:`, verifyErr);
                        // Fall back to trusting the provider response
                        results.push({ dataSourceId: dsId, ...inviteResult });
                    }
                } else {
                    results.push({ dataSourceId: dsId, ...inviteResult });
                }
            } else {
                // No provider — just track locally
                results.push({
                    dataSourceId: dsId,
                    success: true,
                    message: `Gebruiker lokaal toegevoegd (geen platform-integratie voor ${dataSource.type})`,
                });
            }

            // Always create/update local linked account record
            await prisma.linkedAccount.upsert({
                where: {
                    dataSourceId_email: { dataSourceId: dsId, email },
                },
                update: {
                    name: name || email.split("@")[0],
                    role: resolvedRole,
                    status: "PENDING",
                },
                create: {
                    dataSourceId: dsId,
                    email,
                    name: name || email.split("@")[0],
                    role: resolvedRole,
                    status: "PENDING",
                },
            });
        } catch (error: any) {
            console.error(`Failed to invite ${email} to ${dsId}:`, error);
            results.push({
                dataSourceId: dsId,
                success: false,
                message: error.message || "Onbekende fout bij het uitnodigen",
            });
        }
    }

    const allSucceeded = results.every((r) => r.success);
    const anySucceeded = results.some((r) => r.success);

    return NextResponse.json({
        success: anySucceeded,
        allSucceeded,
        results,
        message: allSucceeded
            ? `Uitnodiging verstuurd naar ${email}`
            : anySucceeded
                ? `Gedeeltelijk gelukt — controleer de details`
                : `Uitnodigen mislukt: ${results.map((r) => r.message).join("; ")}`,
    });
}

/**
 * PUT: Resend an invitation for a linked account.
 */
export async function PUT(req: NextRequest) {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { linkedAccountId } = await req.json();
        if (!linkedAccountId) {
            return NextResponse.json({ error: "linkedAccountId is required" }, { status: 400 });
        }

        const linkedAccount = await prisma.linkedAccount.findUnique({
            where: { id: linkedAccountId },
            include: { dataSource: true },
        });

        if (!linkedAccount) {
            return NextResponse.json({ error: "Account niet gevonden" }, { status: 404 });
        }

        const provider = getAccessProvider(linkedAccount.dataSource.type);
        if (!provider) {
            return NextResponse.json({
                success: false,
                message: `Geen platform-integratie beschikbaar voor ${linkedAccount.dataSource.type}`,
            }, { status: 400 });
        }

        const result = await provider.inviteUser({
            email: linkedAccount.email,
            role: linkedAccount.role || "READ_ONLY",
            token: linkedAccount.dataSource.token,
            externalId: linkedAccount.dataSource.externalId,
            config: linkedAccount.dataSource.config as Record<string, any> | undefined,
        });

        // Update status back to PENDING
        await prisma.linkedAccount.update({
            where: { id: linkedAccountId },
            data: { status: "PENDING" },
        });

        return NextResponse.json({
            success: true,
            message: `Uitnodiging opnieuw verstuurd naar ${linkedAccount.email}`,
        });
    } catch (error: any) {
        console.error("[API] Error resending invitation:", error);
        return NextResponse.json({
            success: false,
            message: error.message || "Fout bij het opnieuw versturen van de uitnodiging",
        }, { status: 500 });
    }
}

/**
 * DELETE: Remove a user's access from one or more data sources.
 * Revokes platform-level access where supported (e.g. Google Ads).
 */
export async function DELETE(req: Request) {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { ids } = await req.json();

        if (!Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: "ids array is required" }, { status: 400 });
        }

        const results: Array<{ id: string; success: boolean; message: string }> = [];

        for (const id of ids) {
            try {
                // Fetch the linked account with its data source
                const linkedAccount = await prisma.linkedAccount.findUnique({
                    where: { id },
                    include: { dataSource: true },
                });

                if (!linkedAccount) {
                    results.push({ id, success: false, message: "Account niet gevonden" });
                    continue;
                }

                // Attempt platform-level removal
                // Skip platform-level removal for MANAGER (MCC) accounts — just remove locally
                const provider = (linkedAccount as any).kind !== "MANAGER" ? getAccessProvider(linkedAccount.dataSource.type) : null;
                if (provider) {
                    try {
                        const removeResult = await provider.removeUser({
                            email: linkedAccount.email,
                            token: linkedAccount.dataSource.token,
                            externalId: linkedAccount.dataSource.externalId,
                            config: linkedAccount.dataSource.config as Record<string, any> | undefined,
                        });

                        // Verify removal via listUsers (if supported)
                        if (removeResult.success && provider.listUsers) {
                            try {
                                const listed = await provider.listUsers({
                                    token: linkedAccount.dataSource.token,
                                    externalId: linkedAccount.dataSource.externalId,
                                    config: linkedAccount.dataSource.config as Record<string, any> | undefined,
                                });
                                const stillExists = listed.users.some(
                                    (u) => u.email.toLowerCase() === linkedAccount.email.toLowerCase()
                                );
                                if (stillExists) {
                                    results.push({
                                        id,
                                        success: false,
                                        message: `Verwijdering mislukt: ${linkedAccount.email} is nog steeds aanwezig op het platform`,
                                    });
                                    continue; // Don't delete locally if still present
                                } else {
                                    results.push({
                                        id,
                                        success: true,
                                        message: `Verwijderd en geverifieerd voor ${linkedAccount.dataSource.name || linkedAccount.dataSource.type}`,
                                    });
                                }
                            } catch (verifyErr) {
                                console.warn(`[API] Verification listUsers failed for ${id}:`, verifyErr);
                                // Fall back to trusting the provider response
                                results.push({ id, ...removeResult });
                            }
                        } else {
                            results.push({ id, ...removeResult });
                        }
                    } catch (providerErr: any) {
                        console.error(`Platform removal failed for ${linkedAccount.email}:`, providerErr);
                        results.push({
                            id,
                            success: false,
                            message: providerErr.message || "Platform verwijdering mislukt",
                        });
                        continue; // Don't delete locally if platform removal failed
                    }
                } else {
                    results.push({
                        id,
                        success: true,
                        message: "Lokaal verwijderd",
                    });
                }

                // Delete from local DB
                await prisma.linkedAccount.delete({ where: { id } });
            } catch (error: any) {
                results.push({ id, success: false, message: error.message });
            }
        }

        const allSucceeded = results.every((r) => r.success);

        return NextResponse.json({
            success: allSucceeded,
            results,
            deleted: results.filter((r) => r.success).length,
        });
    } catch (error) {
        console.error("[API] Error deleting linked accounts:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
