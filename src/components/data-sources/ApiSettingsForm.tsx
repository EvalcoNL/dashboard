"use client";

import { useState, useEffect } from "react";
import { Key, Save, Loader2, CheckCircle, AlertCircle } from "lucide-react";

export default function ApiSettingsForm() {
    const [settings, setSettings] = useState({
        GOOGLE_ADS_CLIENT_ID: "",
        GOOGLE_ADS_CLIENT_SECRET: "",
        GOOGLE_ADS_DEVELOPER_TOKEN: "",
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

    useEffect(() => {
        fetch("/api/settings")
            .then((res) => res.json())
            .then((data) => {
                if (!data.error) {
                    setSettings({
                        GOOGLE_ADS_CLIENT_ID: data.GOOGLE_ADS_CLIENT_ID || "",
                        GOOGLE_ADS_CLIENT_SECRET: data.GOOGLE_ADS_CLIENT_SECRET || "",
                        GOOGLE_ADS_DEVELOPER_TOKEN: data.GOOGLE_ADS_DEVELOPER_TOKEN || "",
                    });
                }
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const handleSave = async (key: keyof typeof settings) => {
        setSaving(true);
        setStatus(null);
        try {
            const response = await fetch("/api/settings", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ key, value: settings[key] }),
            });
            if (response.ok) {
                setStatus({ type: "success", message: `${key} opgeslagen` });
            } else {
                const data = await response.json();
                setStatus({ type: "error", message: data.error || "Fout bij opslaan" });
            }
        } catch (error: any) {
            setStatus({ type: "error", message: "Netwerkfout" });
        }
        setSaving(false);
    };

    if (loading) return <div className="glass-card" style={{ padding: "24px", minHeight: "100px", display: "flex", alignItems: "center", justifyContent: "center" }}><Loader2 className="animate-spin" /></div>;

    return (
        <div className="glass-card" style={{ padding: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                <div
                    style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "10px",
                        background: "rgba(245, 158, 11, 0.1)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#f59e0b",
                    }}
                >
                    <Key size={20} />
                </div>
                <div>
                    <h3 style={{ fontSize: "0.95rem", fontWeight: 600 }}>Google Ads API</h3>
                    <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>Configureer globale API sleutels</p>
                </div>
            </div>

            <div style={{ display: "grid", gap: "20px" }}>
                {(Object.keys(settings) as Array<keyof typeof settings>).map((key) => (
                    <div key={key}>
                        <label className="label" style={{ marginBottom: "8px", display: "block" }}>
                            {key.replace(/_/g, " ")}
                        </label>
                        <div style={{ display: "flex", gap: "8px" }}>
                            <input
                                type="password"
                                className="input"
                                value={settings[key]}
                                onChange={(e) => setSettings({ ...settings, [key]: e.target.value })}
                                placeholder={`Voer ${key.toLowerCase()} in...`}
                                style={{ flex: 1 }}
                            />
                            <button
                                onClick={() => handleSave(key)}
                                disabled={saving}
                                className="btn btn-secondary"
                                style={{ padding: "8px 12px" }}
                            >
                                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {status && (
                <div
                    style={{
                        marginTop: "20px",
                        padding: "10px 12px",
                        borderRadius: "8px",
                        fontSize: "0.85rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        background: status.type === "success" ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                        color: status.type === "success" ? "#10b981" : "#f87171",
                        border: `1px solid ${status.type === "success" ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)"}`,
                    }}
                >
                    {status.type === "success" ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                    {status.message}
                </div>
            )}
        </div>
    );
}
