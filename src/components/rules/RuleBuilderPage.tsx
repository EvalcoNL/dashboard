"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    Plus, Search, Shield, Clock, Play, Pause, Trash2, ChevronRight,
    Zap, AlertTriangle, Copy, Settings, Check, X, ArrowLeft,
    LayoutTemplate, Filter, Activity, Calendar, MoreVertical,
} from "lucide-react";
import { RULE_TEMPLATES, type RuleTemplate } from "@/lib/rule-templates";
import { OPERATOR_LABELS, type ConditionSection, type RuleAction, type Operator } from "@/lib/rule-engine-types";
import RuleFormModal from "./RuleFormModal";

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
    lastEvaluatedAt: string | null;
    lastTriggeredAt: string | null;
    createdAt: string;
    lastExecution: {
        triggeredAt: string;
        success: boolean;
    } | null;
}

interface Props {
    projectId: string;
    projectName: string;
}

const CATEGORIES = [
    { value: "", label: "Alle categorieën" },
    { value: "kosten", label: "Kosten" },
    { value: "conversie", label: "Conversie" },
    { value: "uptime", label: "Uptime" },
    { value: "tracking", label: "Tracking" },
    { value: "data", label: "Data" },
    { value: "custom", label: "Custom" },
];

function timeAgo(dateStr: string | null): string {
    if (!dateStr) return "Nooit";
    const now = new Date();
    const d = new Date(dateStr);
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diff < 60) return "Zojuist";
    if (diff < 3600) return `${Math.floor(diff / 60)}m geleden`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}u geleden`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d geleden`;
    return d.toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
}

