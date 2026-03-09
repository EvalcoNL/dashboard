import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { evaluateRule } from "@/lib/rule-engine";

export const dynamic = "force-dynamic";

// GET: Get a single rule
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; ruleId: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { ruleId } = await params;

    const rule = await prisma.rule.findUnique({
        where: { id: ruleId },
        include: {
            executions: {
                orderBy: { triggeredAt: "desc" },
                take: 10,
            },
        },
    });

    if (!rule) {
        return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, rule });
}

// PUT: Update a rule
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; ruleId: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { ruleId } = await params;
    const body = await request.json();

    const { name, description, category, conditions, actions, schedule, cooldownMinutes, enabled } = body;

    const rule = await prisma.rule.update({
        where: { id: ruleId },
        data: {
            ...(name !== undefined && { name }),
            ...(description !== undefined && { description }),
            ...(category !== undefined && { category }),
            ...(conditions !== undefined && { conditions }),
            ...(actions !== undefined && { actions }),
            ...(schedule !== undefined && { schedule }),
            ...(cooldownMinutes !== undefined && { cooldownMinutes }),
            ...(enabled !== undefined && { enabled }),
        },
    });

    return NextResponse.json({ success: true, rule });
}

// DELETE: Delete a rule
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; ruleId: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { ruleId } = await params;

    await prisma.rule.delete({ where: { id: ruleId } });

    return NextResponse.json({ success: true });
}
