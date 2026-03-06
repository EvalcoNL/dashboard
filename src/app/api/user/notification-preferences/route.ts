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
        select: { projectId: true, enabled: true }
    });

    // Build a map: { projectId: boolean }
    const prefMap: Record<string, boolean> = {};
    for (const p of preferences) {
        prefMap[p.projectId] = p.enabled;
    }

    return NextResponse.json({ preferences: prefMap });
}

/**
 * PATCH — toggle notification preference for a specific client
 * Body: { projectId: string, enabled: boolean }
 */
export async function PATCH(req: NextRequest) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { projectId, enabled } = await req.json();

    if (!projectId || typeof enabled !== "boolean") {
        return NextResponse.json({ error: "projectId and enabled (boolean) are required." }, { status: 400 });
    }

    // Verify user has access to this client
    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { projects: { where: { id: projectId }, select: { id: true } } }
    });

    if (!user || user.projects.length === 0) {
        return NextResponse.json({ error: "Geen toegang tot dit project." }, { status: 403 });
    }

    // Upsert the preference
    await (prisma as any).userNotificationPreference.upsert({
        where: {
            userId_projectId: {
                userId: session.user.id,
                projectId
            }
        },
        update: { enabled },
        create: {
            userId: session.user.id,
            projectId,
            enabled
        }
    });

    return NextResponse.json({ success: true, projectId, enabled });
}
