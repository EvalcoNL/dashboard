export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import AccessManagement from "@/components/access/AccessManagement";

export default async function AccessManagementPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ sourceId?: string }>;
}) {
    const session = await auth();
    if (!session) redirect("/login");

    const { id } = await params;
    const { sourceId } = await searchParams;

    const client = await prisma.project.findUnique({
        where: { id },
        include: {
            dataSources: {
                include: {
                    linkedAccounts: true,
                },
            },
        },
    });

    if (!client) notFound();

    // If sourceId filter is applied, find the matching source
    const filteredSources = sourceId
        ? client.dataSources.filter((ds) => ds.id === sourceId)
        : client.dataSources;

    const filterSourceName = sourceId
        ? filteredSources[0]?.name || filteredSources[0]?.type || undefined
        : undefined;

    // Load person aliases for this client
    const aliases = await prisma.personAlias.findMany({
        where: { projectId: id },
    });
    // Build a lookup: alias → primaryEmail
    const aliasMap = new Map<string, string>();
    for (const a of aliases) {
        aliasMap.set(a.alias.toLowerCase(), a.primaryEmail.toLowerCase());
    }

    // Helper: resolve an email/name to its primary identity
    const resolveEmail = (email: string): string => {
        return aliasMap.get(email.toLowerCase()) || email;
    };

    // Group the accesses by resolved email
    const peopleMap = new Map<
        string,
        {
            name: string;
            email: string;
            accesses: Array<{
                dataSourceId: string;
                dataSourceName: string;
                dataSourceType: string;
                accountId: string;
                accountRole: string | null;
                accountStatus: string;
                accountKind?: string;
            }>;
        }
    >();

    filteredSources.forEach((ds) => {
        ds.linkedAccounts.forEach((acc) => {
            const kind = (acc as any).kind || "USER";
            const resolvedEmail = resolveEmail(acc.email);
            if (!peopleMap.has(resolvedEmail)) {
                peopleMap.set(resolvedEmail, {
                    name: acc.name || resolvedEmail.split("@")[0],
                    email: resolvedEmail,
                    accesses: [],
                });
            }
            peopleMap.get(resolvedEmail)!.accesses.push({
                dataSourceId: ds.id,
                dataSourceName: ds.name || ds.type,
                dataSourceType: ds.type,
                accountId: acc.id,
                accountRole: acc.role,
                accountStatus: acc.status,
                accountKind: kind,
            });
        });
    });

    const people = Array.from(peopleMap.values());

    // Build a list of available apps for the filter and invite features
    const availableApps = client.dataSources.map((ds) => ({
        id: ds.id,
        name: ds.name || ds.type,
        type: ds.type,
    }));

    return <AccessManagement projectId={id} people={people} filterSourceName={filterSourceName} availableApps={availableApps} />;
}
