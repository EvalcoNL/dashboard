export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

/**
 * GET — returns the current user's notification preferences for all their clients
 */
export async function GET() {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const preferences = await (prisma as any).userNotificationPreference.findMany({
        where: { userId: session.user.id },
        select: { clientId: true, enabled: true }
    });

    // Build a map: { clientId: boolean }
    const prefMap: Record<string, boolean> = {};
    for (const p of preferences) {
        prefMap[p.clientId] = p.enabled;
    }

    return NextResponse.json({ preferences: prefMap });
}

/**
 * PATCH — toggle notification preference for a specific client
 * Body: { clientId: string, enabled: boolean }
 */
export async function PATCH(req: NextRequest) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { clientId, enabled } = await req.json();

    if (!clientId || typeof enabled !== "boolean") {
        return NextResponse.json({ error: "clientId and enabled (boolean) are required." }, { status: 400 });
    }

    // Verify user has access to this client
    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { clients: { where: { id: clientId }, select: { id: true } } }
    });

    if (!user || user.clients.length === 0) {
        return NextResponse.json({ error: "Geen toegang tot dit project." }, { status: 403 });
    }

    // Upsert the preference
    await (prisma as any).userNotificationPreference.upsert({
        where: {
            userId_clientId: {
                userId: session.user.id,
                clientId
            }
        },
        update: { enabled },
        create: {
            userId: session.user.id,
            clientId,
            enabled
        }
    });

    return NextResponse.json({ success: true, clientId, enabled });
}
