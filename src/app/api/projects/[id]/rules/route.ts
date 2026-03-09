import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET: List all rules for a project
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = await params;

    const rules = await prisma.rule.findMany({
        where: { projectId },
        orderBy: { createdAt: "desc" },
        include: {
            executions: {
                orderBy: { triggeredAt: "desc" },
                take: 1,
            },
        },
    });

    return NextResponse.json({
        success: true,
        rules: rules.map(rule => ({
            ...rule,
            lastExecution: rule.executions[0] || null,
            executions: undefined,
        })),
    });
}

// POST: Create a new rule
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = await params;
    const body = await request.json();

    const { name, description, category, conditions, actions, schedule, cooldownMinutes } = body;

    if (!name || !conditions || !actions) {
        return NextResponse.json({ error: "Naam, condities en acties zijn verplicht" }, { status: 400 });
    }

    const rule = await prisma.rule.create({
        data: {
            projectId,
            name,
            description: description || null,
            category: category || "custom",
            conditions,
            actions,
            schedule: schedule || "DAILY",
            cooldownMinutes: cooldownMinutes || 60,
            createdBy: session.user.id,
        },
    });

    return NextResponse.json({ success: true, rule });
}
