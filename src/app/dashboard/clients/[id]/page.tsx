export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import ClientDetail from "@/components/ClientDetail";

export default async function ClientDetailPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ days?: string }>;
}) {
    const session = await auth();
    if (!session) redirect("/login");

    const { id } = await params;
    const { days: daysParam } = await searchParams;
    const days = parseInt(daysParam || "7", 10);
    const totalDaysNeeded = days * 2;

    // Calculate dates starting from "Yesterday" to avoid incomplete "Today" data
    const now = new Date();
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
    const startDate = new Date(yesterday.getTime() - totalDaysNeeded * 24 * 60 * 60 * 1000);

    const client = await prisma.client.findUnique({
        where: { id },
        include: {
            dataSources: true,
            campaignMetrics: {
                where: {
                    date: {
                        gte: startDate,
                        lte: yesterday
                    },
                },
                orderBy: { date: "desc" },
            },
            analystReports: {
                orderBy: { createdAt: "desc" },
                take: 1,
                include: { advisorReport: true },
            },
            merchantCenterHealth: {
                orderBy: { date: "desc" },
                take: 1,
            },
        },
    });

    if (!client) notFound();

    // Get daily aggregated data for chart
    const dailyMetrics = await prisma.campaignMetric.groupBy({
        by: ["date"],
        where: {
            clientId: id,
            date: {
                gte: startDate,
                lte: yesterday
            },
        },
        _sum: {
            spend: true,
            conversions: true,
            conversionValue: true,
            clicks: true,
            impressions: true,
        },
        orderBy: { date: "asc" },
    });

    return (
        <ClientDetail
            client={client}
            dailyMetrics={dailyMetrics}
            userRole={session.user.role}
            initialDays={days}
        />
    );
}
