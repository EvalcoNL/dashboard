import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function RulesPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id: projectId } = await params;
    redirect(`/projects/${projectId}/monitoring/incidents?tab=rules`);
}
