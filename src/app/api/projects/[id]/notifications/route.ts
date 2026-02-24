import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id: clientId } = await params;
        const { userIds, slackWebhookUrl } = await req.json();

        if (!Array.isArray(userIds)) {
            return NextResponse.json({ error: "Invalid userIds" }, { status: 400 });
        }

        // Update the client with the new notification settings
        const updatedClient = await (prisma as any).client.update({
            where: { id: clientId },
            data: {
                slackWebhookUrl: slackWebhookUrl || null,
                notificationUsers: {
                    set: userIds.map((id: string) => ({ id }))
                }
            },
            select: {
                id: true,
                slackWebhookUrl: true,
                notificationUsers: { select: { id: true, name: true, email: true } }
            }
        });

        return NextResponse.json(updatedClient);
    } catch (error) {
        console.error("[PATCH /api/projects/[id]/notifications]", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
