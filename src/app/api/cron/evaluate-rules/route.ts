import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { evaluateProjectRules } from "@/lib/rule-engine";

export const dynamic = "force-dynamic";

// POST: Evaluate all active rules across all projects (called by cron)
export async function POST(request: NextRequest) {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const schedule = new URL(request.url).searchParams.get("schedule") || "DAILY";

    // Get all projects with active rules
    const projects = await prisma.project.findMany({
        where: {
            rules: {
                some: { enabled: true, schedule },
            },
        },
        select: { id: true, name: true },
    });

    const results = [];
    let totalEvaluated = 0;
    let totalTriggered = 0;

    for (const project of projects) {
        const projectResult = await evaluateProjectRules(project.id);
        totalEvaluated += projectResult.evaluated;
        totalTriggered += projectResult.triggered;
        results.push({
            projectId: project.id,
            projectName: project.name,
            ...projectResult,
        });
    }

    return NextResponse.json({
        success: true,
        schedule,
        projects: projects.length,
        totalEvaluated,
        totalTriggered,
        results,
    });
}
