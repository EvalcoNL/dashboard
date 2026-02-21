export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import ClientForm from "@/components/ClientForm";

export default async function EditClientPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const session = await auth();
    if (!session) redirect("/login");
    if (session.user.role !== "ADMIN") redirect("/dashboard");

    const { id } = await params;
    const client = await prisma.client.findUnique({
        where: { id },
        include: { dataSources: true }
    });
    if (!client) notFound();

    return (
        <ClientForm
            client={{
                id: client.id,
                name: client.name,
                industryType: client.industryType,
                targetType: client.targetType,
                targetValue: client.targetValue.toString(),
                tolerancePct: client.tolerancePct,
                evaluationWindowDays: client.evaluationWindowDays,
                profitMarginPct: client.profitMarginPct?.toString() || null,
                currency: client.currency,
            }}
        />
    );
}
