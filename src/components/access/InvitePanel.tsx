"use client";

import { useState, useMemo } from "react";
import { getPlatformRoles } from "@/lib/config/platform-roles";
import { ArrowLeft, X, Shield, UserPlus, ChevronDown, Check, Mail, ChevronRight } from "lucide-react";
import { getAppColor, getAppIcon, PLATFORM_EXTRA_FIELDS, type UserRoleData, type AppInfo } from "./types";

interface InvitePanelProps {
    isOpen: boolean;
    availableApps: AppInfo[];
    userRoles: UserRoleData[];
    onClose: () => void;
    onInvite: (data: {
        firstName: string;
        lastName: string;
        email: string;
        appIds: string[];
        roleId: string;
        platformConfig: Record<string, Record<string, string>>;
    }) => Promise<void>;
}

export default function InvitePanel({
    isOpen,
    availableApps,
    userRoles,
    onClose,
    onInvite,
}: InvitePanelProps) {
    const [inviteStep, setInviteStep] = useState(1);
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [selectedApps, setSelectedApps] = useState<Set<string>>(new Set());
    const [selectedRoleId, setSelectedRoleId] = useState("");
    const [inviting, setInviting] = useState(false);
    const [platformConfig, setPlatformConfig] = useState<Record<string, Record<string, string>>>({});

    const selectedRole = useMemo(() => {
        return userRoles.find(r => r.id === selectedRoleId) || null;
    }, [userRoles, selectedRoleId]);

    const appsNeedingConfig = useMemo(() => {
        return Array.from(selectedApps)
            .map(id => availableApps.find(a => a.id === id))
            .filter(app => app && PLATFORM_EXTRA_FIELDS[app.type])
            .map(app => ({ ...app!, extraFields: PLATFORM_EXTRA_FIELDS[app!.type] }));
    }, [selectedApps, availableApps]);

    const totalSteps = appsNeedingConfig.length > 0 ? 3 : 2;

    const reset = () => {
        setInviteStep(1);
        setFirstName("");
        setLastName("");
        setEmail("");
        setSelectedApps(new Set());
        setSelectedRoleId("");
        setPlatformConfig({});
        onClose();
    };

    const toggleApp = (appId: string) => {
        setSelectedApps(prev => {
            const next = new Set(prev);
            if (next.has(appId)) next.delete(appId);
            else next.add(appId);
            return next;
        });
    };

    const toggleAllApps = () => {
        if (selectedApps.size === availableApps.length) {
            setSelectedApps(new Set());
        } else {
            setSelectedApps(new Set(availableApps.map(a => a.id)));
        }
    };

    const handleInvite = async () => {
        if (!email || selectedApps.size === 0 || !selectedRoleId) return;
        setInviting(true);
        try {
            await onInvite({
                firstName,
                lastName,
                email,
                appIds: Array.from(selectedApps),
                roleId: selectedRoleId,
                platformConfig,
            });
            reset();
        } finally {
            setInviting(false);
        }
    };

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={reset}
                style={{
                    position: "fixed",
                    inset: 0,
                    background: "rgba(0, 0, 0, 0.5)",
                    backdropFilter: "blur(4px)",
                    zIndex: 1098,
                    opacity: isOpen ? 1 : 0,
                    pointerEvents: isOpen ? "auto" : "none",
                    transition: "opacity 0.3s ease",
                }}
            />
            <div
                style={{
                    position: "fixed",
                    top: 0,
                    right: 0,
                    height: "100vh",
                    width: "700px",
                    maxWidth: "90vw",
                    background: "var(--color-surface-elevated)",
                    borderLeft: "1px solid var(--color-border)",
                    boxShadow: "-8px 0 30px -10px rgba(0,0,0,0.3)",
                    zIndex: 1099,
                    transform: isOpen ? "translateX(0)" : "translateX(100%)",
                    transition: "transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                }}
            >
                {/* Header */}
                <div style={{
                    padding: "24px 32px",
                    borderBottom: "1px solid var(--color-border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexShrink: 0,
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{
                            width: "36px", height: "36px", borderRadius: "10px",
                            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                            <UserPlus size={18} color="white" />
                        </div>
                        <div>
                            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--color-text-primary)", margin: 0 }}>
                                Gebruiker toevoegen
                            </h2>
                            <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", margin: 0 }}>
                                Stap {inviteStep} van {totalSteps}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={reset}
                        style={{
                            background: "none", border: "none",
                            color: "var(--color-text-muted)", cursor: "pointer",
                            padding: "8px", borderRadius: "8px",
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Step Indicator */}
                <div style={{
                    padding: "16px 32px",
                    display: "flex",
                    gap: "8px",
                    flexShrink: 0,
                }}>
                    {Array.from({ length: totalSteps }, (_, i) => i + 1).map(step => (
                        <div key={step} style={{
                            flex: 1,
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                        }}>
                            <div style={{
                                width: "28px", height: "28px", borderRadius: "50%",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: "0.75rem", fontWeight: 700,
                                background: inviteStep >= step ? "var(--color-brand)" : "var(--color-surface)",
                                color: inviteStep >= step ? "white" : "var(--color-text-muted)",
                                border: inviteStep >= step ? "none" : "1px solid var(--color-border)",
                                transition: "all 0.2s",
                                flexShrink: 0,
                            }}>
                                {inviteStep > step ? <Check size={14} /> : step}
                            </div>
                            <span style={{
                                fontSize: "0.8rem",
                                fontWeight: inviteStep === step ? 600 : 400,
                                color: inviteStep === step ? "var(--color-text-primary)" : "var(--color-text-muted)",
                                whiteSpace: "nowrap",
                            }}>
                                {step === 1 ? "Gegevens" : step === 2 ? "Apps & Rol" : "Configuratie"}
                            </span>
                            {step < totalSteps && (
                                <div style={{
                                    flex: 1, height: "2px",
                                    background: inviteStep > step ? "var(--color-brand)" : "var(--color-border)",
                                    borderRadius: "1px",
                                    transition: "background 0.2s",
                                }} />
                            )}
                        </div>
                    ))}
                </div>

                {/* Step Content */}
                <div style={{
                    flex: 1,
                    overflowY: "auto",
                    padding: "24px 32px",
                }}>
                    {/* STEP 1: User Details */}
                    {inviteStep === 1 && (
                        <div style={{ animation: "fadeIn 0.3s ease" }}>
                            <div style={{
                                display: "flex",
                                justifyContent: "center",
                                marginBottom: "28px",
                            }}>
                                <div style={{
                                    width: "80px", height: "80px", borderRadius: "50%",
                                    background: "linear-gradient(135deg, var(--color-surface), var(--color-border))",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    fontSize: "1.8rem", fontWeight: 700,
                                    color: "var(--color-text-muted)",
                                    border: "2px dashed var(--color-border)",
                                }}>
                                    {firstName ? firstName.charAt(0).toUpperCase() : email ? email.charAt(0).toUpperCase() : "?"}
                                </div>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
                                <div>
                                    <label style={{
                                        display: "block", fontSize: "0.8rem", fontWeight: 600,
                                        color: "var(--color-text-secondary)", marginBottom: "6px",
                                    }}>
                                        Voornaam
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Jan"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        style={{
                                            width: "100%", padding: "10px 12px", borderRadius: "8px",
                                            border: "1px solid var(--color-border)", background: "var(--color-surface)",
                                            color: "var(--color-text-primary)", fontSize: "0.875rem", outline: "none",
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{
                                        display: "block", fontSize: "0.8rem", fontWeight: 600,
                                        color: "var(--color-text-secondary)", marginBottom: "6px",
                                    }}>
                                        Achternaam
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="de Vries"
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        style={{
                                            width: "100%", padding: "10px 12px", borderRadius: "8px",
                                            border: "1px solid var(--color-border)", background: "var(--color-surface)",
                                            color: "var(--color-text-primary)", fontSize: "0.875rem", outline: "none",
                                        }}
                                    />
                                </div>
                            </div>

                            <div style={{ marginBottom: "20px" }}>
                                <label style={{
                                    display: "block", fontSize: "0.8rem", fontWeight: 600,
                                    color: "var(--color-text-secondary)", marginBottom: "6px",
                                }}>
                                    E-mailadres *
                                </label>
                                <div style={{ position: "relative" }}>
                                    <Mail size={16} style={{
                                        position: "absolute", left: "12px", top: "50%",
                                        transform: "translateY(-50%)", color: "var(--color-text-muted)",
                                    }} />
                                    <input
                                        type="email"
                                        placeholder="naam@bedrijf.nl"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        style={{
                                            width: "100%", padding: "10px 12px 10px 36px", borderRadius: "8px",
                                            border: "1px solid var(--color-border)", background: "var(--color-surface)",
                                            color: "var(--color-text-primary)", fontSize: "0.875rem", outline: "none",
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: App Selection + Role */}
                    {inviteStep === 2 && (
                        <div style={{ animation: "fadeIn 0.3s ease" }}>
                            <div style={{ marginBottom: "24px" }}>
                                <label style={{
                                    display: "block", fontSize: "0.8rem", fontWeight: 600,
                                    color: "var(--color-text-secondary)", marginBottom: "10px",
                                }}>
                                    Gebruikersrol *
                                </label>
                                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                                    {userRoles.map((role) => {
                                        const isSelected = selectedRoleId === role.id;
                                        return (
                                            <button
                                                key={role.id}
                                                onClick={() => setSelectedRoleId(role.id)}
                                                style={{
                                                    padding: "10px 20px", borderRadius: "10px",
                                                    border: `2px solid ${isSelected ? "var(--color-brand)" : "var(--color-border)"}`,
                                                    background: isSelected ? "rgba(99, 102, 241, 0.1)" : "var(--color-surface)",
                                                    color: isSelected ? "var(--color-brand)" : "var(--color-text-primary)",
                                                    fontSize: "0.85rem", fontWeight: isSelected ? 700 : 500,
                                                    cursor: "pointer", transition: "all 0.15s",
                                                    display: "flex", alignItems: "center", gap: "8px",
                                                }}
                                            >
                                                <Shield size={14} />
                                                {role.name}
                                            </button>
                                        );
                                    })}
                                </div>
                                {selectedRole && selectedRole.description && (
                                    <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: "8px" }}>
                                        {selectedRole.description}
                                    </p>
                                )}
                            </div>

                            <div>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                                    <label style={{
                                        fontSize: "0.8rem", fontWeight: 600,
                                        color: "var(--color-text-secondary)",
                                    }}>
                                        Toegang tot apps * ({selectedApps.size} geselecteerd)
                                    </label>
                                    {availableApps.length > 0 && (
                                        <button
                                            onClick={toggleAllApps}
                                            style={{
                                                background: "none", border: "none",
                                                color: "var(--color-brand)", fontSize: "0.75rem",
                                                fontWeight: 600, cursor: "pointer",
                                                padding: "2px 6px", borderRadius: "4px",
                                            }}
                                        >
                                            {selectedApps.size === availableApps.length ? "Deselecteer alles" : "Selecteer alles"}
                                        </button>
                                    )}
                                </div>
                                <div style={{ display: "grid", gap: "6px" }}>
                                    {availableApps.map((app) => {
                                        const isSelected = selectedApps.has(app.id);
                                        const resolvedPlatformRole = selectedRole?.roleMapping[app.type];
                                        const pConfig = getPlatformRoles(app.type);
                                        const platformRoleLabel = pConfig?.roles.find(r => r.value === resolvedPlatformRole)?.label;
                                        const needsConfig = !!PLATFORM_EXTRA_FIELDS[app.type];
                                        return (
                                            <div
                                                key={app.id}
                                                onClick={() => toggleApp(app.id)}
                                                style={{
                                                    display: "flex", alignItems: "center", gap: "10px",
                                                    padding: "10px 14px", borderRadius: "10px",
                                                    border: `1px solid ${isSelected ? "var(--color-brand)" : "var(--color-border)"}`,
                                                    background: isSelected ? "rgba(99, 102, 241, 0.06)" : "var(--color-surface)",
                                                    cursor: "pointer", transition: "all 0.15s",
                                                }}
                                            >
                                                <div style={{
                                                    width: "18px", height: "18px", borderRadius: "4px",
                                                    border: `2px solid ${isSelected ? "var(--color-brand)" : "var(--color-border)"}`,
                                                    background: isSelected ? "var(--color-brand)" : "transparent",
                                                    display: "flex", alignItems: "center", justifyContent: "center",
                                                    flexShrink: 0, transition: "all 0.15s",
                                                }}>
                                                    {isSelected && <Check size={12} color="white" />}
                                                </div>
                                                <span style={{
                                                    width: "26px", height: "26px", borderRadius: "7px",
                                                    background: getAppColor(app.type), color: "white",
                                                    display: "flex", alignItems: "center", justifyContent: "center",
                                                    fontSize: "0.6rem", fontWeight: 800, flexShrink: 0,
                                                }}>
                                                    {getAppIcon(app.type)}
                                                </span>
                                                <span style={{
                                                    fontSize: "0.85rem", color: "var(--color-text-primary)",
                                                    fontWeight: isSelected ? 600 : 400, flex: 1,
                                                }}>
                                                    {app.name}
                                                </span>
                                                {isSelected && platformRoleLabel && (
                                                    <span style={{
                                                        fontSize: "0.7rem", color: "var(--color-text-muted)",
                                                        background: "var(--color-surface-elevated)",
                                                        padding: "3px 10px", borderRadius: "6px",
                                                        fontWeight: 500, flexShrink: 0,
                                                    }}>
                                                        {platformRoleLabel}
                                                    </span>
                                                )}
                                                {isSelected && needsConfig && (
                                                    <span style={{
                                                        fontSize: "0.65rem", color: "#f59e0b",
                                                        background: "rgba(245, 158, 11, 0.1)",
                                                        padding: "2px 8px", borderRadius: "4px",
                                                        fontWeight: 600, flexShrink: 0,
                                                    }}>
                                                        Configuratie vereist
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}
                                    {availableApps.length === 0 && (
                                        <p style={{
                                            color: "var(--color-text-muted)", fontSize: "0.85rem",
                                            padding: "16px", textAlign: "center",
                                        }}>
                                            Geen apps beschikbaar. Koppel eerst een app.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: Platform-specific Configuration */}
                    {inviteStep === 3 && (
                        <div style={{ animation: "fadeIn 0.3s ease" }}>
                            <p style={{
                                fontSize: "0.85rem", color: "var(--color-text-secondary)",
                                marginBottom: "24px", lineHeight: 1.6,
                            }}>
                                De volgende platforms vereisen aanvullende gegevens voor het aanmaken van een account.
                            </p>
                            {appsNeedingConfig.map((app) => (
                                <div
                                    key={app.id}
                                    style={{
                                        marginBottom: "24px",
                                        padding: "20px",
                                        borderRadius: "12px",
                                        border: "1px solid var(--color-border)",
                                        background: "var(--color-surface)",
                                    }}
                                >
                                    <div style={{
                                        display: "flex", alignItems: "center", gap: "10px",
                                        marginBottom: "16px",
                                    }}>
                                        <span style={{
                                            width: "28px", height: "28px", borderRadius: "7px",
                                            background: getAppColor(app.type), color: "white",
                                            display: "flex", alignItems: "center", justifyContent: "center",
                                            fontSize: "0.6rem", fontWeight: 800,
                                        }}>
                                            {getAppIcon(app.type)}
                                        </span>
                                        <h4 style={{
                                            fontSize: "0.9rem", fontWeight: 700,
                                            color: "var(--color-text-primary)", margin: 0,
                                        }}>
                                            {app.name}
                                        </h4>
                                    </div>
                                    <div style={{ display: "grid", gridTemplateColumns: app.extraFields.fields.length > 1 ? "1fr 1fr" : "1fr", gap: "12px" }}>
                                        {app.extraFields.fields.map(field => (
                                            <div key={field.key}>
                                                <label style={{
                                                    display: "block", fontSize: "0.75rem", fontWeight: 600,
                                                    color: "var(--color-text-secondary)", marginBottom: "4px",
                                                }}>
                                                    {field.label}
                                                </label>
                                                <input
                                                    type={field.type}
                                                    placeholder={field.placeholder}
                                                    value={platformConfig[app.id]?.[field.key] || ""}
                                                    onChange={(e) => {
                                                        setPlatformConfig(prev => ({
                                                            ...prev,
                                                            [app.id]: {
                                                                ...(prev[app.id] || {}),
                                                                [field.key]: e.target.value,
                                                            },
                                                        }));
                                                    }}
                                                    style={{
                                                        width: "100%", padding: "10px 12px", borderRadius: "8px",
                                                        border: "1px solid var(--color-border)", background: "var(--color-surface-elevated)",
                                                        color: "var(--color-text-primary)", fontSize: "0.85rem", outline: "none",
                                                    }}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            {appsNeedingConfig.length === 0 && (
                                <div style={{
                                    textAlign: "center", padding: "40px",
                                    color: "var(--color-text-muted)", fontSize: "0.9rem",
                                }}>
                                    <Check size={32} style={{ marginBottom: "8px", opacity: 0.5 }} />
                                    <p>Geen extra configuratie nodig.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer with navigation */}
                <div style={{
                    padding: "20px 32px",
                    borderTop: "1px solid var(--color-border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexShrink: 0,
                    background: "var(--color-surface-elevated)",
                }}>
                    <button
                        onClick={() => {
                            if (inviteStep === 1) {
                                reset();
                            } else {
                                setInviteStep(inviteStep - 1);
                            }
                        }}
                        style={{
                            padding: "10px 20px", borderRadius: "10px",
                            border: "1px solid var(--color-border)", background: "none",
                            color: "var(--color-text-secondary)", fontSize: "0.85rem",
                            fontWeight: 500, cursor: "pointer",
                            display: "flex", alignItems: "center", gap: "6px",
                        }}
                    >
                        <ArrowLeft size={16} />
                        {inviteStep === 1 ? "Annuleren" : "Vorige"}
                    </button>

                    {inviteStep < totalSteps ? (
                        <button
                            onClick={() => setInviteStep(inviteStep + 1)}
                            disabled={
                                (inviteStep === 1 && !email) ||
                                (inviteStep === 2 && (selectedApps.size === 0 || !selectedRoleId))
                            }
                            style={{
                                padding: "10px 24px", borderRadius: "10px",
                                border: "none",
                                background: (
                                    (inviteStep === 1 && !email) ||
                                    (inviteStep === 2 && (selectedApps.size === 0 || !selectedRoleId))
                                ) ? "rgba(99, 102, 241, 0.3)" : "var(--color-brand)",
                                color: "white", fontSize: "0.85rem", fontWeight: 600,
                                cursor: (
                                    (inviteStep === 1 && !email) ||
                                    (inviteStep === 2 && (selectedApps.size === 0 || !selectedRoleId))
                                ) ? "not-allowed" : "pointer",
                                display: "flex", alignItems: "center", gap: "6px",
                            }}
                        >
                            Volgende
                            <ChevronRight size={16} />
                        </button>
                    ) : (
                        <button
                            onClick={handleInvite}
                            disabled={!email || selectedApps.size === 0 || !selectedRoleId || inviting}
                            style={{
                                padding: "10px 24px", borderRadius: "10px",
                                border: "none",
                                background: (!email || selectedApps.size === 0 || !selectedRoleId)
                                    ? "rgba(99, 102, 241, 0.3)" : "var(--color-brand)",
                                color: "white", fontSize: "0.85rem", fontWeight: 600,
                                cursor: (!email || selectedApps.size === 0 || !selectedRoleId)
                                    ? "not-allowed" : "pointer",
                                opacity: inviting ? 0.7 : 1,
                                display: "flex", alignItems: "center", gap: "8px",
                            }}
                        >
                            <UserPlus size={16} />
                            {inviting ? "Toevoegen..." : "Toevoegen"}
                        </button>
                    )}
                </div>
            </div>
        </>
    );
}
