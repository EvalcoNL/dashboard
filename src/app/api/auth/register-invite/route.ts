import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hash } from "bcryptjs";

export async function POST(req: Request) {
    try {
        const { token, name, password } = await req.json();

        if (!token || !name || !password || password.length < 6) {
            return NextResponse.json({ error: "Vul alle velden geldig in (wachtwoord > 6 karakters)." }, { status: 400 });
        }

        const invite = await (prisma as any).clientInvite.findUnique({
            where: { token },
            include: { client: true }
        });

        if (!invite || invite.status !== "PENDING" || new Date() > invite.expiresAt) {
            return NextResponse.json({ error: "Ongeldige of verlopen uitnodiging." }, { status: 400 });
        }

        const email = invite.email.toLowerCase();

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        const passwordHash = await hash(password, 12);

        let userId = "";

        if (existingUser) {
            // Already exists -> just update name (if empty before, though we ideally don't overwrite if they want a new name, let's keep it simple)
            userId = existingUser.id;
            await prisma.user.update({
                where: { id: userId },
                data: {
                    clients: { connect: { id: invite.clientId } }
                }
            });
        } else {
            // Create brand new user
            const newUser = await prisma.user.create({
                data: {
                    email,
                    name,
                    passwordHash,
                    role: "USER",
                    clients: { connect: { id: invite.clientId } }
                }
            });
            userId = newUser.id;
        }

        // Mark invite as accepted
        await (prisma as any).clientInvite.update({
            where: { id: invite.id },
            data: { status: "ACCEPTED" }
        });

        return NextResponse.json({ success: true, email });

    } catch (error) {
        console.error("[POST /api/auth/register-invite]", error);
        return NextResponse.json({ error: "Interne server fout." }, { status: 500 });
    }
}
