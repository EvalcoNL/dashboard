import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { query } from "@/lib/clickhouse";

// GET — list sessions or get specific session
// POST — send a message (creates session if needed; mocks AI response)
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = await params;
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    if (sessionId) {
        const chatSession = await prisma.aiChatSession.findFirst({
            where: { id: sessionId, userId: session.user.id, projectId },
        });
        if (!chatSession) {
            return NextResponse.json({ error: "Session not found" }, { status: 404 });
        }
        return NextResponse.json({
            ...chatSession,
            messages: JSON.parse(chatSession.messages),
        });
    }

    // List all sessions for this project
    const sessions = await prisma.aiChatSession.findMany({
        where: { userId: session.user.id, projectId },
        orderBy: { updatedAt: "desc" },
        select: { id: true, title: true, createdAt: true, updatedAt: true },
        take: 50,
    });

    return NextResponse.json(sessions);
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = await params;
    const body = await req.json();
    const { message, sessionId } = body;

    if (!message || typeof message !== "string") {
        return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    // Get or create chat session
    let chatSession;
    let existingMessages: any[] = [];

    if (sessionId) {
        chatSession = await prisma.aiChatSession.findFirst({
            where: { id: sessionId, userId: session.user.id, projectId },
        });
        if (chatSession) {
            existingMessages = JSON.parse(chatSession.messages);
        }
    }

    // Add user message
    const userMsg = {
        role: "user",
        content: message,
        timestamp: new Date().toISOString(),
    };
    existingMessages.push(userMsg);

    // Generate AI response based on question context
    const aiResponse = await generateAIResponse(projectId, message);

    const assistantMsg = {
        role: "assistant",
        content: aiResponse.text,
        timestamp: new Date().toISOString(),
        chartData: aiResponse.chartData || null,
        dataTable: aiResponse.dataTable || null,
    };
    existingMessages.push(assistantMsg);

    // Derive title from first question
    const title = existingMessages.length <= 2
        ? message.slice(0, 60) + (message.length > 60 ? "..." : "")
        : undefined;

    if (chatSession) {
        await prisma.aiChatSession.update({
            where: { id: chatSession.id },
            data: {
                messages: JSON.stringify(existingMessages),
                ...(title ? { title } : {}),
            },
        });
    } else {
        chatSession = await prisma.aiChatSession.create({
            data: {
                userId: session.user.id,
                projectId,
                title: title || "Nieuwe Chat",
                messages: JSON.stringify(existingMessages),
            },
        });
    }

    return NextResponse.json({
        sessionId: chatSession.id,
        message: assistantMsg,
    });
}

