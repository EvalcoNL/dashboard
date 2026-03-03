export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import SecuritySettings from "@/components/settings/SecuritySettings";
import TwoFactorSuccess from "@/components/settings/TwoFactorSuccess";
import { Shield } from "lucide-react";

export default async function TwoFactorSetupPage() {
    const session = await auth();
    if (!session || !session.user) redirect("/login");

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { twoFactorEnabled: true }
    });

    // If 2FA is already enabled in DB but JWT is stale, show success + re-login
    if (user?.twoFactorEnabled) {
        return (
            <div className="animate-fade-in" style={{
                maxWidth: "600px",
                margin: "0 auto",
                padding: "80px 24px 0",
                minHeight: "100vh"
            }}>
                <TwoFactorSuccess />
            </div>
        );
    }

    return (
        <div className="animate-fade-in" style={{
            maxWidth: "600px",
            margin: "0 auto",
            padding: "80px 24px 0",
            minHeight: "100vh"
        }}>
            <div style={{
                textAlign: "center",
                marginBottom: "32px"
            }}>
                <div style={{
                    width: "64px",
                    height: "64px",
                    borderRadius: "16px",
                    background: "rgba(245, 158, 11, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#f59e0b",
                    margin: "0 auto 16px"
                }}>
                    <Shield size={32} />
                </div>
                <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "8px" }}>
                    Twee-factor authenticatie vereist
                </h1>
                <p style={{ color: "var(--color-text-secondary)", fontSize: "0.9rem", maxWidth: "400px", margin: "0 auto" }}>
                    Voor de beveiliging van je account is twee-factor authenticatie verplicht.
                    Stel dit in om verder te gaan.
                </p>
            </div>

            <SecuritySettings is2FAEnabled={false} />
        </div>
    );
}
