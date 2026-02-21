export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import ClientList from "@/components/ClientList";

export default async function ClientsPage() {
    const session = await auth();
    if (!session) redirect("/login");

    const clients = await prisma.client.findMany({
        include: {
            dataSources: {
                where: { active: true },
            },
            _count: {
                select: { campaignMetrics: true },
            },
        },
        orderBy: { name: "asc" },
    });

    return (
        <ClientList
            clients={clients}
            userRole={session.user.role}
        />
    );
}
