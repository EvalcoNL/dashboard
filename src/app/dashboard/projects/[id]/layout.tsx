import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";

export default async function ClientLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ id: string }>;
}) {
    const session = await auth();
    if (!session) redirect("/login");

    const { id } = await params;

    // Wait, let's make sure the client exists first.
    // We already do this in most pages, but it's simpler to do the auth check here.
    if (session.user.role !== "ADMIN") {
        const clientAccess = await prisma.client.findFirst({
            where: {
                id,
                users: {
                    some: { id: session.user.id },
                },
            },
        });

        if (!clientAccess) {
            return notFound();
        }
    }

    return <>{children}</>;
}
