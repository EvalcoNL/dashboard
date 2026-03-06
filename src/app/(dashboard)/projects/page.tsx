export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import ProjectList from "@/components/project/ProjectList";
import { countNormalizedRecords } from "@/lib/normalized-helpers";

export default async function ClientsPage() {
    const session = await auth();
    if (!session) redirect("/login");

    const isAdmin = session.user.role === "ADMIN";

    const clients = await prisma.project.findMany({
        where: isAdmin ? undefined : {
            users: {
                some: { id: session.user.id }
            }
        },
        include: {
            dataSources: {
                where: { active: true },
            },
        },
        orderBy: { name: "asc" },
    });

    // Fetch normalized metric counts for each client
    const clientsWithCounts = await Promise.all(
        clients.map(async (client) => {
            const metricCount = await countNormalizedRecords(client.id);
            return {
                ...client,
                _count: { campaignMetrics: metricCount },
            };
        })
    );

    return (
        <ProjectList
            projects={clientsWithCounts}
            userRole={session.user.role}
        />
    );
}
