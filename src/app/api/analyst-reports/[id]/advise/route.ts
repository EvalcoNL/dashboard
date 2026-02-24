export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { aiService } from "@/lib/services/ai-service";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id: analystReportId } = await params;

        const analystReport = await prisma.analystReport.findUnique({
            where: { id: analystReportId }
        });

        if (!analystReport) {
            return NextResponse.json({ error: "Analysis report not found" }, { status: 404 });
        }

        // Generate Advice
        const advice = await aiService.generateAdvisorReport(
            analystReport.clientId,
            analystReport.reportJson as Record<string, unknown>
        );

        // Save to DB
        const savedAdvice = await prisma.advisorReport.create({
            data: {
                analystReportId,
                adviceJson: advice,
                status: "DRAFT",
            }
        });

        return NextResponse.json(savedAdvice);
    } catch (error: any) {
        console.error("Advice Generation Failed:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
