export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import NewDataSourceClient from "./NewDataSourceClient";

export default async function NewDataSourcePage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const session = await auth();
    if (!session) redirect("/login");

    const { id } = await params;
    const client = await prisma.client.findUnique({
        where: { id }
    });

    if (!client) notFound();

    return <NewDataSourceClient clientId={id} clientName={client.name} />;
}
