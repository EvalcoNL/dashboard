export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import EditDomainForm from "./EditDomainForm";

export default async function EditDomainSourcePage({
    params,
}: {
    params: Promise<{ id: string; sourceId: string }>;
}) {
    const session = await auth();
    if (!session) redirect("/login");

    const { id, sourceId } = await params;

    // Fetch the specific data source
    const source = await prisma.dataSource.findUnique({
        where: { id: sourceId, clientId: id, type: "DOMAIN" }
    });

    if (!source) notFound();

    return (
        <EditDomainForm
            clientId={id}
            sourceId={source.id}
            initialDomain={source.name || source.externalId}
            initialConfig={source.config as any}
        />
    );
}
