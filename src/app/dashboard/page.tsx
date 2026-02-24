export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import DashboardHome from "@/components/dashboard/DashboardHome";

export default async function DashboardPage() {
    const session = await auth();
    if (!session) redirect("/login");

    // eslint-disable-next-line react-hooks/purity
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    const isAdmin = session.user.role === "ADMIN";

    const clients = await prisma.client.findMany({
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
            campaignMetrics: {
                where: {
                    date: {
                        gte: fourteenDaysAgo,
                    },
                },
                orderBy: { date: "desc" },
            },
        },
        orderBy: { name: "asc" },
    });

    // Auto-redirect if user is not admin and only has 1 client
    if (!isAdmin && clients.length === 1) {
        redirect(`/dashboard/projects/${clients[0].id}`);
    }

    return <DashboardHome clients={clients} userName={session.user.name} />;
}
