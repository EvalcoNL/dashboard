import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

// GET /api/admin/crm/overview — CRM dashboard stats
export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session || session.user?.email !== "e.v.lieshout@evalco.nl") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const [projects, invoices] = await Promise.all([
        prisma.project.findMany({
            select: {
                id: true,
                name: true,
                companyName: true,
                monthlyFee: true,
                contractStart: true,
                contractEnd: true,
                _count: { select: { contacts: true, invoices: true } },
            },
        }),
        prisma.invoice.findMany({
            select: {
                amount: true,
                vatAmount: true,
                status: true,
                paidAt: true,
                invoiceDate: true,
            },
        }),
    ]);

    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    const totalRevenue = invoices
        .filter((i) => i.status === "BETAALD")
        .reduce((sum, i) => sum + i.amount, 0);

    const monthlyRevenue = invoices
        .filter((i) => i.status === "BETAALD" && i.paidAt &&
            i.paidAt.getMonth() === thisMonth && i.paidAt.getFullYear() === thisYear)
        .reduce((sum, i) => sum + i.amount, 0);

    const openInvoices = invoices.filter((i) => i.status === "VERZONDEN");
    const openAmount = openInvoices.reduce((sum, i) => sum + i.amount, 0);

    const overdueInvoices = invoices.filter(
        (i) => i.status === "VERLOPEN"
    );
    const overdueAmount = overdueInvoices.reduce((sum, i) => sum + i.amount, 0);

    const activeContracts = projects.filter(
        (p) => p.contractStart && (!p.contractEnd || p.contractEnd > now)
    ).length;

    const monthlyRecurring = projects.reduce(
        (sum, p) => sum + (p.monthlyFee || 0), 0
    );

    return NextResponse.json({
        totalRevenue,
        monthlyRevenue,
        openAmount,
        openInvoiceCount: openInvoices.length,
        overdueAmount,
        overdueCount: overdueInvoices.length,
        activeContracts,
        monthlyRecurring,
        totalClients: projects.length,
    });
}
