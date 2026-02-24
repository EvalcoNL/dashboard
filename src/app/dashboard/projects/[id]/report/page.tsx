export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import ReportClient from "./ReportClient";

export default async function ClientReportPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const session = await auth();
    if (!session) redirect("/login");

    const { id } = await params;

    // We only need basic campaign metrics to check `hasCampaignData`
    const client = await prisma.client.findUnique({
        where: { id },
        include: {
            campaignMetrics: {
                take: 1,
            },
            analystReports: {
                orderBy: { createdAt: "desc" },
                take: 1,
                include: { advisorReport: true },
            },
        }
    });

    if (!client) notFound();

    return <ReportClient client={client} userRole={session.user.role} />;
}
