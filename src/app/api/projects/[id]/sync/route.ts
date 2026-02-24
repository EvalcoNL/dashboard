export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { syncService } from "@/lib/services/sync-service";
import { auth } from "@/lib/auth";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { id } = await params;
        const result = await syncService.syncClientData(id);
        return NextResponse.json(result);
    } catch (error: any) {
        console.error("Sync Error:", error);
        return NextResponse.json({ error: error.message || "Fout bij synchronisatie" }, { status: 500 });
    }
}
