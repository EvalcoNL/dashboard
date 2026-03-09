// ═══════════════════════════════════════════════════════════════════
// Rule Engine — Evaluates rules against ClickHouse metrics data
// ═══════════════════════════════════════════════════════════════════

import { prisma } from "@/lib/db";
import { query as clickHouseQuery } from "@/lib/clickhouse";

// Re-export types from the client-safe types file
export type { ConditionRule, ConditionSection, RuleAction, Operator } from "@/lib/rule-engine-types";
export { OPERATOR_LABELS } from "@/lib/rule-engine-types";
import type { ConditionRule, ConditionSection, RuleAction, Operator } from "@/lib/rule-engine-types";

// ──────────────────────────────────────────────────────────────
// Rule Evaluation
// ──────────────────────────────────────────────────────────────

interface MetricResult {
    current: number;
    previous: number;
}

/**
 * Fetch the metric value for a given field, data source, and project.
 * Returns current period sum and previous period sum for comparison.
 */
async function fetchMetricValue(
    projectId: string,
    field: string,
    fieldSource: string,
    periodDays: number = 1
): Promise<MetricResult> {
    const now = new Date();
    const currentFrom = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
    const previousFrom = new Date(currentFrom.getTime() - periodDays * 24 * 60 * 60 * 1000);

    const sourceFilter = fieldSource && fieldSource !== "all"
        ? `AND data_source_id = {source:String}` : "";

    const query = `
        SELECT
            sumIf(value, date >= {currentFrom:Date} AND date < {now:Date}) AS current_value,
            sumIf(value, date >= {previousFrom:Date} AND date < {currentFrom:Date}) AS previous_value
        FROM metrics_data
        WHERE project_id = {projectId:String}
          AND canonical_metric = {field:String}
          ${sourceFilter}
    `;

    const params: Record<string, any> = {
        projectId,
        field,
        currentFrom: currentFrom.toISOString().split("T")[0],
        previousFrom: previousFrom.toISOString().split("T")[0],
        now: now.toISOString().split("T")[0],
    };
    if (fieldSource && fieldSource !== "all") {
        params.source = fieldSource;
    }

    try {
        const result = await clickHouseQuery(query, params);
        const row = result?.[0] || {};
        return {
            current: Number(row.current_value || 0),
            previous: Number(row.previous_value || 0),
        };
    } catch (err) {
        console.error("[RuleEngine] Failed to fetch metric:", err);
        return { current: 0, previous: 0 };
    }
}

/**
 * Evaluate a single condition rule against actual data.
 */
async function evaluateCondition(
    projectId: string,
    rule: ConditionRule
): Promise<{ passed: boolean; actualValue: number; threshold: number | string }> {
    const metric = await fetchMetricValue(projectId, rule.field, rule.fieldSource);
    const threshold = rule.valueType === "manual" ? Number(rule.value) : 0;
    const actual = metric.current;

    switch (rule.operator) {
        case "equals":
            return { passed: actual === threshold, actualValue: actual, threshold };
        case "not_equals":
            return { passed: actual !== threshold, actualValue: actual, threshold };
        case "greater_than":
            return { passed: actual > threshold, actualValue: actual, threshold };
        case "less_than":
            return { passed: actual < threshold, actualValue: actual, threshold };
        case "greater_than_or_equal":
            return { passed: actual >= threshold, actualValue: actual, threshold };
        case "less_than_or_equal":
            return { passed: actual <= threshold, actualValue: actual, threshold };
        case "is_zero":
            return { passed: actual === 0, actualValue: actual, threshold: 0 };
        case "is_not_zero":
            return { passed: actual !== 0, actualValue: actual, threshold: 0 };
        case "change_pct_up": {
            if (metric.previous === 0) return { passed: actual > 0, actualValue: 0, threshold };
            const changePct = ((actual - metric.previous) / metric.previous) * 100;
            return { passed: changePct > threshold, actualValue: Math.round(changePct * 100) / 100, threshold };
        }
        case "change_pct_down": {
            if (metric.previous === 0) return { passed: false, actualValue: 0, threshold };
            const changePct = ((metric.previous - actual) / metric.previous) * 100;
            return { passed: changePct > threshold, actualValue: Math.round(changePct * 100) / 100, threshold };
        }
        default:
            return { passed: false, actualValue: actual, threshold };
    }
}

/**
 * Evaluate all condition sections of a rule (AND/OR logic).
 */
async function evaluateConditions(
    projectId: string,
    sections: ConditionSection[]
): Promise<{ passed: boolean; details: any[] }> {
    const results: any[] = [];
    let overallPassed = true;

    for (const section of sections) {
        const sectionResults = await Promise.all(
            section.rules.map(rule => evaluateCondition(projectId, rule))
        );

        const sectionPassed = section.sectionOperator === "AND"
            ? sectionResults.every(r => r.passed)
            : sectionResults.some(r => r.passed);

        results.push({
            operator: section.sectionOperator,
            passed: sectionPassed,
            rules: section.rules.map((rule, i) => ({
                field: rule.field,
                operator: rule.operator,
                threshold: rule.value,
                actual: sectionResults[i].actualValue,
                passed: sectionResults[i].passed,
            })),
        });

        // Sections are combined with AND at the top level
        if (!sectionPassed) overallPassed = false;
    }

    return { passed: overallPassed, details: results };
}

