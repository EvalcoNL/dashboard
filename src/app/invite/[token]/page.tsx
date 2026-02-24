import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import { auth } from "@/lib/auth";
import InviteAcceptance from "./InviteAcceptance";
export default async function InvitePage({
    params
}: {
    params: Promise<{ token: string }>
}) {
    const { token } = await params;

    const invite = await (prisma as any).clientInvite.findUnique({
        where: { token },
        include: { client: true }
    });

    if (!invite) {
        return <InviteMessage title="Ongeldige Uitnodiging" message="Deze uitnodiging is niet gevonden of ingetrokken." isError />;
    }

    if (invite.status !== "PENDING") {
        return <InviteMessage title="Uitnodiging Verlopen" message="Deze uitnodiging is al geaccepteerd of niet meer geldig." isError />;
    }

    if (new Date() > invite.expiresAt) {
        return <InviteMessage title="Uitnodiging Verlopen" message="De link is ouder dan 7 dagen en daardoor verlopen." isError />;
    }

    // Require authentication check
    const session = await auth();

    // If logged in User matches Invited User: Auto-Accept!
    if (session && session.user.email?.toLowerCase() === invite.email.toLowerCase()) {
        // 1. Give the underlying User access to the Client.
        await prisma.user.update({
            where: { id: session.user.id },
            data: {
                clients: {
                    connect: { id: invite.clientId }
                }
            }
        });

        // 2. Mark the invite as ACCEPTED
        await (prisma as any).clientInvite.update({
            where: { id: invite.id },
            data: { status: "ACCEPTED" }
        });

        return (
            <InviteMessage
                title="Uitnodiging Geaccepteerd!"
                message={`Je hebt nu succesvol toegang tot het account van ${invite.client.name}.`}
                actionLink="/dashboard"
                actionLabel="Ga naar het Dashboard"
            />
        );
    }

    // If logged in, but with the WRONG email address
    if (session && session.user.email?.toLowerCase() !== invite.email.toLowerCase()) {
        return (
            <InviteMessage
                title="Verkeerde Account"
                message={`Deze uitnodiging is verzonden naar ${invite.email}. Je bent momenteel ingelogd als ${session.user.email}. Log uit of open een incognito venster om te accepteren.`}
                isError
            />
        );
    }

    // User is NOT logged in. Show the Registration / Login Component.
    const existingUser = await prisma.user.findUnique({
        where: { email: invite.email.toLowerCase() }
    });

    return (
        <InviteAcceptance
            token={token}
            email={invite.email.toLowerCase()}
            clientName={invite.client.name}
            userExists={!!existingUser}
        />
    );
}

function InviteMessage({ title, message, isError = false, actionLink, actionLabel }: { title: string, message: string, isError?: boolean, actionLink?: string, actionLabel?: string }) {
    return (
        <div style={{
            minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
            background: "var(--color-background)", padding: "20px"
        }}>
            <div style={{
                background: "var(--color-surface)", padding: "40px", borderRadius: "16px",
                border: "1px solid var(--color-border)", maxWidth: "480px", width: "100%", textAlign: "center",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
            }}>
                <div style={{
                    width: "64px", height: "64px", borderRadius: "32px",
                    background: isError ? "rgba(239, 68, 68, 0.1)" : "rgba(16, 185, 129, 0.1)",
                    color: isError ? "var(--color-danger, #ef4444)" : "var(--color-success, #10b981)",
                    display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px"
                }}>
                    {isError ? <XCircle size={32} /> : <CheckCircle2 size={32} />}
                </div>

                <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "12px" }}>
                    {title}
                </h1>

                <p style={{ fontSize: "1rem", color: "var(--color-text-muted)", lineHeight: 1.6, marginBottom: "32px" }}>
                    {message}
                </p>

                {actionLink && actionLabel && (
                    <Link href={actionLink} style={{
                        display: "inline-block", padding: "12px 24px",
                        background: "var(--color-brand)", color: "white",
                        borderRadius: "8px", fontWeight: 600, textDecoration: "none"
                    }}>
                        {actionLabel}
                    </Link>
                )}

                {isError && (
                    <Link href="/dashboard" style={{
                        display: "inline-block", padding: "12px 24px",
                        border: "1px solid var(--color-border)", color: "var(--color-text-primary)",
                        borderRadius: "8px", fontWeight: 600, textDecoration: "none"
                    }}>
                        Terug naar Dashboard
                    </Link>
                )}
            </div>
        </div>
    );
}
