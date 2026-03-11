export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import DashboardHome from "@/components/dashboard/DashboardHome";
import { queryNormalizedMetrics } from "@/lib/normalized-helpers";
import { cached } from "@/lib/cache";

export default async function DashboardPage() {
    const session = await auth();
    if (!session) redirect("/login");

    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    const isAdmin = session.user.role === "ADMIN";

    const clients = await prisma.project.findMany({
        where: isAdmin ? undefined : {
            users: {
                some: { id: session.user.id }
            }
        },
        include: {
            analystReports: {
                orderBy: { createdAt: "desc" },
                take: 1,
                include: {
                    advisorReport: true,
                },
            },
        },
        orderBy: { name: "asc" },
    });

    // Fetch normalized metrics for each client (cached for 5 minutes)
    const clientsWithMetrics = await Promise.all(
        clients.map(async (client) => {
            const campaignMetrics = await cached(
                `dashboard:metrics:${client.id}`,
                () => queryNormalizedMetrics(client.id, fourteenDaysAgo),
                5 * 60 * 1000 // 5 min TTL
            );
            return { ...client, campaignMetrics };
        })
    );

    // Redirect new users without projects to onboarding
    if (!isAdmin && clientsWithMetrics.length === 0) {
        redirect("/projects/onboarding");
    }

    // Auto-redirect if user is not admin and only has 1 client
    if (!isAdmin && clientsWithMetrics.length === 1) {
        redirect(`/projects/${clientsWithMetrics[0].id}`);
    }

    // Get user's dashboard view preference
    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { dashboardView: true },
    });

    return <DashboardHome projects={clientsWithMetrics} userName={session.user.name} defaultView={(user?.dashboardView as "cards" | "table") || "cards"} />;
}
