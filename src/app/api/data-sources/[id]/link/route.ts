export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { syncScheduler } from "@/lib/data-integration/sync-scheduler";

// Map DataSource type to connector definition
const CONNECTOR_DEFS: Record<string, { slug: string; name: string; category: string }> = {
    GOOGLE_ADS: { slug: "google-ads", name: "Google Ads", category: "PAID_SEARCH" },
    GOOGLE_ANALYTICS: { slug: "ga4", name: "Google Analytics 4", category: "WEB_ANALYTICS" },
    META: { slug: "meta-ads", name: "Meta Ads", category: "PAID_SOCIAL" },
    LINKEDIN: { slug: "linkedin-ads", name: "LinkedIn Ads", category: "PAID_SOCIAL" },
    MICROSOFT_ADS: { slug: "microsoft-ads", name: "Microsoft Ads", category: "PAID_SEARCH" },
    TIKTOK: { slug: "tiktok-ads", name: "TikTok Ads", category: "PAID_SOCIAL" },
};

async function resolveConnectorId(type: string): Promise<string | null> {
    const def = CONNECTOR_DEFS[type];
    if (!def) return null;
    // Auto-create the ConnectorDefinition if it doesn't exist
    const connector = await prisma.connectorDefinition.upsert({
        where: { slug: def.slug },
        update: {},
        create: { slug: def.slug, name: def.name, category: def.category, authType: "oauth2", isActive: true },
    });
    return connector.id;
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: sourceId } = await params;
    const body = await req.json();
    const { externalId, name, loginCustomerId } = body;

    if (!externalId) {
        return NextResponse.json({ error: "Missing externalId" }, { status: 400 });
    }

    try {
        // Get the pending source to know which client it belongs to
        const pendingSource = await prisma.dataSource.findUnique({
            where: { id: sourceId },
        });
        if (!pendingSource) {
            return NextResponse.json({ error: "Source not found" }, { status: 404 });
        }

        // Auto-link the correct ConnectorDefinition
        const connectorId = await resolveConnectorId(pendingSource.type);

        // Check if another source with the same externalId+type already exists for this client
        const existingSource = await prisma.dataSource.findFirst({
            where: {
                projectId: pendingSource.projectId,
                type: pendingSource.type,
                externalId,
                id: { not: sourceId }, // exclude the current pending source
            },
        });

        if (existingSource) {
            // Reconnect: update the existing source with the new token, then delete the pending record
            await prisma.dataSource.update({
                where: { id: existingSource.id },
                data: {
                    token: pendingSource.token,
                    active: true,
                    name: name || existingSource.name,
                    config: loginCustomerId ? { loginCustomerId } : (existingSource.config as object) || undefined,
                    ...(connectorId ? { connectorId } : {}),
                },
            });

            // Delete the pending source (no longer needed)
            await prisma.dataSource.delete({ where: { id: sourceId } });

            // Ensure a sync account exists
            if (connectorId) {
                await prisma.dataSourceAccount.upsert({
                    where: { dataSourceId_externalId: { dataSourceId: existingSource.id, externalId } },
                    create: { dataSourceId: existingSource.id, externalId, name: name || existingSource.name || externalId, isActive: true },
                    update: { isActive: true },
                });
            }

            // Auto-trigger first sync in background
            syncScheduler.scheduleNow(existingSource.id).catch(err =>
                console.error(`[AutoSync] Failed to schedule sync for reconnected source ${existingSource.id}:`, err)
            );

            return NextResponse.json(existingSource);
        }

        // No existing source — finalize the pending one
        const source = await prisma.dataSource.update({
            where: { id: sourceId },
            data: {
                externalId,
                name: name || `Google Ads (${externalId})`,
                active: true,
                config: loginCustomerId ? { loginCustomerId } : undefined,
                ...(connectorId ? { connectorId } : {}),
            },
        });

        // Create a sync account for the selected account
        if (connectorId) {
            await prisma.dataSourceAccount.upsert({
                where: { dataSourceId_externalId: { dataSourceId: source.id, externalId } },
                create: { dataSourceId: source.id, externalId, name: name || `Google Ads (${externalId})`, isActive: true },
                update: { isActive: true },
            });
        }

        // Auto-trigger first sync in background
        syncScheduler.scheduleNow(source.id).catch(err =>
            console.error(`[AutoSync] Failed to schedule sync for new source ${source.id}:`, err)
        );

        return NextResponse.json(source);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: sourceId } = await params;

    try {
        const source = await prisma.dataSource.findUnique({
            where: { id: sourceId },
            select: { projectId: true, type: true }
        });

        if (source?.type === "SLACK") {
            await prisma.project.update({
                where: { id: source.projectId },
                data: { slackWebhookUrl: null }
            });
        }

        await prisma.dataSource.delete({
            where: { id: sourceId },
        });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
