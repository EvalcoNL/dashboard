import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({
  model: "gemini-3-flash-preview",
  generationConfig: { responseMimeType: "application/json" }
});

export class AIService {
  async generateAnalystReport(clientId: string, data: Record<string, unknown>) {
    const prompt = `
You are an expert Google Ads Analyst. Analyze the following campaign metrics and health data for a client.
Identify the primary risk driver, top performance issues, action candidates, and any compliance flags.

Data:
${JSON.stringify(data, null, 2)}

Return a JSON object in this exact format:
{
  "healthScore": number (0-100),
  "primaryRiskDriver": "string",
  "topIssues": [{"issue": "string", "impact": "HIGH"|"MEDIUM", "category": "string"}],
  "actionCandidates": ["string"],
  "complianceFlags": ["string"],
  "healthScoreBreakdown": { "performance": number, "structure": number, "tracking": number }
}
`;

    const startTime = Date.now();
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const output = JSON.parse(responseText || "{}");
    const latencyMs = Date.now() - startTime;

    // Log the prompt
    await prisma.promptLog.create({
      data: {
        type: "analyst",
        clientId,
        inputJson: data as Prisma.InputJsonValue,
        outputJson: output as Prisma.InputJsonValue,
        model: "gemini-3-flash-preview",
        tokenCount: result.response.usageMetadata?.totalTokenCount,
        latencyMs,
      },
    });

    return output;
  }

  async generateAdvisorReport(clientId: string, analystData: Record<string, unknown>) {
    const prompt = `
You are a Senior Strategic Ads Advisor. Based on the following Analyst Report, create a prioritized action plan.
Be specific, strategic, and practical.

Analyst Report:
${JSON.stringify(analystData, null, 2)}

Return a JSON object in this exact format:
{
  "executiveSummary": "string (concise overview)",
  "priorities": [
    {
      "priority": "P1"|"P2"|"P3",
      "action": "string",
      "expectedEffect": "string",
      "risk": "string"
    }
  ],
  "checklist": ["string"]
}
`;

    const startTime = Date.now();
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const output = JSON.parse(responseText || "{}");
    const latencyMs = Date.now() - startTime;

    // Log the prompt
    await prisma.promptLog.create({
      data: {
        type: "advisor",
        clientId,
        inputJson: analystData as Prisma.InputJsonValue,
        outputJson: output as Prisma.InputJsonValue,
        model: "gemini-3-flash-preview",
        tokenCount: result.response.usageMetadata?.totalTokenCount,
        latencyMs,
      },
    });

    return output;
  }
}

export const aiService = new AIService();
