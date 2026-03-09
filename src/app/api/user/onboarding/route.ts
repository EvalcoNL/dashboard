import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { ONBOARDING_STEPS } from "@/lib/onboarding-steps";

export const dynamic = "force-dynamic";

// GET: Retrieve onboarding progress
export async function GET() {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const progress = await prisma.onboardingProgress.findMany({
        where: { userId: session.user.id },
    });

    const progressMap = Object.fromEntries(progress.map(p => [p.step, p]));

    const steps = ONBOARDING_STEPS.map(step => ({
        id: step.id,
        title: step.title,
        description: step.description,
        checkDescription: step.checkDescription,
        completed: progressMap[step.id]?.completed || false,
        skipped: progressMap[step.id]?.skipped || false,
        completedAt: progressMap[step.id]?.completedAt || null,
    }));

    const completedCount = steps.filter(s => s.completed || s.skipped).length;
    const totalCount = steps.length;
    const allDone = completedCount === totalCount;

    return NextResponse.json({
        success: true,
        steps,
        completedCount,
        totalCount,
        allDone,
    });
}

// PUT: Mark a step as completed or skipped
export async function PUT(request: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { step, action } = body; // action: "complete" | "skip" | "reset"

    if (!step || !ONBOARDING_STEPS.find(s => s.id === step)) {
        return NextResponse.json({ error: "Invalid step" }, { status: 400 });
    }

    if (action === "reset") {
        await prisma.onboardingProgress.deleteMany({
            where: { userId: session.user.id, step },
        });
    } else {
        await prisma.onboardingProgress.upsert({
            where: {
                userId_step: {
                    userId: session.user.id,
                    step,
                },
            },
            create: {
                userId: session.user.id,
                step,
                completed: action === "complete",
                skipped: action === "skip",
                completedAt: new Date(),
            },
            update: {
                completed: action === "complete",
                skipped: action === "skip",
                completedAt: new Date(),
            },
        });
    }

    return NextResponse.json({ success: true });
}
