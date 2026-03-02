"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
    DollarSign, RefreshCw, Check, Loader2,
    ArrowRightLeft, Globe, Calendar, TrendingUp
} from "lucide-react";

const CURRENCY_INFO: Record<string, { name: string; symbol: string; flag: string }> = {
    EUR: { name: "Euro", symbol: "€", flag: "🇪🇺" },
    USD: { name: "US Dollar", symbol: "$", flag: "🇺🇸" },
    GBP: { name: "Brits Pond", symbol: "£", flag: "🇬🇧" },
    CAD: { name: "Canadese Dollar", symbol: "C$", flag: "🇨🇦" },
    AUD: { name: "Australische Dollar", symbol: "A$", flag: "🇦🇺" },
    SEK: { name: "Zweedse Kroon", symbol: "kr", flag: "🇸🇪" },
    NOK: { name: "Noorse Kroon", symbol: "kr", flag: "🇳🇴" },
    DKK: { name: "Deense Kroon", symbol: "kr", flag: "🇩🇰" },
    CHF: { name: "Zwitserse Frank", symbol: "CHF", flag: "🇨🇭" },
    JPY: { name: "Japanse Yen", symbol: "¥", flag: "🇯🇵" },
    PLN: { name: "Poolse Zloty", symbol: "zł", flag: "🇵🇱" },
    CZK: { name: "Tsjechische Kroon", symbol: "Kč", flag: "🇨🇿" },
};

