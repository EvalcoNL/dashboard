"use client";

import { useState } from "react";
import { X, Key, Loader2, ExternalLink } from "lucide-react";

interface ApiKeyLinkModalProps {
    open: boolean;
    onClose: () => void;
    clientId: string;
    platformType: string;
    platformName: string;
    platformColor: string;
    fields?: { key: string; label: string; placeholder: string; required?: boolean; type?: string }[];
}

const DEFAULT_FIELDS = [
    { key: "apiKey", label: "API Key", placeholder: "Voer je API key in...", required: true, type: "password" },
];

export default function ApiKeyLinkModal({
    open,
    onClose,
    clientId,
    platformType,
    platformName,
    platformColor,
    fields = DEFAULT_FIELDS,
}: ApiKeyLinkModalProps) {
    const [values, setValues] = useState<Record<string, string>>({});
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    if (!open) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const res = await fetch("/api/data-sources/api-key", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    clientId,
                    platformType,
                    name: name || platformName,
                    config: values,
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Er ging iets mis");

            setSuccess(true);
            setTimeout(() => {
                onClose();
                window.location.reload();
            }, 1500);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            style={{
                position: "fixed", inset: 0, zIndex: 1000,
                background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
                display: "flex", alignItems: "center", justifyContent: "center",
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: "var(--color-surface-elevated)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "16px",
                    padding: "32px",
                    width: "100%",
                    maxWidth: "480px",
                    position: "relative",
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    style={{
                        position: "absolute", top: "16px", right: "16px",
                        background: "none", border: "none", cursor: "pointer",
                        color: "var(--color-text-muted)", padding: "4px",
                    }}
                >
                    <X size={20} />
                </button>

                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
                    <div style={{
                        width: "48px", height: "48px", borderRadius: "12px",
                        background: `${platformColor}20`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                        <Key size={24} color={platformColor} />
                    </div>
                    <div>
                        <h2 style={{ fontWeight: 700, fontSize: "1.25rem", color: "var(--color-text-primary)", margin: 0 }}>
                            {platformName} koppelen
                        </h2>
                        <p style={{ color: "var(--color-text-secondary)", fontSize: "0.85rem", margin: 0 }}>
                            Voer de API gegevens in om te koppelen
                        </p>
                    </div>
                </div>

                {success ? (
                    <div style={{
                        padding: "24px", textAlign: "center",
                        background: "rgba(16,185,129,0.1)", borderRadius: "12px",
                        color: "#10b981", fontWeight: 600,
                    }}>
                        ✓ {platformName} is succesvol gekoppeld!
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        {/* Display name */}
                        <div style={{ marginBottom: "16px" }}>
                            <label style={{
                                display: "block", marginBottom: "6px", fontWeight: 600,
                                fontSize: "0.85rem", color: "var(--color-text-primary)",
                            }}>
                                Weergavenaam (optioneel)
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder={platformName}
                                style={{
                                    width: "100%", padding: "10px 14px",
                                    background: "var(--color-surface)", border: "1px solid var(--color-border)",
                                    borderRadius: "8px", color: "var(--color-text-primary)",
                                    fontSize: "0.9rem", outline: "none", boxSizing: "border-box",
                                }}
                            />
                        </div>

                        {/* Dynamic fields */}
                        {fields.map((field) => (
                            <div key={field.key} style={{ marginBottom: "16px" }}>
                                <label style={{
                                    display: "block", marginBottom: "6px", fontWeight: 600,
                                    fontSize: "0.85rem", color: "var(--color-text-primary)",
                                }}>
                                    {field.label} {field.required && <span style={{ color: "#ef4444" }}>*</span>}
                                </label>
                                <input
                                    type={field.type || "text"}
                                    required={field.required}
                                    value={values[field.key] || ""}
                                    onChange={e => setValues({ ...values, [field.key]: e.target.value })}
                                    placeholder={field.placeholder}
                                    style={{
                                        width: "100%", padding: "10px 14px",
                                        background: "var(--color-surface)", border: "1px solid var(--color-border)",
                                        borderRadius: "8px", color: "var(--color-text-primary)",
                                        fontSize: "0.9rem", outline: "none", boxSizing: "border-box",
                                        fontFamily: field.type === "password" ? "monospace" : "inherit",
                                    }}
                                />
                            </div>
                        ))}

                        {error && (
                            <div style={{
                                padding: "10px 14px", marginBottom: "16px",
                                background: "rgba(239,68,68,0.1)", borderRadius: "8px",
                                color: "#ef4444", fontSize: "0.85rem",
                            }}>
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                width: "100%", padding: "12px",
                                background: platformColor, color: "white",
                                border: "none", borderRadius: "10px",
                                fontWeight: 600, fontSize: "0.95rem",
                                cursor: loading ? "not-allowed" : "pointer",
                                opacity: loading ? 0.7 : 1,
                                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                            }}
                        >
                            {loading ? <Loader2 size={18} className="spin" /> : <ExternalLink size={18} />}
                            {loading ? "Koppelen..." : "Koppelen"}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
