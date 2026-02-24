export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import ProjectList from "@/components/project/ProjectList";

export default async function ClientsPage() {
    const session = await auth();
    if (!session) redirect("/login");

    const isAdmin = session.user.role === "ADMIN";

    const clients = await prisma.client.findMany({
        where: isAdmin ? undefined : {
            users: {
                some: { id: session.user.id }
            }
        },
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
        <ProjectList
            clients={clients}
            userRole={session.user.role}
        />
    );
}
