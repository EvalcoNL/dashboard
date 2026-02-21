export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import ClientForm from "@/components/ClientForm";

export default async function NewClientPage() {
    const session = await auth();
    if (!session) redirect("/login");
    if (session.user.role !== "ADMIN") redirect("/dashboard");

    return <ClientForm />;
}