export default function RuleBuilderPage({ projectId, projectName }: Props) {
    const router = useRouter();
    const [rules, setRules] = useState<RuleData[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("");
    const [showTemplates, setShowTemplates] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingRule, setEditingRule] = useState<RuleData | null>(null);
    const [selectedTemplate, setSelectedTemplate] = useState<RuleTemplate | null>(null);
    const [testingRuleId, setTestingRuleId] = useState<string | null>(null);
    const [testResult, setTestResult] = useState<any>(null);
    const [actionMenu, setActionMenu] = useState<string | null>(null);

    const fetchRules = useCallback(async () => {
        try {
            const res = await fetch(`/api/projects/${projectId}/rules`);
            const data = await res.json();
            if (data.success) setRules(data.rules);
        } catch { }
        setLoading(false);
    }, [projectId]);

    useEffect(() => { fetchRules(); }, [fetchRules]);

    const handleToggleRule = async (ruleId: string, enabled: boolean) => {
        try {
            await fetch(`/api/projects/${projectId}/rules/${ruleId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ enabled }),
            });
            setRules(prev => prev.map(r => r.id === ruleId ? { ...r, enabled } : r));
        } catch { }
    };

    const handleDeleteRule = async (ruleId: string) => {
        if (!confirm("Weet je zeker dat je deze regel wilt verwijderen?")) return;
        try {
            await fetch(`/api/projects/${projectId}/rules/${ruleId}`, { method: "DELETE" });
            setRules(prev => prev.filter(r => r.id !== ruleId));
        } catch { }
    };

    const handleTestRule = async (ruleId: string) => {
        setTestingRuleId(ruleId);
        setTestResult(null);
        try {
            const res = await fetch(`/api/projects/${projectId}/rules/${ruleId}/test`, { method: "POST" });
            const data = await res.json();
            setTestResult(data.result);
        } catch { }
        setTestingRuleId(null);
    };

    const handleCreateFromTemplate = (template: RuleTemplate) => {
        setSelectedTemplate(template);
        setShowTemplates(false);
        setShowCreateModal(true);
    };

    const handleSaveRule = async (ruleData: any) => {
        try {
            if (editingRule) {
                await fetch(`/api/projects/${projectId}/rules/${editingRule.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(ruleData),
                });
            } else {
                await fetch(`/api/projects/${projectId}/rules`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(ruleData),
                });
            }
            setShowCreateModal(false);
            setEditingRule(null);
            setSelectedTemplate(null);
            fetchRules();
        } catch { }
    };

    const handleDuplicate = async (rule: RuleData) => {
        try {
            await fetch(`/api/projects/${projectId}/rules`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: `${rule.name} (kopie)`,
                    description: rule.description,
                    category: rule.category,
                    conditions: rule.conditions,
                    actions: rule.actions,
                    schedule: rule.schedule,
                    cooldownMinutes: rule.cooldownMinutes,
                }),
            });
            fetchRules();
        } catch { }
    };

    const filtered = rules.filter(r => {
        const matchSearch = !search || r.name.toLowerCase().includes(search.toLowerCase()) ||
            (r.description || "").toLowerCase().includes(search.toLowerCase());
        const matchCategory = !categoryFilter || r.category === categoryFilter;
        return matchSearch && matchCategory;
    });

    const getCategoryColor = (cat: string | null) => {
        switch (cat) {
            case "kosten": return "#f59e0b";
            case "conversie": return "#6366f1";
            case "uptime": return "#ef4444";
            case "tracking": return "#8b5cf6";
            case "data": return "#06b6d4";
            default: return "#64748b";
        }
    };

    return (
        <div style={{ maxWidth: "1200px", margin: "0 auto" }} className="animate-fade-in">
            {/* Header */}
            <div style={{ marginBottom: "32px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                    <button
                        onClick={() => router.push(`/projects/${projectId}`)}
                        style={{
                            background: "none", border: "none", color: "var(--color-text-muted)",
                            cursor: "pointer", padding: "4px", display: "flex",
                        }}
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div style={{
                        padding: "10px", borderRadius: "12px",
                        background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                        color: "white",
                    }}>
                        <Shield size={22} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--color-text-primary)" }}>
                            Rule Builder
                        </h1>
                        <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}>
                            Automatische regels voor {projectName}
                        </p>
                    </div>
                </div>
            </div>

            {/* Toolbar */}
            <div style={{ display: "flex", gap: "12px", marginBottom: "24px", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: "200px", position: "relative" }}>
                    <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted)" }} />
                    <input
                        type="text"
                        placeholder="Zoek regels..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{
                            width: "100%", padding: "10px 12px 10px 36px",
                            background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)",
                            borderRadius: "10px", color: "var(--color-text-primary)", fontSize: "0.875rem",
                        }}
                    />
                </div>
                <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    style={{
                        padding: "10px 16px", background: "var(--color-bg-secondary)",
                        border: "1px solid var(--color-border)", borderRadius: "10px",
                        color: "var(--color-text-primary)", fontSize: "0.875rem",
                    }}
                >
                    {CATEGORIES.map(c => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                </select>
                <button
                    onClick={() => setShowTemplates(true)}
                    style={{
                        display: "inline-flex", alignItems: "center", gap: "8px",
                        padding: "10px 16px", borderRadius: "10px",
                        background: "rgba(99, 102, 241, 0.1)", color: "#6366f1",
                        border: "1px solid rgba(99, 102, 241, 0.2)",
                        fontSize: "0.875rem", fontWeight: 600, cursor: "pointer",
                    }}
                >
                    <LayoutTemplate size={16} /> Templates
                </button>
                <button
                    onClick={() => { setEditingRule(null); setSelectedTemplate(null); setShowCreateModal(true); }}
                    style={{
                        display: "inline-flex", alignItems: "center", gap: "8px",
                        padding: "10px 20px", borderRadius: "10px",
                        background: "var(--color-brand)", color: "#fff",
                        border: "none", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer",
                    }}
                >
                    <Plus size={16} /> Nieuwe Regel
                </button>
            </div>

            {/* Rules List */}
            {loading ? (
                <div style={{ textAlign: "center", padding: "60px", color: "var(--color-text-muted)" }}>
                    Regels laden...
                </div>
            ) : filtered.length === 0 ? (
                <div style={{
                    textAlign: "center", padding: "80px 20px",
                    background: "var(--color-surface-elevated)", borderRadius: "16px",
                    border: "1px solid var(--color-border)",
                }}>
                    <Shield size={48} style={{ color: "var(--color-text-muted)", marginBottom: "16px", opacity: 0.5 }} />
                    <h3 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "8px", color: "var(--color-text-primary)" }}>
                        {rules.length === 0 ? "Nog geen regels" : "Geen resultaten"}
                    </h3>
                    <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem", marginBottom: "24px" }}>
                        {rules.length === 0 ? "Maak je eerste automatische regel aan of kies een template." : "Pas je zoekfilters aan."}
                    </p>
                    {rules.length === 0 && (
                        <button
                            onClick={() => setShowTemplates(true)}
                            style={{
                                padding: "10px 20px", borderRadius: "10px",
                                background: "var(--color-brand)", color: "#fff",
                                border: "none", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer",
                            }}
                        >
                            Bekijk Templates
                        </button>
                    )}
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {filtered.map((rule) => (
                        <div
                            key={rule.id}
                            style={{
                                background: "var(--color-surface-elevated)",
                                border: "1px solid var(--color-border)",
                                borderRadius: "16px",
                                padding: "20px 24px",
                                display: "flex", alignItems: "center", gap: "16px",
                                opacity: rule.enabled ? 1 : 0.6,
                                transition: "all 0.2s",
                            }}
                        >
                            {/* Status indicator */}
                            <div style={{
                                width: "10px", height: "10px", borderRadius: "50%", flexShrink: 0,
                                background: rule.enabled ? "#22c55e" : "var(--color-text-muted)",
                                boxShadow: rule.enabled ? "0 0 8px rgba(34, 197, 94, 0.4)" : "none",
                            }} />

                            {/* Category badge */}
                            <div style={{
                                padding: "6px 10px", borderRadius: "8px", flexShrink: 0,
                                background: `${getCategoryColor(rule.category)}20`,
                                color: getCategoryColor(rule.category),
                                fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase",
                                letterSpacing: "0.05em",
                            }}>
                                {rule.category || "custom"}
                            </div>

                            {/* Info */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: "0.9375rem", fontWeight: 600, color: "var(--color-text-primary)" }}>
                                    {rule.name}
                                </div>
                                {rule.description && (
                                    <div style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", marginTop: "2px" }}>
                                        {rule.description}
                                    </div>
                                )}
                            </div>

                            {/* Schedule badge */}
                            <div style={{
                                display: "flex", alignItems: "center", gap: "4px",
                                fontSize: "0.75rem", color: "var(--color-text-muted)", flexShrink: 0,
                            }}>
                                <Clock size={12} />
                                {rule.schedule.toLowerCase()}
                            </div>

                            {/* Last triggered */}
                            <div style={{
                                fontSize: "0.75rem", color: "var(--color-text-muted)", flexShrink: 0,
                                minWidth: "80px",
                            }}>
                                {rule.lastTriggeredAt ? (
                                    <span style={{ color: "#f59e0b" }}>⚡ {timeAgo(rule.lastTriggeredAt)}</span>
                                ) : (
                                    "Niet getriggerd"
                                )}
                            </div>

                            {/* Actions */}
                            <div style={{ display: "flex", gap: "6px", flexShrink: 0, position: "relative" }}>
                                {/* Toggle */}
                                <button
                                    onClick={() => handleToggleRule(rule.id, !rule.enabled)}
                                    title={rule.enabled ? "Pauzeren" : "Activeren"}
                                    style={{
                                        padding: "6px", borderRadius: "8px",
                                        background: "rgba(255,255,255,0.05)",
                                        border: "1px solid var(--color-border)",
                                        color: rule.enabled ? "#22c55e" : "var(--color-text-muted)",
                                        cursor: "pointer",
                                    }}
                                >
                                    {rule.enabled ? <Pause size={14} /> : <Play size={14} />}
                                </button>

                                {/* Test */}
                                <button
                                    onClick={() => handleTestRule(rule.id)}
                                    disabled={testingRuleId === rule.id}
                                    title="Test regel"
                                    style={{
                                        padding: "6px", borderRadius: "8px",
                                        background: "rgba(255,255,255,0.05)",
                                        border: "1px solid var(--color-border)",
                                        color: "var(--color-text-secondary)",
                                        cursor: testingRuleId === rule.id ? "wait" : "pointer",
                                    }}
                                >
                                    <Zap size={14} />
                                </button>

                                {/* More menu */}
                                <div style={{ position: "relative" }}>
                                    <button
                                        onClick={() => setActionMenu(actionMenu === rule.id ? null : rule.id)}
                                        style={{
                                            padding: "6px", borderRadius: "8px",
                                            background: "rgba(255,255,255,0.05)",
                                            border: "1px solid var(--color-border)",
                                            color: "var(--color-text-secondary)",
                                            cursor: "pointer",
                                        }}
                                    >
                                        <MoreVertical size={14} />
                                    </button>
                                    {actionMenu === rule.id && (
                                        <div style={{
                                            position: "absolute", right: 0, top: "100%", marginTop: "4px",
                                            background: "var(--color-surface-elevated)",
                                            border: "1px solid var(--color-border)",
                                            borderRadius: "12px", padding: "4px", minWidth: "160px",
                                            boxShadow: "0 10px 25px rgba(0,0,0,0.3)", zIndex: 50,
                                        }}>
                                            <button
                                                onClick={() => { setEditingRule(rule); setShowCreateModal(true); setActionMenu(null); }}
                                                style={menuItemStyle}
                                            >
                                                <Settings size={14} /> Bewerken
                                            </button>
                                            <button
                                                onClick={() => { handleDuplicate(rule); setActionMenu(null); }}
                                                style={menuItemStyle}
                                            >
                                                <Copy size={14} /> Dupliceren
                                            </button>
                                            <button
                                                onClick={() => { handleDeleteRule(rule.id); setActionMenu(null); }}
                                                style={{ ...menuItemStyle, color: "#ef4444" }}
                                            >
                                                <Trash2 size={14} /> Verwijderen
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Test Result Popup */}
            {testResult && (
                <div style={{
                    position: "fixed", bottom: "24px", right: "24px",
                    background: "var(--color-surface-elevated)",
                    border: `1px solid ${testResult.triggered ? "#f59e0b" : "#22c55e"}`,
                    borderRadius: "16px", padding: "20px", maxWidth: "400px",
                    boxShadow: "0 10px 30px rgba(0,0,0,0.4)", zIndex: 100,
                }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                        <div style={{
                            display: "flex", alignItems: "center", gap: "8px",
                            fontSize: "0.9375rem", fontWeight: 600,
                            color: testResult.triggered ? "#f59e0b" : "#22c55e",
                        }}>
                            {testResult.triggered ? <AlertTriangle size={16} /> : <Check size={16} />}
                            {testResult.triggered ? "Regel zou triggeren" : "Regel niet getriggerd"}
                        </div>
                        <button onClick={() => setTestResult(null)} style={{ background: "none", border: "none", color: "var(--color-text-muted)", cursor: "pointer" }}>
                            <X size={16} />
                        </button>
                    </div>
                    {testResult.details && (
                        <pre style={{
                            fontSize: "0.75rem", color: "var(--color-text-muted)",
                            background: "rgba(0,0,0,0.2)", padding: "12px",
                            borderRadius: "8px", overflow: "auto", maxHeight: "200px",
                        }}>
                            {JSON.stringify(testResult.details, null, 2)}
                        </pre>
                    )}
                </div>
            )}

            {/* Template Gallery Modal */}
            {showTemplates && (
                <div style={overlayStyle}>
                    <div style={{ ...modalStyle, maxWidth: "800px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "24px" }}>
                            <div>
                                <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--color-text-primary)" }}>
                                    Regel Templates
                                </h2>
                                <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}>
                                    Begin snel met voorgebouwde regels
                                </p>
                            </div>
                            <button onClick={() => setShowTemplates(false)} style={closeButtonStyle}>
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "12px" }}>
                            {RULE_TEMPLATES.map((template) => {
                                const Icon = template.icon;
                                return (
                                    <button
                                        key={template.id}
                                        onClick={() => handleCreateFromTemplate(template)}
                                        style={{
                                            textAlign: "left", padding: "16px", borderRadius: "12px",
                                            background: "rgba(0,0,0,0.15)", border: "1px solid var(--color-border)",
                                            cursor: "pointer", transition: "all 0.2s",
                                        }}
                                    >
                                        <div style={{
                                            width: "36px", height: "36px", borderRadius: "10px",
                                            background: `${template.color}20`, color: template.color,
                                            display: "flex", alignItems: "center", justifyContent: "center",
                                            marginBottom: "12px",
                                        }}>
                                            <Icon size={18} />
                                        </div>
                                        <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--color-text-primary)", marginBottom: "4px" }}>
                                            {template.name}
                                        </div>
                                        <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                                            {template.description}
                                        </div>
                                        <div style={{
                                            marginTop: "10px", fontSize: "0.65rem", fontWeight: 700,
                                            textTransform: "uppercase", color: template.color,
                                        }}>
                                            {template.category}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Create/Edit Modal */}
            {showCreateModal && (
                <RuleFormModal
                    projectId={projectId}
                    rule={editingRule}
                    template={selectedTemplate}
                    onSave={handleSaveRule}
                    onClose={() => { setShowCreateModal(false); setEditingRule(null); setSelectedTemplate(null); }}
                />
            )}
        </div>
    );
}

const menuItemStyle: React.CSSProperties = {
    width: "100%", display: "flex", alignItems: "center", gap: "8px",
    padding: "8px 12px", borderRadius: "8px", background: "transparent",
    border: "none", color: "var(--color-text-primary)", fontSize: "0.8125rem",
    cursor: "pointer", textAlign: "left",
};

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

const closeButtonStyle: React.CSSProperties = {
    background: "none", border: "none", color: "var(--color-text-muted)",
    cursor: "pointer", padding: "4px",
};
