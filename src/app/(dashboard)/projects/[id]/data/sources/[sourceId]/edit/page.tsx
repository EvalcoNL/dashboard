export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";

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
        where: { id: sourceId, projectId: id, type: "DOMAIN" }
    });

    if (!source) notFound();

    // Redirect to Web Monitoring page with 'settings' tab open
    redirect(`/projects/${id}/monitoring/web/${sourceId}?tab=settings`);
}