/**
 * Execute the actions of a triggered rule.
 */
async function executeActions(
    rule: { id: string; projectId: string; name: string },
    actions: RuleAction[],
    conditionDetails: any[]
): Promise<any[]> {
    const actionResults: any[] = [];

    for (const action of actions) {
        try {
            switch (action.type) {
                case "incident": {
                    await prisma.incident.create({
                        data: {
                            projectId: rule.projectId,
                            title: `[Regel] ${rule.name}`,
                            cause: action.config.message || `Regel "${rule.name}" is getriggerd`,
                            causeCode: `RULE_${rule.id}`,
                            severity: action.config.severity || "P3",
                            type: "custom",
                            status: "ONGOING",
                        },
                    });
                    actionResults.push({ type: "incident", success: true });
                    break;
                }
                case "notification": {
                    await prisma.notification.create({
                        data: {
                            projectId: rule.projectId,
                            type: "RULE_TRIGGERED",
                            severity: action.config.severity === "P1" ? "critical" : "warning",
                            title: `Regel getriggerd: ${rule.name}`,
                            message: action.config.message || `De regel "${rule.name}" is geactiveerd.`,
                        },
                    });
                    actionResults.push({ type: "notification", success: true });
                    break;
                }
                case "slack": {
                    if (action.config.webhookUrl) {
                        await fetch(action.config.webhookUrl, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                text: `⚠️ Regel getriggerd: *${rule.name}*\n${action.config.message || ""}`,
                            }),
                        });
                        actionResults.push({ type: "slack", success: true });
                    }
                    break;
                }
                default:
                    actionResults.push({ type: action.type, success: false, error: "Unknown action type" });
            }
        } catch (err: any) {
            actionResults.push({ type: action.type, success: false, error: err.message });
        }
    }

    return actionResults;
}

/**
 * Main entry point: evaluate a single rule, execute actions if triggered.
 */
export async function evaluateRule(ruleId: string): Promise<{
    triggered: boolean;
    details: any;
    error?: string;
}> {
    try {
        const rule = await prisma.rule.findUnique({ where: { id: ruleId } });
        if (!rule || !rule.enabled) {
            return { triggered: false, details: null, error: "Rule not found or disabled" };
        }

        // Check cooldown
        if (rule.lastTriggeredAt) {
            const cooldownEnd = new Date(rule.lastTriggeredAt.getTime() + rule.cooldownMinutes * 60 * 1000);
            if (new Date() < cooldownEnd) {
                return { triggered: false, details: { reason: "cooldown" } };
            }
        }

        const conditions = rule.conditions as unknown as ConditionSection[];
        const actions = rule.actions as unknown as RuleAction[];

        const { passed, details } = await evaluateConditions(rule.projectId, conditions);

        // Update last evaluated
        await prisma.rule.update({
            where: { id: ruleId },
            data: { lastEvaluatedAt: new Date() },
        });

        if (passed) {
            // Execute actions
            const actionResults = await executeActions(
                { id: rule.id, projectId: rule.projectId, name: rule.name },
                actions,
                details
            );

            // Record execution
            await prisma.ruleExecution.create({
                data: {
                    ruleId: rule.id,
                    conditionSnapshot: details,
                    actionsTaken: actionResults,
                    resultData: { triggered: true },
                    success: actionResults.every(a => a.success),
                },
            });

            // Update last triggered
            await prisma.rule.update({
                where: { id: ruleId },
                data: { lastTriggeredAt: new Date() },
            });

            return { triggered: true, details: { conditions: details, actions: actionResults } };
        }

        return { triggered: false, details };
    } catch (err: any) {
        console.error("[RuleEngine] Error evaluating rule:", ruleId, err);
        return { triggered: false, details: null, error: err.message };
    }
}

/**
 * Evaluate all active rules for a project.
 */
export async function evaluateProjectRules(projectId: string): Promise<{
    evaluated: number;
    triggered: number;
    results: Array<{ ruleId: string; name: string; triggered: boolean; error?: string }>;
}> {
    const rules = await prisma.rule.findMany({
        where: { projectId, enabled: true },
    });

    const results = [];
    let triggered = 0;

    for (const rule of rules) {
        const result = await evaluateRule(rule.id);
        if (result.triggered) triggered++;
        results.push({
            ruleId: rule.id,
            name: rule.name,
            triggered: result.triggered,
            error: result.error,
        });
    }

    return { evaluated: rules.length, triggered, results };
}
