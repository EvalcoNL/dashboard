export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import ProjectOnboardingWizard from "@/components/project/ProjectOnboardingWizard";

export default async function NewProjectPage() {
    const session = await auth();
    if (!session) redirect("/login");
    if (session.user.role !== "ADMIN") redirect("/dashboard");

    return <ProjectOnboardingWizard />;
}
