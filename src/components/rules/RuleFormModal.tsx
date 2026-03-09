"use client";

import { useState, useEffect } from "react";
import { X, Plus, Trash2, ChevronDown } from "lucide-react";
import { OPERATOR_LABELS, type ConditionSection, type RuleAction, type Operator } from "@/lib/rule-engine-types";
import type { RuleTemplate } from "@/lib/rule-templates";

interface RuleData {
    id: string;
    name: string;
    description: string | null;
    category: string | null;
    enabled: boolean;
    conditions: any;
    actions: any;
    schedule: string;
    cooldownMinutes: number;
}

interface Props {
    projectId: string;
    rule: RuleData | null;
    template: RuleTemplate | null;
    onSave: (data: any) => void;
    onClose: () => void;
}

const EMPTY_RULE = {
    field: "cost",
    fieldSource: "all",
    operator: "greater_than" as Operator,
    value: 0,
    valueType: "manual" as const,
};

const EMPTY_SECTION: ConditionSection = {
    sectionOperator: "AND",
    rules: [{ ...EMPTY_RULE }],
};

const ACTION_TYPES = [
    { value: "incident", label: "Incident aanmaken", description: "Maak een incident aan in het systeem" },
    { value: "notification", label: "Notificatie sturen", description: "Stuur een in-app notificatie" },
    { value: "slack", label: "Slack bericht", description: "Stuur een bericht naar Slack" },
];

const METRIC_OPTIONS = [
    { value: "cost", label: "Kosten" },
    { value: "impressions", label: "Impressies" },
    { value: "clicks", label: "Klikken" },
    { value: "conversions", label: "Conversies" },
    { value: "conversion_value", label: "Conversiewaarde" },
    { value: "ctr", label: "CTR" },
    { value: "cpc", label: "CPC" },
    { value: "roas", label: "ROAS" },
    { value: "disapproval_rate", label: "Afkeurpercentage" },
    { value: "uptime_score", label: "Uptime Score" },
    { value: "tracking_score", label: "Tracking Score" },
    { value: "records_synced", label: "Records Gesynchroniseerd" },
];

const SEVERITY_OPTIONS = [
    { value: "P1", label: "P1 — Kritiek" },
    { value: "P2", label: "P2 — Hoog" },
    { value: "P3", label: "P3 — Medium" },
    { value: "P4", label: "P4 — Laag" },
];