export default function CurrenciesClient() {
    const params = useParams();
    const projectId = params.id as string;

    const [baseCurrency, setBaseCurrency] = useState("EUR");
    const [autoConvert, setAutoConvert] = useState(true);
    const [rateSource, setRateSource] = useState("ecb");
    const [rates, setRates] = useState<Record<string, number> | null>(null);
    const [lastRefreshed, setLastRefreshed] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => { loadSettings(); }, []);

    const loadSettings = async () => {
        try {
            const res = await fetch("/api/data-integration/currencies");
            const data = await res.json();
            if (data.success) {
                setBaseCurrency(data.baseCurrency);
                setAutoConvert(data.autoConvert);
                setRateSource(data.rateSource);
                setRates(data.rates);
                setLastRefreshed(data.lastRefreshed);
            }
        } finally { setLoaded(true); }
    };

    const saveSettings = async (newBase?: string, newAuto?: boolean, newSource?: string) => {
        setSaving(true);
        try {
            await fetch("/api/data-integration/currencies", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    baseCurrency: newBase || baseCurrency,
                    autoConvert: newAuto !== undefined ? newAuto : autoConvert,
                    rateSource: newSource || rateSource,
                }),
            });
        } finally { setSaving(false); }
    };

    const refreshRates = async () => {
        setRefreshing(true);
        try {
            const res = await fetch("/api/data-integration/currencies", { method: "PATCH" });
            const data = await res.json();
            if (data.success) {
                setRates(data.rates);
                setLastRefreshed(data.lastRefreshed);
            }
        } finally { setRefreshing(false); }
    };

    const handleBaseCurrencyChange = (value: string) => {
        setBaseCurrency(value);
        saveSettings(value);
    };

    const handleAutoConvertToggle = () => {
        const newVal = !autoConvert;
        setAutoConvert(newVal);
        saveSettings(undefined, newVal);
    };

    const handleRateSourceChange = (value: string) => {
        setRateSource(value);
        saveSettings(undefined, undefined, value);
    };

    // Build display currencies: use rates from API or fallback
    const displayCurrencies = Object.entries(CURRENCY_INFO).map(([code, info]) => ({
        code,
        ...info,
        rate: rates?.[code] || null,
    }));

    if (!loaded) {
        return <div style={{ maxWidth: 1200, margin: "0 auto", padding: 32, display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
            <Loader2 size={32} style={{ animation: "spin 1s linear infinite", color: "var(--color-brand)" }} />
        </div>;
    }

    return (
        <div className="animate-fade-in" style={{ maxWidth: 1200, margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                <div>
                    <h1 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "4px", display: "flex", alignItems: "center", gap: "12px" }}>
                        <DollarSign size={28} /> Currencies
                    </h1>
                    <p style={{ color: "var(--color-text-muted)", fontSize: "0.95rem" }}>
                        Configureer valutaconversie voor alle kosten- en omzetmetrics.
                    </p>
                </div>
                <button onClick={refreshRates} disabled={refreshing} style={{
                    display: "flex", alignItems: "center", gap: "8px",
                    padding: "10px 20px", background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px",
                    color: "var(--color-text-primary)", fontWeight: 600, cursor: refreshing ? "wait" : "pointer",
                    opacity: refreshing ? 0.7 : 1,
                }}>
                    {refreshing ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <RefreshCw size={16} />}
                    {refreshing ? "Bezig..." : "Wisselkoersen Vernieuwen"}
                </button>
            </div>

            {/* Settings cards */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "32px" }}>
                <div className="glass-card" style={{ padding: "24px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                        <div style={{ padding: "8px", background: "rgba(99, 102, 241, 0.1)", borderRadius: "8px", color: "#818cf8" }}><Globe size={18} /></div>
                        <span style={{ fontWeight: 600 }}>Basisvaluta</span>
                    </div>
                    <select value={baseCurrency} onChange={e => handleBaseCurrencyChange(e.target.value)}
                        style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "var(--color-text-primary)", fontSize: "1rem" }}>
                        {displayCurrencies.map(c => (
                            <option key={c.code} value={c.code}>{c.flag} {c.code} — {c.name}</option>
                        ))}
                    </select>
                    <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginTop: "8px" }}>
                        Alle kosten worden omgerekend naar {CURRENCY_INFO[baseCurrency]?.symbol} {baseCurrency}
                    </p>
                </div>

                <div className="glass-card" style={{ padding: "24px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                        <div style={{ padding: "8px", background: "rgba(16, 185, 129, 0.1)", borderRadius: "8px", color: "#10b981" }}><ArrowRightLeft size={18} /></div>
                        <span style={{ fontWeight: 600 }}>Automatische Conversie</span>
                    </div>
                    <div onClick={handleAutoConvertToggle} style={{
                        display: "flex", alignItems: "center", gap: "12px", cursor: "pointer",
                        padding: "10px 12px", background: autoConvert ? "rgba(16, 185, 129, 0.1)" : "rgba(255,255,255,0.05)",
                        borderRadius: "8px", border: autoConvert ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid rgba(255,255,255,0.1)"
                    }}>
                        <div style={{ width: "40px", height: "22px", borderRadius: "11px", background: autoConvert ? "#10b981" : "rgba(255,255,255,0.15)", position: "relative", transition: "all 0.2s ease" }}>
                            <div style={{ width: "18px", height: "18px", borderRadius: "50%", background: "white", position: "absolute", top: "2px", left: autoConvert ? "20px" : "2px", transition: "all 0.2s ease" }} />
                        </div>
                        <span style={{ fontWeight: 500, color: autoConvert ? "#10b981" : "var(--color-text-muted)" }}>
                            {autoConvert ? "Ingeschakeld" : "Uitgeschakeld"}
                        </span>
                    </div>
                    <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginTop: "8px" }}>
                        Converteer automatisch bij data-import
                    </p>
                </div>

                <div className="glass-card" style={{ padding: "24px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                        <div style={{ padding: "8px", background: "rgba(245, 158, 11, 0.1)", borderRadius: "8px", color: "#f59e0b" }}><TrendingUp size={18} /></div>
                        <span style={{ fontWeight: 600 }}>Koersbron</span>
                    </div>
                    <select value={rateSource} onChange={e => handleRateSourceChange(e.target.value)}
                        style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "var(--color-text-primary)", fontSize: "1rem" }}>
                        <option value="ecb">ECB (Europese Centrale Bank)</option>
                        <option value="openexchange">Open Exchange Rates</option>
                        <option value="manual">Handmatig</option>
                    </select>
                    <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginTop: "8px" }}>
                        Dagelijks bijgewerkt om 16:00 CET
                    </p>
                </div>
            </div>

            {/* Currency table */}
            <div className="glass-card" style={{ overflow: "hidden" }}>
                <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h3 style={{ fontWeight: 600 }}>Wisselkoersen t.o.v. {baseCurrency}</h3>
                    <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                        <Calendar size={14} />
                        {lastRefreshed
                            ? `Laatst bijgewerkt: ${new Date(lastRefreshed).toLocaleString("nl-NL", { dateStyle: "short", timeStyle: "short" })}`
                            : "Nog niet opgehaald — klik op 'Wisselkoersen Vernieuwen'"
                        }
                    </span>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                        <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                            {["Valuta", "Code", "Symbool", `Koers (1 ${baseCurrency} =)`, "Status"].map(h => (
                                <th key={h} style={{ padding: "10px 20px", textAlign: "left", fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {displayCurrencies.map(c => {
                            const baseRate = rates?.[baseCurrency] || 1;
                            const targetRate = rates?.[c.code] || null;
                            const convertedRate = targetRate && baseRate ? (targetRate / baseRate) : null;

                            return (
                                <tr key={c.code} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                                    <td style={{ padding: "12px 20px" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                            <span style={{ fontSize: "1.2rem" }}>{c.flag}</span>
                                            <span style={{ fontWeight: 500 }}>{c.name}</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: "12px 20px" }}>
                                        <code style={{ fontSize: "0.85rem", padding: "2px 6px", background: "rgba(255,255,255,0.05)", borderRadius: "4px" }}>{c.code}</code>
                                    </td>
                                    <td style={{ padding: "12px 20px", fontSize: "1.1rem" }}>{c.symbol}</td>
                                    <td style={{ padding: "12px 20px" }}>
                                        {c.code === baseCurrency ? (
                                            <span style={{ fontWeight: 600 }}>1.0000</span>
                                        ) : convertedRate ? (
                                            <span style={{ fontWeight: 500 }}>{convertedRate.toFixed(4)}</span>
                                        ) : (
                                            <span style={{ color: "var(--color-text-muted)", fontStyle: "italic" }}>—</span>
                                        )}
                                    </td>
                                    <td style={{ padding: "12px 20px" }}>
                                        <span style={{
                                            display: "inline-flex", alignItems: "center", gap: "4px",
                                            padding: "2px 8px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 600,
                                            background: convertedRate || c.code === baseCurrency ? "rgba(16, 185, 129, 0.1)" : "rgba(245, 158, 11, 0.1)",
                                            color: convertedRate || c.code === baseCurrency ? "#10b981" : "#f59e0b",
                                        }}>
                                            {convertedRate || c.code === baseCurrency ? <><Check size={12} /> Actief</> : "Geen koers"}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
