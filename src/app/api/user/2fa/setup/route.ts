export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateSecret, generateURI } from "otplib";
import qrcode from "qrcode";
import { prisma } from "@/lib/db";

export async function POST() {
    const session = await auth();
    if (!session || !session.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: session.user.id }
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const secret = generateSecret();
        const otpauth = generateURI({
            issuer: "Evalco Analyst",
            label: user.email,
            secret
        });
        const qrCodeUrl = await qrcode.toDataURL(otpauth);

        return NextResponse.json({ secret, qrCodeUrl });
    } catch (error: any) {
        console.error("2FA setup error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
