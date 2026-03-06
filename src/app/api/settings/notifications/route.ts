import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import {
    getGlobalNotificationSettings,
    saveGlobalNotificationSettings
} from "@/lib/services/notification-resolver";

/**
 * GET /api/settings/notifications
 * Get global notification settings + per-client overview
 */
export async function GET() {
    try {
        const session = await auth();
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const globalSettings = await getGlobalNotificationSettings();

        // Get all clients with their notification mode
        const clients = await (prisma as any).project.findMany({
            select: {
                id: true,
                name: true,
                notificationMode: true,
                slackWebhookUrl: true,
                notificationUsers: { select: { id: true, name: true, email: true } }
            },
            orderBy: { name: "asc" }
        });

        // Get all users for the user picker
        const allUsers = await (prisma as any).user.findMany({
            select: { id: true, name: true, email: true },
            orderBy: { name: "asc" }
        });

        return NextResponse.json({
            global: {
                userIds: globalSettings.userIds,
                slackWebhookUrl: globalSettings.slackWebhookUrl,
            },
            clients,
            allUsers,
        });
    } catch (error) {
        console.error("[GET /api/settings/notifications]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

/**
 * PATCH /api/settings/notifications
 * Update global notification settings
 */
export async function PATCH(req: Request) {
    try {
        const session = await auth();
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { userIds, slackWebhookUrl } = await req.json();

        if (!Array.isArray(userIds)) {
            return NextResponse.json({ error: "Invalid userIds" }, { status: 400 });
        }

        await saveGlobalNotificationSettings({ userIds, slackWebhookUrl });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[PATCH /api/settings/notifications]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
