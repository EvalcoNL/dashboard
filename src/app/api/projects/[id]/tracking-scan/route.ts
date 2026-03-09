export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

/**
 * POST /api/projects/[id]/tracking-scan
 * Scans domains for tracking pixel presence (GTM, GA4, Meta).
 */
export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    // Rate limit: 10 scans per minute
    const rateLimited = checkRateLimit(`tracking-scan:${getClientIp(req)}`, 10, 60_000);
    if (rateLimited) return rateLimited;

    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { domainId } = await req.json();

    if (!domainId) {
        return NextResponse.json({ error: "domainId is required" }, { status: 400 });
    }

    try {
        // Fetch the domain data source
        const domain = await prisma.dataSource.findFirst({
            where: { id: domainId, projectId: id },
        });

        if (!domain) {
            return NextResponse.json({ error: "Domain niet gevonden" }, { status: 404 });
        }

        const domainUrl = domain.externalId.startsWith("http")
            ? domain.externalId
            : `https://${domain.externalId}`;

        // Fetch the page HTML
        let html = "";
        let fetchError = null;
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000);
            const response = await fetch(domainUrl, {
                signal: controller.signal,
                headers: {
                    "User-Agent": "Mozilla/5.0 (compatible; EvalcoBot/1.0)",
                },
            });
            clearTimeout(timeout);
            html = await response.text();
        } catch (err: any) {
            fetchError = err.message || "Kan website niet bereiken";
        }

        // Scan for tracking pixels
        const results = {
            gtm: false,
            ga4: false,
            meta: false,
            scannedAt: new Date().toISOString(),
            error: fetchError,
        };

        if (html) {
            // Google Tag Manager
            results.gtm = html.includes("googletagmanager.com/gtm.js") ||
                html.includes("googletagmanager.com/gtag/js") ||
                html.includes("GTM-");

            // Google Analytics 4
            results.ga4 = html.includes("gtag('config'") ||
                html.includes("gtag(\"config\"") ||
                html.includes("G-") && html.includes("gtag") ||
                html.includes("google-analytics.com") ||
                html.includes("googletagmanager.com/gtag");

            // Meta Pixel (Facebook)
            results.meta = html.includes("connect.facebook.net") ||
                html.includes("fbq(") ||
                html.includes("facebook.com/tr");
        }

        // Save results to the domain config
        const currentConfig = (domain as any).config || {};
        const scanHistory = currentConfig.scanHistory || [];
        scanHistory.unshift({
            ...results,
            timestamp: results.scannedAt,
        });
        // Keep only last 10 scans
        if (scanHistory.length > 10) scanHistory.length = 10;

        await prisma.dataSource.update({
            where: { id: domainId },
            data: {
                config: {
                    ...currentConfig,
                    lastPixelAudit: results,
                    scanHistory,
                },
            } as any,
        });

        return NextResponse.json({
            success: true,
            results,
            domain: domain.externalId,
        });
    } catch (error: unknown) {
        console.error("[TrackingScan] Error:", error);
        return NextResponse.json({ error: "Scan mislukt" }, { status: 500 });
    }
}
