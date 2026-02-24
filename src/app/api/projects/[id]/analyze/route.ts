export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { aiService } from "@/lib/services/ai-service";
import { aggregateCampaigns } from "@/lib/services/kpi-engine";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id: clientId } = await params;

        // 1. Fetch data
        const client = await prisma.client.findUnique({
            where: { id: clientId },
            include: {
                campaignMetrics: {
                    orderBy: { date: "desc" },
                    take: 700
                },
                merchantCenterHealth: {
                    orderBy: { date: "desc" },
                    take: 1
                },
                analystReports: {
                    orderBy: { createdAt: "desc" },
                    take: 1
                }
            }
        }) as any;

        if (!client) {
            return NextResponse.json({ error: "Client not found" }, { status: 404 });
        }

        // 2. Prepare data for AI
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const currentMetrics = client.campaignMetrics.filter((m: any) => new Date(m.date) >= sevenDaysAgo);
        const currentPeriod = aggregateCampaigns(currentMetrics as any);

        const aiInput = {
            clientName: client.name,
            industry: client.industryType,
            targetType: client.targetType,
            targetValue: client.targetValue,
            currentPerformance: currentPeriod,
            merchantHealth: client.merchantCenterHealth[0] || null,
        };

        // 3. Generate Report
        const report = await aiService.generateAnalystReport(clientId, aiInput);

        // 4. Calculate trend
        let trendDirection = "STABLE";
        if (client.analystReports[0]) {
            const prevScore = (client.analystReports[0] as any).healthScore;
            if (report.healthScore > prevScore + 5) trendDirection = "IMPROVING";
            else if (report.healthScore < prevScore - 5) trendDirection = "DECLINING";
        }

        // 5. Save to DB
        const savedReport = await prisma.analystReport.create({
            data: {
                clientId,
                periodStart: sevenDaysAgo,
                periodEnd: now,
                healthScore: report.healthScore,
                healthScoreBreakdown: report.healthScoreBreakdown,
                deviationPct: 0,
                trendDirection,
                reportJson: report as any,
                inputJson: aiInput as any,
            }
        });

        return NextResponse.json(savedReport);
    } catch (error: any) {
        console.error("Analysis Failed:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
