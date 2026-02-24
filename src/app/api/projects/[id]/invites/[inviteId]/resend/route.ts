import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { sendClientInviteEmail } from "@/lib/services/email-service";
export async function POST(
    req: Request,
    context: { params: Promise<{ id: string, inviteId: string }> }
) {
    try {
        const session = await auth();
        if (!session || session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id, inviteId } = await context.params;

        // Verify the invite exists and belongs to the client
        const invite = await (prisma as any).clientInvite.findUnique({
            where: { id: inviteId },
            include: { client: true }
        });

        if (!invite || invite.clientId !== id) {
            return NextResponse.json({ error: "Invite not found" }, { status: 404 });
        }

        if (invite.status !== "PENDING") {
            return NextResponse.json({ error: "Invite is no longer pending" }, { status: 400 });
        }

        // Extend expiration date to 7 days from now
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        await (prisma as any).clientInvite.update({
            where: { id: inviteId },
            data: { expiresAt }
        });

        // Resend the email
        const token = invite.token;
        const emailResult = await sendClientInviteEmail(invite.email, invite.client.name, token);

        if (!emailResult.success) {
            console.error("[POST /api/projects/[id]/invites/[inviteId]/resend] Failed to send email via Resend.");
            return NextResponse.json({ error: "E-mail verzenden mislukt." }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: "Invite resent." });

    } catch (error: any) {
        console.error("[POST /api/projects/[id]/invites/[inviteId]/resend] Error:", error.message || error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
