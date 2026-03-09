// ═══════════════════════════════════════════════════════════════════
// Pre-built Rule Templates for the Rule Builder
// ═══════════════════════════════════════════════════════════════════

import {
    AlertTriangle,
    TrendingDown,
    TrendingUp,
    DollarSign,
    Zap,
    Globe,
    Eye,
    BarChart3,
    Database,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ConditionSection, RuleAction } from "@/lib/rule-engine-types";

export interface RuleTemplate {
    id: string;
    name: string;
    description: string;
    icon: LucideIcon;
    category: "kosten" | "conversie" | "uptime" | "tracking" | "data" | "custom";
    color: string;
    conditions: ConditionSection[];
    actions: RuleAction[];
    schedule: string;
    cooldownMinutes: number;
}

export const RULE_TEMPLATES: RuleTemplate[] = [
    {
        id: "high_disapproval",
        name: "Hoge Afkeurpercentage",
        description: "Alert wanneer het afkeurpercentage boven een drempel komt",
        icon: AlertTriangle,
        category: "conversie",
        color: "#ef4444",
        conditions: [
            {
                sectionOperator: "AND",
                rules: [
                    { field: "disapproval_rate", fieldSource: "all", operator: "greater_than", value: 10, valueType: "manual" },
                ],
            },
        ],
        actions: [
            { type: "incident", config: { severity: "P2", message: "Afkeurpercentage is boven 10%" } },
            { type: "notification", config: { message: "Hoge afkeurpercentage gedetecteerd" } },
        ],
        schedule: "DAILY",
        cooldownMinutes: 360,
    },
    {
        id: "cost_drop",
        name: "Kosten Daling",
        description: "Alert wanneer kosten meer dan X% dalen vs vorige periode",
        icon: TrendingDown,
        category: "kosten",
        color: "#f59e0b",
        conditions: [
            {
                sectionOperator: "AND",
                rules: [
                    { field: "cost", fieldSource: "all", operator: "change_pct_down", value: 30, valueType: "manual" },
                ],
            },
        ],
        actions: [
            { type: "incident", config: { severity: "P2", message: "Kosten zijn meer dan 30% gedaald" } },
        ],
        schedule: "DAILY",
        cooldownMinutes: 1440,
    },
    {
        id: "cost_increase",
        name: "Kosten Stijging",
        description: "Alert wanneer kosten meer dan X% stijgen",
        icon: TrendingUp,
        category: "kosten",
        color: "#ef4444",
        conditions: [
            {
                sectionOperator: "AND",
                rules: [
                    { field: "cost", fieldSource: "all", operator: "change_pct_up", value: 50, valueType: "manual" },
                ],
            },
        ],
        actions: [
            { type: "incident", config: { severity: "P1", message: "Kosten zijn meer dan 50% gestegen" } },
            { type: "notification", config: { severity: "P1", message: "Onverwachte kosten stijging gedetecteerd" } },
        ],
        schedule: "DAILY",
        cooldownMinutes: 720,
    },
    {
        id: "conversion_dropout",
        name: "Conversie Uitval",
        description: "Alert wanneer conversies naar 0 zakken",
        icon: Zap,
        category: "conversie",
        color: "#ef4444",
        conditions: [
            {
                sectionOperator: "AND",
                rules: [
                    { field: "conversions", fieldSource: "all", operator: "is_zero", value: 0, valueType: "manual" },
                ],
            },
        ],
        actions: [
            { type: "incident", config: { severity: "P1", message: "Geen conversies geregistreerd" } },
        ],
        schedule: "DAILY",
        cooldownMinutes: 1440,
    },
    {
        id: "budget_exceeded",
        name: "Budget Overschrijding",
        description: "Alert wanneer uitgaven een budget drempel overschrijden",
        icon: DollarSign,
        category: "kosten",
        color: "#f59e0b",
        conditions: [
            {
                sectionOperator: "AND",
                rules: [
                    { field: "cost", fieldSource: "all", operator: "greater_than", value: 5000, valueType: "manual" },
                ],
            },
        ],
        actions: [
            { type: "notification", config: { message: "Budget drempel overschreden" } },
        ],
        schedule: "DAILY",
        cooldownMinutes: 1440,
    },
    {
        id: "website_down",
        name: "Website Down",
        description: "Alert wanneer uptime score daalt (via monitoring data)",
        icon: Globe,
        category: "uptime",
        color: "#ef4444",
        conditions: [
            {
                sectionOperator: "AND",
                rules: [
                    { field: "uptime_score", fieldSource: "all", operator: "less_than", value: 95, valueType: "manual" },
                ],
            },
        ],
        actions: [
            { type: "incident", config: { severity: "P1", message: "Website uptime is onder 95%" } },
        ],
        schedule: "HOURLY",
        cooldownMinutes: 60,
    },
    {
        id: "tracking_pixel_missing",
        name: "Tracking Pixel Ontbreekt",
        description: "Alert wanneer tracking pixels niet meer gedetecteerd worden",
        icon: Eye,
        category: "tracking",
        color: "#f59e0b",
        conditions: [
            {
                sectionOperator: "AND",
                rules: [
                    { field: "tracking_score", fieldSource: "all", operator: "less_than", value: 50, valueType: "manual" },
                ],
            },
        ],
        actions: [
            { type: "incident", config: { severity: "P2", message: "Tracking pixel ontbreekt of werkt niet" } },
        ],
        schedule: "DAILY",
        cooldownMinutes: 1440,
    },
    {
        id: "impressions_drop",
        name: "Impressie Daling",
        description: "Alert wanneer impressies significant dalen",
        icon: BarChart3,
        category: "conversie",
        color: "#6366f1",
        conditions: [
            {
                sectionOperator: "AND",
                rules: [
                    { field: "impressions", fieldSource: "all", operator: "change_pct_down", value: 40, valueType: "manual" },
                ],
            },
        ],
        actions: [
            { type: "notification", config: { message: "Impressies zijn meer dan 40% gedaald" } },
        ],
        schedule: "DAILY",
        cooldownMinutes: 1440,
    },
    {
        id: "data_sync_failed",
        name: "Data Sync Mislukt",
        description: "Alert wanneer data synchronisatie geen nieuwe records oplevert",
        icon: Database,
        category: "data",
        color: "#ef4444",
        conditions: [
            {
                sectionOperator: "AND",
                rules: [
                    { field: "records_synced", fieldSource: "all", operator: "is_zero", value: 0, valueType: "manual" },
                ],
            },
        ],
        actions: [
            { type: "incident", config: { severity: "P2", message: "Data sync heeft geen nieuwe records opgeleverd" } },
        ],
        schedule: "DAILY",
        cooldownMinutes: 1440,
    },
];
