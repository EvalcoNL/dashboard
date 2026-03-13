import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/api-guard";

/**
 * GET — List all account groups
 */
export async function GET() {
    try {
        const [, authError] = await requireAdmin();
        if (authError) return authError;

        const groups = await prisma.accountGroup.findMany({
            orderBy: { createdAt: "desc" },
            include: {
                members: {
                    include: {
                        user: {
                            select: { id: true, name: true, email: true, role: true },
                        },
                    },
                },
                projects: {
                    select: { id: true, name: true },
                },
            },
        });

        return NextResponse.json({ success: true, groups });
    } catch (error) {
        console.error("[GET /api/admin/account-groups]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

/**
 * POST — Create a new account group
 */
export async function POST(req: NextRequest) {
    try {
        const [, authError] = await requireAdmin();
        if (authError) return authError;

        const { name } = await req.json();

        if (!name || typeof name !== "string" || !name.trim()) {
            return NextResponse.json({ error: "Naam is verplicht." }, { status: 400 });
        }

        // Generate slug from name
        const slug = name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");

        // Check for duplicate slug
        const existing = await prisma.accountGroup.findUnique({ where: { slug } });
        if (existing) {
            return NextResponse.json(
                { error: "Er bestaat al een accountgroep met een vergelijkbare naam." },
                { status: 409 }
            );
        }

        const group = await prisma.accountGroup.create({
            data: { name: name.trim(), slug },
            include: {
                members: {
                    include: {
                        user: { select: { id: true, name: true, email: true, role: true } },
                    },
                },
                projects: { select: { id: true, name: true } },
            },
        });

        return NextResponse.json({ success: true, group }, { status: 201 });
    } catch (error) {
        console.error("[POST /api/admin/account-groups]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
