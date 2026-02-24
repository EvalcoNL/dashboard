import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { performUptimeCheck } from "@/lib/services/domain-checker";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        // Perform the check synchronously for this specific domain
        const result = await performUptimeCheck(id);

        return NextResponse.json({ success: true, result });
    } catch (error: any) {
        console.error("Failed to manually sync domain:", error);
        return NextResponse.json(
            { error: error.message || "Failed to sync domain" },
            { status: 500 }
        );
    }
}
