import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import { sendWelcomeEmail } from "@/lib/services/email-verification";

export const dynamic = "force-dynamic";

export default async function VerifyEmailPage({
    params,
}: {
    params: Promise<{ token: string }>;
}) {
    const { token } = await params;

    // Find token
    const verificationToken = await (prisma as any).emailVerificationToken.findUnique({
        where: { token },
    });

    if (!verificationToken) {
        return (
            <VerifyMessage
                title="Ongeldige Link"
                message="Deze verificatie link is niet gevonden of al gebruikt."
                isError
            />
        );
    }

    if (new Date() > verificationToken.expiresAt) {
        return (
            <VerifyMessage
                title="Link Verlopen"
                message="Deze verificatie link is verlopen. Registreer opnieuw om een nieuwe link te ontvangen."
                isError
            />
        );
    }

    // Find and verify the user
    const user = await prisma.user.findUnique({
        where: { email: verificationToken.email },
    });

    if (!user) {
        return (
            <VerifyMessage
                title="Gebruiker Niet Gevonden"
                message="Er is geen account gevonden voor dit e-mailadres."
                isError
            />
        );
    }

    // Mark user as verified
    await (prisma.user.update as any)({
        where: { id: user.id },
        data: { emailVerified: true },
    });

    // Delete the used token
    await (prisma as any).emailVerificationToken.delete({
        where: { id: verificationToken.id },
    });

    // Send welcome email
    await sendWelcomeEmail(user.email, user.name);

    return (
        <VerifyMessage
            title="E-mail Geverifieerd! 🎉"
            message={`Welkom bij Evalco, ${user.name}! Je account is geactiveerd. Log in om je eerste project in te stellen.`}
            actionLink="/login"
            actionLabel="Inloggen & Starten"
        />
    );
}

function VerifyMessage({
    title,
    message,
    isError = false,
    actionLink,
    actionLabel,
}: {
    title: string;
    message: string;
    isError?: boolean;
    actionLink?: string;
    actionLabel?: string;
}) {
    return (
        <div
            style={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#020617",
                padding: "20px",
                fontFamily: "'Inter', -apple-system, sans-serif",
            }}
        >
            <div
                style={{
                    background: "rgba(15, 23, 42, 0.8)",
                    backdropFilter: "blur(16px)",
                    padding: "48px",
                    borderRadius: "24px",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    maxWidth: "480px",
                    width: "100%",
                    textAlign: "center",
                    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
                }}
            >
                <div
                    style={{
                        width: "72px",
                        height: "72px",
                        borderRadius: "50%",
                        background: isError
                            ? "rgba(239, 68, 68, 0.1)"
                            : "rgba(16, 185, 129, 0.1)",
                        color: isError ? "#ef4444" : "#10b981",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto 24px",
                    }}
                >
                    {isError ? <XCircle size={36} /> : <CheckCircle2 size={36} />}
                </div>

                <h1
                    style={{
                        fontSize: "1.5rem",
                        fontWeight: 700,
                        color: "#f1f5f9",
                        marginBottom: "12px",
                    }}
                >
                    {title}
                </h1>

                <p
                    style={{
                        fontSize: "0.95rem",
                        color: "#94a3b8",
                        lineHeight: 1.6,
                        marginBottom: "32px",
                    }}
                >
                    {message}
                </p>

                {actionLink && actionLabel && (
                    <Link
                        href={actionLink}
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "14px 28px",
                            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                            color: "white",
                            borderRadius: "12px",
                            fontWeight: 600,
                            textDecoration: "none",
                            fontSize: "0.95rem",
                            transition: "all 0.2s ease",
                        }}
                    >
                        {actionLabel}
                    </Link>
                )}

                {isError && (
                    <div style={{ marginTop: "16px" }}>
                        <Link
                            href="/register"
                            style={{
                                color: "#818cf8",
                                textDecoration: "none",
                                fontSize: "0.85rem",
                                fontWeight: 500,
                            }}
                        >
                            Opnieuw registreren
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
