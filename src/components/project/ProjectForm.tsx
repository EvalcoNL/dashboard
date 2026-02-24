"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import Link from "next/link";

interface ClientData {
    id?: string;
    name?: string;
    industryType?: string;
    targetType?: string;
    targetValue?: string | number;
    tolerancePct?: number;
    evaluationWindowDays?: number;
    profitMarginPct?: string | number | null;
    currency?: string;
}

export default function ProjectForm({ client }: { client?: ClientData }) {
    const router = useRouter();
    const isEdit = !!client;
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [form, setForm] = useState({
        name: client?.name || "",
        industryType: client?.industryType || "LEADGEN",
        targetType: client?.targetType || "CPA",
        targetValue: client?.targetValue?.toString() || "",
        tolerancePct: client?.tolerancePct?.toString() || "15",
        evaluationWindowDays: client?.evaluationWindowDays?.toString() || "7",
        profitMarginPct: client?.profitMarginPct?.toString() || "",
        currency: client?.currency || "EUR",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const url = isEdit ? `/api/projects/${client!.id}` : "/api/projects";
            const method = isEdit ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...form,
                    targetValue: parseFloat(form.targetValue),
                    tolerancePct: parseInt(form.tolerancePct),
                    evaluationWindowDays: parseInt(form.evaluationWindowDays),
                    profitMarginPct: form.profitMarginPct ? parseFloat(form.profitMarginPct) : null,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Er is een fout opgetreden");
            }

            router.push("/dashboard/projects");
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Er is een fout opgetreden");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="animate-fade-in" style={{ maxWidth: "640px" }}>
            <Link
                href="/dashboard/projects"
                style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    color: "var(--color-text-muted)",
                    textDecoration: "none",
                    fontSize: "0.85rem",
                    marginBottom: "24px",
                }}
            >
                <ArrowLeft size={16} /> Terug naar projecten
            </Link>

            <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "32px" }}>
                {isEdit ? `${client!.name} bewerken` : "Nieuwe Project"}
            </h1>

            <form onSubmit={handleSubmit}>
                <div className="glass-card" style={{ padding: "32px" }}>
                    {/* Name */}
                    <div style={{ marginBottom: "20px" }}>
                        <label className="label" htmlFor="name">Projectnaam *</label>
                        <input
                            id="name"
                            className="input"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            placeholder="Bijv. LeadGen Pro BV"
                            required
                        />
                    </div>

                    {/* Industry Type */}
                    <div style={{ marginBottom: "20px" }}>
                        <label className="label" htmlFor="industryType">Branche *</label>
                        <select
                            id="industryType"
                            className="select"
                            value={form.industryType}
                            onChange={(e) => setForm({ ...form, industryType: e.target.value })}
                        >
                            <option value="LEADGEN">Leadgen</option>
                            <option value="ECOMMERCE">E-commerce</option>
                        </select>
                    </div>

                    {/* Target Type + Value */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
                        <div>
                            <label className="label" htmlFor="targetType">Target Type *</label>
                            <select
                                id="targetType"
                                className="select"
                                value={form.targetType}
                                onChange={(e) => setForm({ ...form, targetType: e.target.value })}
                            >
                                <option value="CPA">CPA</option>
                                <option value="ROAS">ROAS</option>
                                <option value="POAS">POAS</option>
                            </select>
                        </div>
                        <div>
                            <label className="label" htmlFor="targetValue">Target Waarde *</label>
                            <input
                                id="targetValue"
                                className="input"
                                type="number"
                                step="0.01"
                                min="0"
                                value={form.targetValue}
                                onChange={(e) => setForm({ ...form, targetValue: e.target.value })}
                                placeholder={form.targetType === "CPA" ? "25.00" : "5.00"}
                                required
                            />
                        </div>
                    </div>

                    {/* Tolerance + Window */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
                        <div>
                            <label className="label" htmlFor="tolerancePct">Tolerance (%)</label>
                            <input
                                id="tolerancePct"
                                className="input"
                                type="number"
                                min="1"
                                max="100"
                                value={form.tolerancePct}
                                onChange={(e) => setForm({ ...form, tolerancePct: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="label" htmlFor="evaluationWindowDays">Evaluatie Window (dagen)</label>
                            <input
                                id="evaluationWindowDays"
                                className="input"
                                type="number"
                                min="1"
                                max="90"
                                value={form.evaluationWindowDays}
                                onChange={(e) => setForm({ ...form, evaluationWindowDays: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* POAS Profit Margin */}
                    {form.targetType === "POAS" && (
                        <div style={{ marginBottom: "20px" }}>
                            <label className="label" htmlFor="profitMarginPct">Winstmarge (%) *</label>
                            <input
                                id="profitMarginPct"
                                className="input"
                                type="number"
                                step="0.01"
                                min="0"
                                max="100"
                                value={form.profitMarginPct}
                                onChange={(e) => setForm({ ...form, profitMarginPct: e.target.value })}
                                placeholder="35.00"
                                required={form.targetType === "POAS"}
                            />
                            <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: "6px" }}>
                                Gebruikt voor POAS berekening: (omzet × marge - spend) / spend
                            </p>
                        </div>
                    )}

                    {/* Currency */}
                    <div style={{ marginBottom: "24px" }}>
                        <label className="label" htmlFor="currency">Valuta</label>
                        <select
                            id="currency"
                            className="select"
                            value={form.currency}
                            onChange={(e) => setForm({ ...form, currency: e.target.value })}
                        >
                            <option value="EUR">EUR (€)</option>
                            <option value="USD">USD ($)</option>
                            <option value="GBP">GBP (£)</option>
                        </select>
                    </div>

                    {/* Error */}
                    {error && (
                        <div
                            style={{
                                padding: "12px 16px",
                                background: "rgba(239, 68, 68, 0.1)",
                                border: "1px solid rgba(239, 68, 68, 0.2)",
                                borderRadius: "10px",
                                marginBottom: "20px",
                                color: "#f87171",
                                fontSize: "0.85rem",
                            }}
                        >
                            {error}
                        </div>
                    )}

                    {/* Submit */}
                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={loading}
                        style={{ width: "100%", opacity: loading ? 0.7 : 1 }}
                    >
                        {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        {isEdit ? "Opslaan" : "Project Aanmaken"}
                    </button>
                </div>
            </form >
        </div >
    );
}
