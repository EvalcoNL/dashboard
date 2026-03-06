export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

// GET: Fetch all person aliases for a client
export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const projectId = req.nextUrl.searchParams.get("projectId");
    if (!projectId) return NextResponse.json({ error: "Missing projectId" }, { status: 400 });

    const aliases = await prisma.personAlias.findMany({
        where: { projectId },
        orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(aliases);
}

// POST: Create a new person alias (link email to name, or merge two emails)
export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { projectId, primaryEmail, alias } = body;

    if (!projectId || !primaryEmail || !alias) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (primaryEmail.toLowerCase() === alias.toLowerCase()) {
        return NextResponse.json({ error: "Primary email and alias cannot be the same" }, { status: 400 });
    }

    try {
        // Check if this alias is already a primary for other aliases
        const existingAsPrimary = await prisma.personAlias.findMany({
            where: { projectId, primaryEmail: alias },
        });

        // If the alias is already being used as a primary, re-point those to the new primary
        if (existingAsPrimary.length > 0) {
            await prisma.personAlias.updateMany({
                where: { projectId, primaryEmail: alias },
                data: { primaryEmail: primaryEmail.toLowerCase() },
            });
        }

        // Create the alias
        const personAlias = await prisma.personAlias.upsert({
            where: {
                projectId_alias: { projectId, alias: alias.toLowerCase() },
            },
            create: {
                projectId,
                primaryEmail: primaryEmail.toLowerCase(),
                alias: alias.toLowerCase(),
            },
            update: {
                primaryEmail: primaryEmail.toLowerCase(),
            },
        });

        // Also update the LinkedAccount records: set the email to primaryEmail
        // for any accounts that have the alias as email
        await prisma.linkedAccount.updateMany({
            where: {
                email: alias,
                dataSource: { projectId },
            },
            data: { email: primaryEmail.toLowerCase() },
        });

        return NextResponse.json(personAlias, { status: 201 });
    } catch (error: any) {
        console.error("[PersonAlias] Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE: Remove a person alias
export async function DELETE(req: NextRequest) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    await prisma.personAlias.delete({ where: { id } });

    return NextResponse.json({ ok: true });
}
