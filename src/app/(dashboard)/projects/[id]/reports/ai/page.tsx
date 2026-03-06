export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import ReportClient from "../../report/ReportClient";
import { hasNormalizedData } from "@/lib/normalized-helpers";

export default async function AIReportsPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const session = await auth();
    if (!session) redirect("/login");

    const { id } = await params;

    const client = await prisma.project.findUnique({
        where: { id },
        include: {
            analystReports: {
                orderBy: { createdAt: "desc" },
                take: 1,
                include: { advisorReport: true },
            },
        }
    });

    if (!client) notFound();

    const hasData = await hasNormalizedData(id);

    const clientWithMetrics = {
        ...client,
        campaignMetrics: hasData ? [{}] : [],
    };

    return <ReportClient project={clientWithMetrics} userRole={session.user.role} />;
}
