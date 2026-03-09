import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

// GET — list invoices (optionally filter by projectId, status)
// POST — create invoice
export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session || session.user?.email !== "admin@evalco.nl") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const status = searchParams.get("status");

    const where: any = {};
    if (projectId) where.projectId = projectId;
    if (status) where.status = status;

    const invoices = await prisma.invoice.findMany({
        where,
        include: { project: { select: { name: true, companyName: true } } },
        orderBy: { invoiceDate: "desc" },
    });

    return NextResponse.json(invoices);
}

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session || session.user?.email !== "admin@evalco.nl") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { projectId, invoiceNumber, amount, vatAmount, status, invoiceDate, dueDate, description, notes } = body;

    if (!projectId || !invoiceNumber || amount === undefined || !invoiceDate || !dueDate) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const invoice = await prisma.invoice.create({
        data: {
            projectId,
            invoiceNumber,
            amount: parseFloat(amount),
            vatAmount: vatAmount ? parseFloat(vatAmount) : 0,
            status: status || "CONCEPT",
            invoiceDate: new Date(invoiceDate),
            dueDate: new Date(dueDate),
            description,
            notes,
        },
    });

    return NextResponse.json(invoice, { status: 201 });
}
