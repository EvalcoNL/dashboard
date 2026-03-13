import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import CrmDashboard from "@/components/admin/CrmDashboard";

export default async function CrmPage() {
    const session = await auth();
    if (!session || session.user?.email !== "e.v.lieshout@evalco.nl") {
        redirect("/");
    }

    const projects = await prisma.project.findMany({
        select: {
            id: true,
            name: true,
            companyName: true,
            address: true,
            billingEmail: true,
            kvkNumber: true,
            vatNumber: true,
            contractStart: true,
            contractEnd: true,
            monthlyFee: true,
            crmNotes: true,
            _count: { select: { contacts: true, invoices: true, users: true } },
        },
        orderBy: { name: "asc" },
    });

    const invoices = await prisma.invoice.findMany({
        include: { project: { select: { name: true, companyName: true } } },
        orderBy: { invoiceDate: "desc" },
        take: 50,
    });

    const contacts = await prisma.contact.findMany({
        include: { project: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
    });

    // Serialize dates for client component
    const serializedProjects = projects.map((p) => ({
        ...p,
        contractStart: p.contractStart?.toISOString() || null,
        contractEnd: p.contractEnd?.toISOString() || null,
    }));

    const serializedInvoices = invoices.map((i) => ({
        ...i,
        invoiceDate: i.invoiceDate.toISOString(),
        dueDate: i.dueDate.toISOString(),
        paidAt: i.paidAt?.toISOString() || null,
        createdAt: i.createdAt.toISOString(),
    }));

    const serializedContacts = contacts.map((c) => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
    }));

    return (
        <CrmDashboard
            projects={serializedProjects}
            invoices={serializedInvoices}
            contacts={serializedContacts}
        />
    );
}
