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

    const results: any[] = [];
    let totalEvaluated = 0;
    let totalTriggered = 0;

    // Evaluate rules in parallel with concurrency limit
    const CONCURRENCY = 5;
    for (let i = 0; i < projects.length; i += CONCURRENCY) {
        const batch = projects.slice(i, i + CONCURRENCY);
        const batchResults = await Promise.allSettled(
            batch.map(async (project) => {
                const projectResult = await evaluateProjectRules(project.id);
                return {
                    projectId: project.id,
                    projectName: project.name,
                    ...projectResult,
                };
            })
        );

        for (const result of batchResults) {
            if (result.status === 'fulfilled') {
                totalEvaluated += result.value.evaluated;
                totalTriggered += result.value.triggered;
                results.push(result.value);
            } else {
                console.error('[RuleEval] Project evaluation failed:', result.reason);
            }
        }
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
