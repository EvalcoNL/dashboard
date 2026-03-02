"use client";

import { useSearchParams } from "next/navigation";
import { AlertTriangle, X } from "lucide-react";
import { useState } from "react";

export default function ErrorBanner() {
    const searchParams = useSearchParams();
    const error = searchParams.get("error");
    const [dismissed, setDismissed] = useState(false);

    if (!error || dismissed) return null;

    // Map error codes to user-friendly Dutch messages
    const errorMessages: Record<string, string> = {
        "Koppeling geannuleerd": "De koppeling is geannuleerd. Je kunt het opnieuw proberen via 'Toevoegen'.",
        "NoRefreshToken": "Geen refresh token ontvangen. Probeer de koppeling opnieuw.",
        "MerchantLinkFailed": "Het koppelen met Google Merchant Center is mislukt.",
        "GoogleAdsLinkFailed": "Het koppelen met Google Ads is mislukt.",
        "AnalyticsLinkFailed": "Het koppelen met Google Analytics is mislukt.",
        "BusinessLinkFailed": "Het koppelen met Google Business Profile is mislukt.",
        "GTMLinkFailed": "Het koppelen met Google Tag Manager is mislukt.",
        "MetaLinkFailed": "Het koppelen met Meta is mislukt.",
        "LinkedInLinkFailed": "Het koppelen met LinkedIn is mislukt.",
        "MSAdsLinkFailed": "Het koppelen met Microsoft Ads is mislukt.",
        "PinterestLinkFailed": "Het koppelen met Pinterest is mislukt.",
        "YouTubeLinkFailed": "Het koppelen met YouTube is mislukt.",
        "NoBusinessAccounts": "Er zijn geen Google Business accounts gevonden.",
        "NoGTMAccounts": "Er zijn geen Google Tag Manager accounts gevonden.",
    };

    const message = errorMessages[error] || `Er is een fout opgetreden: ${error}`;

    return (
        <div style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "14px 20px",
            marginBottom: "24px",
            background: "rgba(245, 158, 11, 0.08)",
            border: "1px solid rgba(245, 158, 11, 0.25)",
            borderRadius: "12px",
            color: "#f59e0b",
            fontSize: "0.9rem",
            fontWeight: 500,
        }}>
            <AlertTriangle size={20} style={{ flexShrink: 0 }} />
            <span style={{ flex: 1 }}>{message}</span>
            <button
                onClick={() => setDismissed(true)}
                style={{
                    background: "none",
                    border: "none",
                    color: "#f59e0b",
                    cursor: "pointer",
                    padding: "4px",
                    borderRadius: "6px",
                    display: "flex",
                    alignItems: "center",
                }}
            >
                <X size={18} />
            </button>
        </div>
    );
}
