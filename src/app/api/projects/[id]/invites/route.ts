import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import crypto from "crypto";
import { sendClientInviteEmail } from "@/lib/services/email-service";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session || !session.user || session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const { id: clientId } = await params;
        const { email } = await req.json();

        if (!email || !email.includes("@")) {
            return NextResponse.json({ error: "Invalid email" }, { status: 400 });
        }

        // Validate client exists
        const client = await prisma.client.findUnique({
            where: { id: clientId }
        });

        if (!client) {
            return NextResponse.json({ error: "Client not found" }, { status: 404 });
        }

        // Check if user already has access directly
        const existingUser = await prisma.user.findUnique({
            where: { email },
            include: { clients: { select: { id: true } } }
        });

        if (existingUser && existingUser.clients.some(c => c.id === clientId)) {
            return NextResponse.json({ error: "User already has access to this client" }, { status: 400 });
        }

        // Generate a secure, unique token
        const token = crypto.randomBytes(32).toString("hex");

        // Expire in 7 days
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        // Save invite to DB
        const invite = await (prisma as any).clientInvite.create({
            data: {
                clientId,
                email,
                token,
                status: "PENDING",
                expiresAt
            }
        });

        const userExists = !!existingUser;
        await sendClientInviteEmail(email, client.name, token, userExists);

        return NextResponse.json({ success: true, invite });

    } catch (error) {
        console.error("[POST /api/projects/[id]/invites]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session || !session.user || session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const { id: clientId } = await params;
        const { inviteId } = await req.json();

        if (!inviteId) {
            return NextResponse.json({ error: "Invite ID required" }, { status: 400 });
        }

        await (prisma as any).clientInvite.delete({
            where: { id: inviteId, clientId } // Ensure it logs to this client
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("[DELETE /api/projects/[id]/invites]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
