// ═══════════════════════════════════════════════════════════════════
// Rule Engine — Shared Types & Constants (safe for client components)
// ═══════════════════════════════════════════════════════════════════

export interface ConditionRule {
    field: string;           // e.g. "cost", "impressions", "clicks"
    fieldSource: string;     // data source ID or "all"
    operator: Operator;
    value: string | number;
    valueType: "manual" | "field"; // manual = static value, field = another metric reference
    valueField?: string;     // If valueType === "field", which field to compare to
}

export interface ConditionSection {
    sectionOperator: "AND" | "OR";
    rules: ConditionRule[];
}

export interface RuleAction {
    type: "incident" | "notification" | "email" | "slack";
    config: {
        severity?: string;   // For incident type
        message?: string;    // Custom message
        email?: string;      // For email type
        webhookUrl?: string; // For slack type
    };
}

export type Operator =
    | "equals"
    | "not_equals"
    | "greater_than"
    | "less_than"
    | "greater_than_or_equal"
    | "less_than_or_equal"
    | "contains"
    | "not_contains"
    | "change_pct_up"      // Value increased by > X% vs previous period
    | "change_pct_down"    // Value decreased by > X% vs previous period
    | "is_zero"
    | "is_not_zero";

export const OPERATOR_LABELS: Record<Operator, { label: string; description: string }> = {
    equals: { label: "Is gelijk aan", description: "Waarde is exact gelijk" },
    not_equals: { label: "Is niet gelijk aan", description: "Waarde is anders" },
    greater_than: { label: "Is groter dan", description: "Waarde overschrijdt drempel" },
    less_than: { label: "Is kleiner dan", description: "Waarde is onder drempel" },
    greater_than_or_equal: { label: "≥ Groter of gelijk", description: "Waarde is drempel of hoger" },
    less_than_or_equal: { label: "≤ Kleiner of gelijk", description: "Waarde is drempel of lager" },
    contains: { label: "Bevat", description: "Tekst bevat waarde" },
    not_contains: { label: "Bevat niet", description: "Tekst bevat waarde niet" },
    change_pct_up: { label: "↑ Stijging > %", description: "Procentuele stijging vs vorige periode" },
    change_pct_down: { label: "↓ Daling > %", description: "Procentuele daling vs vorige periode" },
    is_zero: { label: "Is nul", description: "Waarde is 0" },
    is_not_zero: { label: "Is niet nul", description: "Waarde is meer dan 0" },
};