export default function RuleFormModal({ projectId, rule, template, onSave, onClose }: Props) {
    const isEditing = !!rule;

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState("custom");
    const [schedule, setSchedule] = useState("DAILY");
    const [cooldown, setCooldown] = useState(60);
    const [conditions, setConditions] = useState<ConditionSection[]>([{ ...EMPTY_SECTION }]);
    const [actions, setActions] = useState<RuleAction[]>([
        { type: "incident", config: { severity: "P3", message: "" } },
    ]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (rule) {
            setName(rule.name);
            setDescription(rule.description || "");
            setCategory(rule.category || "custom");
            setSchedule(rule.schedule);
            setCooldown(rule.cooldownMinutes);
            setConditions(rule.conditions as ConditionSection[]);
            setActions(rule.actions as RuleAction[]);
        } else if (template) {
            setName(template.name);
            setDescription(template.description);
            setCategory(template.category);
            setSchedule(template.schedule);
            setCooldown(template.cooldownMinutes);
            setConditions(template.conditions);
            setActions(template.actions);
        }
    }, [rule, template]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        await onSave({ name, description, category, schedule, cooldownMinutes: cooldown, conditions, actions });
        setSaving(false);
    };

    // Condition helpers
    const updateConditionRule = (sectionIdx: number, ruleIdx: number, updates: any) => {
        setConditions(prev => prev.map((section, si) =>
            si === sectionIdx
                ? { ...section, rules: section.rules.map((r, ri) => ri === ruleIdx ? { ...r, ...updates } : r) }
                : section
        ));
    };

    const addConditionRule = (sectionIdx: number) => {
        setConditions(prev => prev.map((section, si) =>
            si === sectionIdx ? { ...section, rules: [...section.rules, { ...EMPTY_RULE }] } : section
        ));
    };

    const removeConditionRule = (sectionIdx: number, ruleIdx: number) => {
        setConditions(prev => prev.map((section, si) =>
            si === sectionIdx ? { ...section, rules: section.rules.filter((_, ri) => ri !== ruleIdx) } : section
        ).filter(s => s.rules.length > 0));
    };

    const addConditionSection = () => {
        setConditions(prev => [...prev, { ...EMPTY_SECTION, rules: [{ ...EMPTY_RULE }] }]);
    };

    const toggleSectionOperator = (sectionIdx: number) => {
        setConditions(prev => prev.map((section, si) =>
            si === sectionIdx
                ? { ...section, sectionOperator: section.sectionOperator === "AND" ? "OR" : "AND" }
                : section
        ));
    };

    // Action helpers
    const updateAction = (idx: number, updates: Partial<RuleAction>) => {
        setActions(prev => prev.map((a, i) => i === idx ? { ...a, ...updates } : a));
    };

    const updateActionConfig = (idx: number, configUpdates: any) => {
        setActions(prev => prev.map((a, i) =>
            i === idx ? { ...a, config: { ...a.config, ...configUpdates } } : a
        ));
    };

    const addAction = () => {
        setActions(prev => [...prev, { type: "notification", config: { message: "" } }]);
    };

    const removeAction = (idx: number) => {
        setActions(prev => prev.filter((_, i) => i !== idx));
    };

    return (
        <div style={overlayStyle}>
            <div style={{ ...modalStyle, maxWidth: "720px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "24px" }}>
                    <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--color-text-primary)" }}>
                        {isEditing ? "Regel Bewerken" : template ? `Template: ${template.name}` : "Nieuwe Regel"}
                    </h2>
                    <button onClick={onClose} style={closeBtn}><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                    {/* Basic Info */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                        <div style={fieldGroup}>
                            <label style={labelStyle}>Naam *</label>
                            <input
                                type="text" value={name} onChange={e => setName(e.target.value)}
                                style={inputStyle} placeholder="Naam van de regel" required
                            />
                        </div>
                        <div style={fieldGroup}>
                            <label style={labelStyle}>Categorie</label>
                            <select value={category} onChange={e => setCategory(e.target.value)} style={inputStyle}>
                                <option value="kosten">Kosten</option>
                                <option value="conversie">Conversie</option>
                                <option value="uptime">Uptime</option>
                                <option value="tracking">Tracking</option>
                                <option value="data">Data</option>
                                <option value="custom">Custom</option>
                            </select>
                        </div>
                    </div>
                    <div style={fieldGroup}>
                        <label style={labelStyle}>Beschrijving</label>
                        <input
                            type="text" value={description} onChange={e => setDescription(e.target.value)}
                            style={inputStyle} placeholder="Optionele beschrijving"
                        />
                    </div>

                    {/* Schedule & Cooldown */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                        <div style={fieldGroup}>
                            <label style={labelStyle}>Frequentie</label>
                            <select value={schedule} onChange={e => setSchedule(e.target.value)} style={inputStyle}>
                                <option value="REALTIME">Realtime</option>
                                <option value="HOURLY">Elk uur</option>
                                <option value="DAILY">Dagelijks</option>
                            </select>
                        </div>
                        <div style={fieldGroup}>
                            <label style={labelStyle}>Cooldown (minuten)</label>
                            <input
                                type="number" value={cooldown} onChange={e => setCooldown(Number(e.target.value))}
                                style={inputStyle} min={1}
                            />
                        </div>
                    </div>

                    {/* ──────── CONDITIONS ──────── */}
                    <div>
                        <label style={{ ...labelStyle, marginBottom: "12px", display: "block" }}>
                            Condities — Wanneer moet deze regel triggeren?
                        </label>
                        {conditions.map((section, si) => (
                            <div key={si} style={{
                                background: "rgba(0,0,0,0.15)", borderRadius: "12px",
                                padding: "16px", marginBottom: "12px",
                                border: "1px solid var(--color-border)",
                            }}>
                                {/* Section operator toggle */}
                                {section.rules.length > 1 && (
                                    <div style={{ marginBottom: "12px" }}>
                                        <button
                                            type="button"
                                            onClick={() => toggleSectionOperator(si)}
                                            style={{
                                                padding: "4px 12px", borderRadius: "6px", fontSize: "0.7rem",
                                                fontWeight: 700, cursor: "pointer",
                                                background: section.sectionOperator === "AND" ? "rgba(99,102,241,0.2)" : "rgba(245,158,11,0.2)",
                                                color: section.sectionOperator === "AND" ? "#6366f1" : "#f59e0b",
                                                border: "none",
                                            }}
                                        >
                                            {section.sectionOperator}
                                        </button>
                                    </div>
                                )}

                                {section.rules.map((rule, ri) => (
                                    <div key={ri} style={{ display: "flex", gap: "8px", marginBottom: "8px", alignItems: "center", flexWrap: "wrap" }}>
                                        {/* Metric field */}
                                        <select
                                            value={rule.field}
                                            onChange={e => updateConditionRule(si, ri, { field: e.target.value })}
                                            style={{ ...inputStyle, flex: "1 1 140px", minWidth: "140px" }}
                                        >
                                            {METRIC_OPTIONS.map(m => (
                                                <option key={m.value} value={m.value}>{m.label}</option>
                                            ))}
                                        </select>

                                        {/* Operator */}
                                        <select
                                            value={rule.operator}
                                            onChange={e => updateConditionRule(si, ri, { operator: e.target.value })}
                                            style={{ ...inputStyle, flex: "1 1 180px", minWidth: "180px" }}
                                        >
                                            {(Object.entries(OPERATOR_LABELS) as [Operator, any][]).map(([key, val]) => (
                                                <option key={key} value={key}>{val.label}</option>
                                            ))}
                                        </select>

                                        {/* Value - only show for operators that need it */}
                                        {!["is_zero", "is_not_zero"].includes(rule.operator) && (
                                            <input
                                                type="number"
                                                value={rule.value}
                                                onChange={e => updateConditionRule(si, ri, { value: Number(e.target.value) })}
                                                style={{ ...inputStyle, flex: "0 0 120px", minWidth: "80px" }}
                                                placeholder="Waarde"
                                            />
                                        )}

                                        {/* Remove button */}
                                        <button
                                            type="button"
                                            onClick={() => removeConditionRule(si, ri)}
                                            style={{
                                                padding: "8px", borderRadius: "8px", background: "transparent",
                                                border: "none", color: "#ef4444", cursor: "pointer", flexShrink: 0,
                                            }}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}

                                <button
                                    type="button"
                                    onClick={() => addConditionRule(si)}
                                    style={{
                                        display: "inline-flex", alignItems: "center", gap: "4px",
                                        padding: "6px 12px", borderRadius: "6px", fontSize: "0.75rem",
                                        background: "transparent", border: "1px dashed var(--color-border)",
                                        color: "var(--color-text-muted)", cursor: "pointer",
                                    }}
                                >
                                    <Plus size={12} /> Conditie toevoegen
                                </button>
                            </div>
                        ))}

                        <button
                            type="button"
                            onClick={addConditionSection}
                            style={{
                                display: "inline-flex", alignItems: "center", gap: "6px",
                                padding: "8px 16px", borderRadius: "8px", fontSize: "0.8125rem",
                                background: "transparent", border: "1px dashed var(--color-border)",
                                color: "var(--color-text-muted)", cursor: "pointer",
                            }}
                        >
                            <Plus size={14} /> Conditie-groep toevoegen (AND)
                        </button>
                    </div>

                    {/* ──────── ACTIONS ──────── */}
                    <div>
                        <label style={{ ...labelStyle, marginBottom: "12px", display: "block" }}>
                            Acties — Wat moet er gebeuren?
                        </label>
                        {actions.map((action, ai) => (
                            <div key={ai} style={{
                                background: "rgba(0,0,0,0.15)", borderRadius: "12px",
                                padding: "16px", marginBottom: "12px",
                                border: "1px solid var(--color-border)",
                            }}>
                                <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                                    <select
                                        value={action.type}
                                        onChange={e => updateAction(ai, { type: e.target.value as any })}
                                        style={{ ...inputStyle, flex: 1 }}
                                    >
                                        {ACTION_TYPES.map(t => (
                                            <option key={t.value} value={t.value}>{t.label}</option>
                                        ))}
                                    </select>
                                    <button
                                        type="button"
                                        onClick={() => removeAction(ai)}
                                        style={{
                                            padding: "8px", borderRadius: "8px", background: "transparent",
                                            border: "none", color: "#ef4444", cursor: "pointer",
                                        }}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>

                                {/* Action config fields */}
                                {action.type === "incident" && (
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                                        <select
                                            value={action.config.severity || "P3"}
                                            onChange={e => updateActionConfig(ai, { severity: e.target.value })}
                                            style={inputStyle}
                                        >
                                            {SEVERITY_OPTIONS.map(s => (
                                                <option key={s.value} value={s.value}>{s.label}</option>
                                            ))}
                                        </select>
                                        <input
                                            type="text"
                                            value={action.config.message || ""}
                                            onChange={e => updateActionConfig(ai, { message: e.target.value })}
                                            style={inputStyle}
                                            placeholder="Bericht (optioneel)"
                                        />
                                    </div>
                                )}
                                {action.type === "notification" && (
                                    <input
                                        type="text"
                                        value={action.config.message || ""}
                                        onChange={e => updateActionConfig(ai, { message: e.target.value })}
                                        style={inputStyle}
                                        placeholder="Notificatie bericht"
                                    />
                                )}
                                {action.type === "slack" && (
                                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                        <input
                                            type="url"
                                            value={action.config.webhookUrl || ""}
                                            onChange={e => updateActionConfig(ai, { webhookUrl: e.target.value })}
                                            style={inputStyle}
                                            placeholder="Slack Webhook URL"
                                        />
                                        <input
                                            type="text"
                                            value={action.config.message || ""}
                                            onChange={e => updateActionConfig(ai, { message: e.target.value })}
                                            style={inputStyle}
                                            placeholder="Slack bericht"
                                        />
                                    </div>
                                )}
                            </div>
                        ))}

                        <button
                            type="button"
                            onClick={addAction}
                            style={{
                                display: "inline-flex", alignItems: "center", gap: "6px",
                                padding: "8px 16px", borderRadius: "8px", fontSize: "0.8125rem",
                                background: "transparent", border: "1px dashed var(--color-border)",
                                color: "var(--color-text-muted)", cursor: "pointer",
                            }}
                        >
                            <Plus size={14} /> Actie toevoegen
                        </button>
                    </div>

                    {/* Submit */}
                    <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "12px" }}>
                        <button type="button" onClick={onClose} style={secondaryBtn}>Annuleren</button>
                        <button type="submit" disabled={saving || !name} style={primaryBtn}>
                            {saving ? "Opslaan..." : isEditing ? "Wijzigingen Opslaan" : "Regel Aanmaken"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

const overlayStyle: React.CSSProperties = {
    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
    background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 1000, padding: "20px",
};

const modalStyle: React.CSSProperties = {
    background: "var(--color-surface-elevated)", border: "1px solid var(--color-border)",
    borderRadius: "20px", width: "100%", padding: "32px",
    boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)", maxHeight: "85vh", overflowY: "auto",
};

const closeBtn: React.CSSProperties = {
    background: "none", border: "none", color: "var(--color-text-muted)",
    cursor: "pointer", padding: "4px",
};

const fieldGroup: React.CSSProperties = { display: "flex", flexDirection: "column", gap: "6px" };

const labelStyle: React.CSSProperties = {
    fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-muted)",
    textTransform: "uppercase", letterSpacing: "0.05em",
};

const inputStyle: React.CSSProperties = {
    background: "rgba(0,0,0,0.2)", border: "1px solid var(--color-border)",
    borderRadius: "10px", padding: "10px 12px", color: "var(--color-text-primary)",
    fontSize: "0.875rem",
};

const primaryBtn: React.CSSProperties = {
    background: "var(--color-brand)", color: "white", border: "none",
    borderRadius: "10px", padding: "12px 24px", fontSize: "0.875rem",
    fontWeight: 600, cursor: "pointer",
};

const secondaryBtn: React.CSSProperties = {
    background: "rgba(255,255,255,0.05)", color: "var(--color-text-primary)",
    border: "1px solid var(--color-border)", borderRadius: "10px",
    padding: "12px 24px", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer",
};
