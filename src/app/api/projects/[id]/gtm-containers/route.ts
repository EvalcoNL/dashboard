import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GTM Container monitoring API.
 * GET: Retrieve previously scanned container data.
 * POST: Scan domains for GTM containers and tags.
 */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: projectId } = await params;

    // For now, return stored container data from memory cache
    // In production, this would query from a database table
    const cached = containerCache.get(projectId);
    return NextResponse.json({
        success: true,
        containers: cached || [],
    });
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: projectId } = await params;
    const body = await request.json();
    const { domains } = body;

    if (!domains || !Array.isArray(domains)) {
        return NextResponse.json({ error: "Missing domains" }, { status: 400 });
    }

    const containers = [];

    for (const domain of domains) {
        try {
            // Scan the domain's HTML for GTM containers
            const url = domain.startsWith("http") ? domain : `https://${domain}`;
            const response = await fetch(url, {
                headers: { "User-Agent": "Evalco GTM Monitor/1.0" },
                signal: AbortSignal.timeout(10000),
            });

            if (!response.ok) {
                containers.push({
                    containerId: "—",
                    domain,
                    status: "not_found",
                    lastChecked: new Date().toISOString(),
                    tagCount: 0,
                    tags: [],
                });
                continue;
            }

            const html = await response.text();

            // Extract GTM container IDs
            const gtmMatches = html.match(/GTM-[A-Z0-9]+/g) || [];
            const uniqueContainerIds = [...new Set(gtmMatches)];

            // Detect common tracking tags from the page HTML
            const detectedTags = detectTags(html);

            if (uniqueContainerIds.length === 0) {
                containers.push({
                    containerId: "Geen GTM",
                    domain,
                    status: "not_found",
                    lastChecked: new Date().toISOString(),
                    tagCount: detectedTags.length,
                    tags: detectedTags,
                });
            } else {
                for (const containerId of uniqueContainerIds) {
                    containers.push({
                        containerId,
                        domain,
                        status: "active" as const,
                        lastChecked: new Date().toISOString(),
                        tagCount: detectedTags.length,
                        tags: detectedTags,
                    });
                }
            }
        } catch {
            containers.push({
                containerId: "—",
                domain,
                status: "inactive",
                lastChecked: new Date().toISOString(),
                tagCount: 0,
                tags: [],
            });
        }
    }

    // Cache results
    containerCache.set(projectId, containers);

    return NextResponse.json({ success: true, containers });
}

// ──────────────────────────────────────────────────────────────
// Tag Detection Logic
// ──────────────────────────────────────────────────────────────

function detectTags(html: string) {
    const tags: {
        id: string;
        name: string;
        type: string;
        status: "firing" | "not_firing";
        lastFired: string | null;
    }[] = [];

    // Google Analytics (GA4)
    const ga4Matches = html.match(/G-[A-Z0-9]+/g);
    if (ga4Matches) {
        for (const id of [...new Set(ga4Matches)]) {
            tags.push({
                id,
                name: `Google Analytics 4 (${id})`,
                type: "Google Analytics",
                status: "firing",
                lastFired: new Date().toISOString(),
            });
        }
    }

    // Universal Analytics
    const uaMatches = html.match(/UA-\d{4,}-\d{1,4}/g);
    if (uaMatches) {
        for (const id of [...new Set(uaMatches)]) {
            tags.push({
                id,
                name: `Universal Analytics (${id})`,
                type: "Google Analytics (Legacy)",
                status: "firing",
                lastFired: new Date().toISOString(),
            });
        }
    }

    // Google Ads Conversion
    const gadsMatches = html.match(/AW-\d+/g);
    if (gadsMatches) {
        for (const id of [...new Set(gadsMatches)]) {
            tags.push({
                id,
                name: `Google Ads (${id})`,
                type: "Google Ads",
                status: "firing",
                lastFired: new Date().toISOString(),
            });
        }
    }

    // Facebook Pixel
    if (html.includes("fbq(") || html.includes("connect.facebook.net")) {
        const fbMatches = html.match(/fbq\(\s*['"]init['"],\s*['"](\d+)['"]/g);
        const fbIds = fbMatches
            ? [...new Set(fbMatches.map(m => m.match(/['"](\d+)['"]/)?.[1] || "unknown"))]
            : ["detected"];
        for (const id of fbIds) {
            tags.push({
                id: `fb-${id}`,
                name: `Facebook Pixel (${id})`,
                type: "Facebook / Meta",
                status: "firing",
                lastFired: new Date().toISOString(),
            });
        }
    }

    // LinkedIn Insight
    if (html.includes("snap.licdn.com") || html.includes("_linkedin_partner_id")) {
        tags.push({
            id: "linkedin-insight",
            name: "LinkedIn Insight Tag",
            type: "LinkedIn",
            status: "firing",
            lastFired: new Date().toISOString(),
        });
    }

    // Hotjar
    if (html.includes("hotjar.com") || html.includes("hj(")) {
        tags.push({
            id: "hotjar",
            name: "Hotjar",
            type: "Heatmap & Analytics",
            status: "firing",
            lastFired: new Date().toISOString(),
        });
    }

    // Microsoft Clarity
    if (html.includes("clarity.ms")) {
        tags.push({
            id: "ms-clarity",
            name: "Microsoft Clarity",
            type: "Heatmap & Analytics",
            status: "firing",
            lastFired: new Date().toISOString(),
        });
    }

    return tags;
}

// ──────────────────────────────────────────────────────────────
// Simple In-Memory Cache
// ──────────────────────────────────────────────────────────────
const containerCache = new Map<string, any[]>();
