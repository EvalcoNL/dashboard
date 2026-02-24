"use client";

import { useState } from "react";
import { PLATFORM_ROLES } from "@/lib/config/platform-roles";
import { getPlatformColor, getPlatformAbbr } from "@/lib/config/platform-icons";
import { Shield, Plus, Trash2, ChevronRight } from "lucide-react";
import type { UserRoleData } from "./types";

interface UserRolesTabProps {
    userRoles: UserRoleData[];
    onCreateRole: (name: string, description: string, color: string) => Promise<void>;
    onDeleteRole: (roleId: string) => Promise<void>;
    onUpdateRoleMapping: (roleId: string, platformType: string, newPlatformRole: string) => Promise<void>;
}

export default function UserRolesTab({
    userRoles,
    onCreateRole,
    onDeleteRole,
    onUpdateRoleMapping,
}: UserRolesTabProps) {
    const [expandedRoleId, setExpandedRoleId] = useState<string | null>(null);
    const [creatingRole, setCreatingRole] = useState(false);
    const [newRoleName, setNewRoleName] = useState("");
    const [newRoleDescription, setNewRoleDescription] = useState("");
    const [newRoleColor, setNewRoleColor] = useState("#6366f1");
    const [savingRole, setSavingRole] = useState(false);

    const handleSaveNewRole = async () => {
        if (!newRoleName) return;
        setSavingRole(true);
        try {
            await onCreateRole(newRoleName, newRoleDescription, newRoleColor);
            setCreatingRole(false);
            setNewRoleName("");
            setNewRoleDescription("");
            setNewRoleColor("#6366f1");
        } finally {
            setSavingRole(false);
        }
    };

    return (
        <div style={{ animation: "fadeIn 0.3s ease-out" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
                <p style={{ color: "var(--color-text-secondary)", fontSize: "0.85rem", lineHeight: 1.6, margin: 0 }}>
                    Beheer gebruikersrollen met automatische platformrol-toewijzing.
                </p>
                <button
                    onClick={() => setCreatingRole(true)}
                    style={{
                        display: "flex", alignItems: "center", gap: "8px",
                        padding: "10px 20px", borderRadius: "10px", border: "none",
                        background: "var(--color-brand)", color: "white",
                        fontSize: "0.85rem", fontWeight: 600, cursor: "pointer",
                        transition: "all 0.15s", flexShrink: 0,
                    }}
                >
                    <Plus size={16} />
                    Nieuwe rol
                </button>
            </div>

            {/* Create new role form */}
            {creatingRole && (
                <div style={{
                    background: "var(--color-surface-elevated)",
                    border: "1px solid var(--color-brand)",
                    borderRadius: "12px",
                    padding: "20px",
                    marginBottom: "16px",
                    animation: "fadeIn 0.2s ease",
                }}>
                    <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "16px" }}>
                        Nieuwe gebruikersrol
                    </h3>
                    <div style={{ marginBottom: "12px" }}>
                        <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: "4px" }}>Naam *</label>
                        <input
                            value={newRoleName}
                            onChange={(e) => setNewRoleName(e.target.value)}
                            placeholder="bijv. Editor"
                            style={{
                                width: "100%", padding: "8px 12px", borderRadius: "8px",
                                border: "1px solid var(--color-border)", background: "var(--color-surface)",
                                color: "var(--color-text-primary)", fontSize: "0.85rem", outline: "none",
                            }}
                        />
                    </div>
                    <div style={{ marginBottom: "16px" }}>
                        <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: "4px" }}>Beschrijving</label>
                        <input
                            value={newRoleDescription}
                            onChange={(e) => setNewRoleDescription(e.target.value)}
                            placeholder="Korte beschrijving van deze rol"
                            style={{
                                width: "100%", padding: "8px 12px", borderRadius: "8px",
                                border: "1px solid var(--color-border)", background: "var(--color-surface)",
                                color: "var(--color-text-primary)", fontSize: "0.85rem", outline: "none",
                            }}
                        />
                    </div>
                    <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                        <button
                            onClick={() => { setCreatingRole(false); setNewRoleName(""); setNewRoleDescription(""); }}
                            style={{
                                padding: "8px 16px", borderRadius: "8px",
                                border: "1px solid var(--color-border)", background: "none",
                                color: "var(--color-text-secondary)", fontSize: "0.8rem", cursor: "pointer",
                            }}
                        >
                            Annuleren
                        </button>
                        <button
                            onClick={handleSaveNewRole}
                            disabled={!newRoleName || savingRole}
                            style={{
                                padding: "8px 20px", borderRadius: "8px", border: "none",
                                background: newRoleName ? "var(--color-brand)" : "rgba(99,102,241,0.3)",
                                color: "white", fontSize: "0.8rem", fontWeight: 600,
                                cursor: newRoleName ? "pointer" : "not-allowed",
                            }}
                        >
                            {savingRole ? "Opslaan..." : "Aanmaken"}
                        </button>
                    </div>
                </div>
            )}

            {/* Role cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {userRoles.map((role) => {
                    const isExpanded = expandedRoleId === role.id;
                    return (
                        <div
                            key={role.id}
                            style={{
                                background: "var(--color-surface-elevated)",
                                border: `1px solid ${isExpanded ? role.color + "60" : "var(--color-border)"}`,
                                borderRadius: "12px",
                                overflow: "hidden",
                                transition: "all 0.2s ease",
                            }}
                        >
                            {/* Role header */}
                            <div
                                onClick={() => setExpandedRoleId(isExpanded ? null : role.id)}
                                style={{
                                    display: "flex", alignItems: "center", gap: "14px",
                                    padding: "18px 20px", cursor: "pointer",
                                    transition: "background 0.15s",
                                }}
                                onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
                                onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => e.currentTarget.style.background = "transparent"}
                            >
                                <div style={{
                                    width: "40px", height: "40px", borderRadius: "10px",
                                    background: `${role.color}20`, color: role.color,
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    flexShrink: 0,
                                }}>
                                    <Shield size={20} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-text-primary)" }}>
                                            {role.name}
                                        </span>
                                        {role.isDefault && (
                                            <span style={{
                                                fontSize: "0.65rem", fontWeight: 700,
                                                background: `${role.color}20`, color: role.color,
                                                padding: "2px 8px", borderRadius: "4px",
                                            }}>
                                                STANDAARD
                                            </span>
                                        )}
                                    </div>
                                    {role.description && (
                                        <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginTop: "2px" }}>
                                            {role.description}
                                        </div>
                                    )}
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <span style={{
                                        fontSize: "0.75rem", color: "var(--color-text-muted)",
                                        padding: "4px 10px", borderRadius: "6px",
                                        background: "var(--color-surface)",
                                    }}>
                                        {Object.keys(role.roleMapping).length} platforms
                                    </span>
                                    {!role.isDefault && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onDeleteRole(role.id); }}
                                            style={{
                                                background: "none", border: "none", padding: "6px",
                                                color: "var(--color-text-muted)", cursor: "pointer",
                                                borderRadius: "6px", transition: "all 0.15s",
                                            }}
                                            onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.color = "#ef4444"; e.currentTarget.style.background = "rgba(239,68,68,0.1)"; }}
                                            onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.color = "var(--color-text-muted)"; e.currentTarget.style.background = "none"; }}
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    )}
                                    <ChevronRight
                                        size={16}
                                        style={{
                                            color: "var(--color-text-muted)",
                                            transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                                            transition: "transform 0.2s ease",
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Expanded platform mappings */}
                            {isExpanded && (
                                <div style={{
                                    borderTop: "1px solid var(--color-border)",
                                    padding: "16px 20px",
                                    animation: "fadeIn 0.2s ease",
                                }}>
                                    <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginBottom: "12px" }}>
                                        Per-platform roltoewijzing. Klik op een rol om te wijzigen.
                                    </p>
                                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "8px" }}>
                                        {PLATFORM_ROLES.map((config) => {
                                            const currentPlatformRole = role.roleMapping[config.platformType] || config.defaultRole;
                                            const platformColor = getPlatformColor(config.platformType);
                                            return (
                                                <div
                                                    key={config.platformType}
                                                    style={{
                                                        display: "flex", alignItems: "center", gap: "10px",
                                                        padding: "10px 12px", borderRadius: "8px",
                                                        background: "var(--color-surface)",
                                                        border: "1px solid var(--color-border)",
                                                    }}
                                                >
                                                    <div style={{
                                                        width: "28px", height: "28px", borderRadius: "6px",
                                                        background: `${platformColor}20`, color: platformColor,
                                                        display: "flex", alignItems: "center", justifyContent: "center",
                                                        fontSize: "0.55rem", fontWeight: 800, flexShrink: 0,
                                                    }}>
                                                        {getPlatformAbbr(config.platformType)}
                                                    </div>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-primary)" }}>
                                                            {config.platformName}
                                                        </div>
                                                    </div>
                                                    <select
                                                        value={currentPlatformRole}
                                                        onChange={(e) => onUpdateRoleMapping(role.id, config.platformType, e.target.value)}
                                                        style={{
                                                            padding: "4px 8px", borderRadius: "6px",
                                                            border: "1px solid var(--color-border)",
                                                            background: "var(--color-surface-elevated)",
                                                            color: "var(--color-text-primary)",
                                                            fontSize: "0.75rem", outline: "none", cursor: "pointer",
                                                        }}
                                                    >
                                                        {config.roles.map(r => (
                                                            <option key={r.value} value={r.value}>{r.label}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
