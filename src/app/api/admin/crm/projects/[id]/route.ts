import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

// PUT — update project CRM fields
export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session || session.user?.email !== "admin@evalco.nl") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { companyName, address, billingEmail, kvkNumber, vatNumber, contractStart, contractEnd, monthlyFee, crmNotes } = body;

    const project = await prisma.project.update({
        where: { id },
        data: {
            companyName,
            address,
            billingEmail,
            kvkNumber,
            vatNumber,
            contractStart: contractStart ? new Date(contractStart) : null,
            contractEnd: contractEnd ? new Date(contractEnd) : null,
            monthlyFee: monthlyFee !== undefined ? parseFloat(monthlyFee) : null,
            crmNotes,
        },
    });

    return NextResponse.json(project);
}
