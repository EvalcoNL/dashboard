export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import ProjectOnboardingWizard from "@/components/project/ProjectOnboardingWizard";

export default async function OnboardingPage() {
    const session = await auth();
    if (!session) redirect("/login");

    return <ProjectOnboardingWizard />;
}
