import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { evaluateRule } from "@/lib/rule-engine";

export const dynamic = "force-dynamic";

// POST: Test/dry-run a rule
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; ruleId: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { ruleId } = await params;

    const result = await evaluateRule(ruleId);

    return NextResponse.json({
        success: true,
        result,
    });
}
