export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import DashboardHome from "@/components/DashboardHome";

export default async function DashboardPage() {
    const session = await auth();
    if (!session) redirect("/login");

    // eslint-disable-next-line react-hooks/purity
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    const clients = await prisma.client.findMany({
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

    return <DashboardHome clients={clients} userName={session.user.name} />;
}
