import { prisma } from "@/lib/db";
import { decrypt, encrypt } from "@/lib/encryption";

interface NotificationConfig {
    recipients: string[];
    slackWebhookUrl: string | null;
    enabled: boolean;
    mode: "global" | "custom" | "disabled";
}

/**
 * Resolve the notification config for a given client.
 * - "global" → use GlobalSetting defaults
 * - "custom" → use the client's own notificationUsers + slackWebhookUrl
 * - "disabled" → no notifications
 */
export async function resolveNotificationConfig(projectId: string): Promise<NotificationConfig> {
    const client = await (prisma as any).project.findUnique({
        where: { id: projectId },
        select: {
            notificationMode: true,
            slackWebhookUrl: true,
            notificationUsers: { select: { email: true } }
        }
    });

    if (!client) {
        return { recipients: [], slackWebhookUrl: null, enabled: false, mode: "disabled" };
    }

    const mode = client.notificationMode || "global";

    if (mode === "disabled") {
        return { recipients: [], slackWebhookUrl: null, enabled: false, mode: "disabled" };
    }

    // Get self-opted-in users for this client
    const optedIn = await (prisma as any).userNotificationPreference.findMany({
        where: { projectId, enabled: true },
        include: { user: { select: { email: true } } }
    });
    const optInEmails: string[] = optedIn.map((p: any) => p.user.email);

    if (mode === "custom") {
        const adminEmails = client.notificationUsers.map((u: any) => u.email);
        return {
            recipients: [...new Set([...adminEmails, ...optInEmails])],
            slackWebhookUrl: client.slackWebhookUrl ? decrypt(client.slackWebhookUrl) : null,
            enabled: true,
            mode: "custom"
        };
    }

    // mode === "global" → fetch global settings + merge opt-in users
    const globalConfig = await getGlobalNotificationSettings();

    return {
        recipients: [...new Set([...globalConfig.recipients, ...optInEmails])],
        slackWebhookUrl: globalConfig.slackWebhookUrl,
        enabled: true,
        mode: "global"
    };
}

/**
 * Get the global notification settings from the GlobalSetting table.
 */
export async function getGlobalNotificationSettings(): Promise<{
    userIds: string[];
    recipients: string[];
    slackWebhookUrl: string | null;
}> {
    const [usersSetting, slackSetting] = await Promise.all([
        (prisma as any).globalSetting.findUnique({ where: { key: "incident_notification_users" } }),
        (prisma as any).globalSetting.findUnique({ where: { key: "incident_slack_webhook" } }),
    ]);

    const userIds: string[] = usersSetting ? JSON.parse(usersSetting.value) : [];
    const slackWebhookUrl = slackSetting?.value ? decrypt(slackSetting.value) : null;

    // Resolve user IDs to emails
    let recipients: string[] = [];
    if (userIds.length > 0) {
        const users = await (prisma as any).user.findMany({
            where: { id: { in: userIds } },
            select: { email: true }
        });
        recipients = users.map((u: any) => u.email);
    }

    return { userIds, recipients, slackWebhookUrl };
}

/**
 * Save the global notification settings.
 */
export async function saveGlobalNotificationSettings(opts: {
    userIds: string[];
    slackWebhookUrl?: string | null;
}): Promise<void> {
    await Promise.all([
        (prisma as any).globalSetting.upsert({
            where: { key: "incident_notification_users" },
            update: { value: JSON.stringify(opts.userIds) },
            create: { key: "incident_notification_users", value: JSON.stringify(opts.userIds) }
        }),
        ...(opts.slackWebhookUrl !== undefined ? [
            (prisma as any).globalSetting.upsert({
                where: { key: "incident_slack_webhook" },
                update: { value: opts.slackWebhookUrl ? encrypt(opts.slackWebhookUrl) : "" },
                create: { key: "incident_slack_webhook", value: opts.slackWebhookUrl ? encrypt(opts.slackWebhookUrl) : "" }
            })
        ] : [])
    ]);
}