// ─── AI Response Generator ──────────────────────────────────
async function generateAIResponse(
    projectId: string,
    question: string
): Promise<{ text: string; chartData?: any; dataTable?: any }> {
    const lowerQ = question.toLowerCase();

    try {
        // Performance / metrics question
        if (lowerQ.includes("performance") || lowerQ.includes("prestatie") || lowerQ.includes("kpi")) {
            const rows = await query(`
                SELECT 
                    date,
                    SUM(impressions) as impressions,
                    SUM(clicks) as clicks,
                    SUM(cost) as cost,
                    SUM(conversions) as conversions
                FROM normalized_metrics
                WHERE project_id = {projectId: String}
                AND date >= today() - 30
                GROUP BY date
                ORDER BY date
            `, { projectId });

            if (rows.length > 0) {
                const totalClicks = rows.reduce((s: number, r: any) => s + Number(r.clicks || 0), 0);
                const totalImpressions = rows.reduce((s: number, r: any) => s + Number(r.impressions || 0), 0);
                const totalCost = rows.reduce((s: number, r: any) => s + Number(r.cost || 0), 0);
                const totalConversions = rows.reduce((s: number, r: any) => s + Number(r.conversions || 0), 0);
                const ctr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : "0";
                const cpc = totalClicks > 0 ? (totalCost / totalClicks).toFixed(2) : "0";

                return {
                    text: `📊 **Performance overzicht (afgelopen 30 dagen)**\n\n• **Impressies:** ${totalImpressions.toLocaleString("nl-NL")}\n• **Clicks:** ${totalClicks.toLocaleString("nl-NL")}\n• **CTR:** ${ctr}%\n• **Kosten:** €${totalCost.toFixed(2)}\n• **CPC:** €${cpc}\n• **Conversies:** ${totalConversions.toLocaleString("nl-NL")}\n\nDe data laat ${totalClicks > 100 ? "een gezonde" : "een beperkte"} click-through rate zien.`,
                    chartData: {
                        type: "line",
                        labels: rows.map((r: any) => r.date),
                        datasets: [
                            { label: "Clicks", data: rows.map((r: any) => Number(r.clicks)), color: "#6366f1" },
                            { label: "Conversies", data: rows.map((r: any) => Number(r.conversions)), color: "#10b981" },
                        ],
                    },
                };
            }
        }

        // Cost / budget question
        if (lowerQ.includes("kosten") || lowerQ.includes("budget") || lowerQ.includes("cost") || lowerQ.includes("spend")) {
            const rows = await query(`
                SELECT 
                    date,
                    SUM(cost) as cost,
                    SUM(conversions) as conversions
                FROM normalized_metrics
                WHERE project_id = {projectId: String}
                AND date >= today() - 30
                GROUP BY date
                ORDER BY date
            `, { projectId });

            if (rows.length > 0) {
                const totalCost = rows.reduce((s: number, r: any) => s + Number(r.cost || 0), 0);
                const totalConv = rows.reduce((s: number, r: any) => s + Number(r.conversions || 0), 0);
                const cpa = totalConv > 0 ? (totalCost / totalConv).toFixed(2) : "N/A";

                return {
                    text: `💰 **Kosten analyse (afgelopen 30 dagen)**\n\n• **Totale kosten:** €${totalCost.toFixed(2)}\n• **Conversies:** ${totalConv}\n• **CPA:** €${cpa}\n• **Daggemiddelde:** €${(totalCost / Math.max(rows.length, 1)).toFixed(2)}\n\n${totalConv > 0 ? `De kosten per acquisitie liggen op €${cpa}.` : "Er zijn geen conversies geregistreerd in deze periode."}`,
                    chartData: {
                        type: "bar",
                        labels: rows.map((r: any) => r.date),
                        datasets: [
                            { label: "Kosten (€)", data: rows.map((r: any) => Number(r.cost)), color: "#f59e0b" },
                        ],
                    },
                };
            }
        }

        // Campaign / campagne question
        if (lowerQ.includes("campagne") || lowerQ.includes("campaign") || lowerQ.includes("top")) {
            const rows = await query(`
                SELECT 
                    campaign_name,
                    SUM(clicks) as clicks,
                    SUM(impressions) as impressions,
                    SUM(cost) as cost,
                    SUM(conversions) as conversions
                FROM normalized_metrics
                WHERE project_id = {projectId: String}
                AND date >= today() - 30
                GROUP BY campaign_name
                ORDER BY clicks DESC
                LIMIT 10
            `, { projectId });

            if (rows.length > 0) {
                return {
                    text: `📋 **Top ${rows.length} campagnes (afgelopen 30 dagen)**\n\nHieronder de best presterende campagnes op basis van clicks.`,
                    dataTable: {
                        headers: ["Campagne", "Clicks", "Impressies", "Kosten", "Conversies"],
                        rows: rows.map((r: any) => [
                            r.campaign_name || "Onbekend",
                            Number(r.clicks).toLocaleString("nl-NL"),
                            Number(r.impressions).toLocaleString("nl-NL"),
                            `€${Number(r.cost).toFixed(2)}`,
                            Number(r.conversions).toString(),
                        ]),
                    },
                };
            }
        }

        // Default fallback
        return {
            text: `Ik heb je vraag ontvangen: "${question}"\n\nIk kan je helpen met vragen over:\n\n• **Performance** — KPI's, clicks, impressies, CTR\n• **Kosten** — Budget analyse, CPA, daggemiddelden\n• **Campagnes** — Top campagnes, vergelijkingen\n\nStel een specifiekere vraag om data-inzichten te krijgen.`,
        };
    } catch (error) {
        console.error("AI response generation error:", error);
        return {
            text: "Er is een fout opgetreden bij het ophalen van de data. Probeer het opnieuw of stel een andere vraag.",
        };
    }
}
