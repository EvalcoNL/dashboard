"use client";

import { useState, useEffect, useMemo } from "react";
import { PLATFORM_ROLES } from "@/lib/config/platform-roles";
import { ArrowLeft, X, Shield, Users, Trash2, AppWindow, Search, Filter, UserPlus, ChevronDown, Check, RefreshCw, AlertTriangle, Plus, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getAppColor, getAppIcon, getPersonStatus, type Person, type AccessItem, type UserRoleData, type AppInfo } from "./types";
import UserRolesTab from "./UserRolesTab";
import InvitePanel from "./InvitePanel";

interface AccessManagementProps {
    clientId: string;
    people: Person[];
    filterSourceName?: string;
    availableApps?: AppInfo[];
}



export default function AccessManagement({ clientId, people, filterSourceName, availableApps = [] }: AccessManagementProps) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<"users" | "groups">("users");
    const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
    const [panelOpen, setPanelOpen] = useState(false);
    const [selectedApps, setSelectedApps] = useState<Set<string>>(new Set());
    const [removing, setRemoving] = useState(false);
    const [localPeople, setLocalPeople] = useState<Person[]>(people);

    // Re-sync localPeople when server data changes (e.g. after router.refresh())
    useEffect(() => {
        setLocalPeople(people);
    }, [people]);

    // Search & filter state
    const [searchQuery, setSearchQuery] = useState("");
    const [appFilter, setAppFilter] = useState<string>("");
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);

    // Invite panel state
    const [showInvitePanel, setShowInvitePanel] = useState(false);

    // User roles state
    const [userRoles, setUserRoles] = useState<UserRoleData[]>([]);
    const [rolesLoading, setRolesLoading] = useState(true);

    // Delete confirmation state
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Resend invitation state
    const [resendingId, setResendingId] = useState<string | null>(null);

    // Add app to existing user state
    const [addingAppId, setAddingAppId] = useState<string | null>(null);
    const [showAddApp, setShowAddApp] = useState(false);
    const [addAppRoleId, setAddAppRoleId] = useState<string>("");

    // Toast notification state
    const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

    // Sync state
    const [syncing, setSyncing] = useState(false);

    const showToast = (type: "success" | "error", message: string) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 5000);
    };

    // Fetch user roles
    const fetchUserRoles = async () => {
        try {
            const res = await fetch("/api/user-roles");
            const data = await res.json();
            if (data.roles) {
                setUserRoles(data.roles);
            }
        } catch (err) {
            console.error("Failed to fetch user roles:", err);
        } finally {
            setRolesLoading(false);
        }
    };

    useEffect(() => {
        fetchUserRoles();
    }, []);

    // Filtered people based on search and app filter
    const filteredPeople = useMemo(() => {
        return localPeople.filter((p) => {
            const matchesSearch = searchQuery === "" ||
                p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.email.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesApp = appFilter === "" ||
                p.accesses.some((a) => a.dataSourceType === appFilter);
            return matchesSearch && matchesApp;
        });
    }, [localPeople, searchQuery, appFilter]);

    // Split people into email users and MCC/manager accounts
    const emailUsers = useMemo(() => {
        return filteredPeople.filter(p => p.accesses.every(a => (a.accountKind || "USER") === "USER"));
    }, [filteredPeople]);

    const managerAccounts = useMemo(() => {
        return filteredPeople.filter(p => p.accesses.some(a => a.accountKind === "MANAGER"));
    }, [filteredPeople]);

    // Sync handler
    const handleSync = async () => {
        setSyncing(true);
        try {
            const res = await fetch("/api/data-sources/sync-access", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ clientId }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                const msg = data.message || "Sync voltooid";
                if (data.errors && data.errors.length > 0) {
                    showToast("error", `${msg}. Fouten: ${data.errors.join("; ")}`);
                } else {
                    showToast("success", msg);
                }
                router.refresh();
            } else {
                showToast("error", data.message || data.error || "Sync mislukt");
            }
        } catch (err) {
            console.error("Sync failed:", err);
            showToast("error", "Netwerkfout bij het synchroniseren");
        } finally {
            setSyncing(false);
        }
    };

    const handleResendInvite = async (accountId: string) => {
        setResendingId(accountId);
        try {
            const res = await fetch("/api/data-sources/linked-accounts", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ linkedAccountId: accountId }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                showToast("success", data.message || "Uitnodiging opnieuw verstuurd");
            } else {
                showToast("error", data.message || "Opnieuw versturen mislukt");
            }
        } catch (err) {
            console.error("Resend invite failed:", err);
            showToast("error", "Netwerkfout bij het opnieuw versturen");
        } finally {
            setResendingId(null);
        }
    };

    // Unlinked apps for selected person
    const unlinkedApps = useMemo(() => {
        if (!selectedPerson) return [];
        const linkedTypes = new Set(selectedPerson.accesses.map(a => a.dataSourceId));
        return availableApps.filter(app => !linkedTypes.has(app.id));
    }, [selectedPerson, availableApps]);

    // Handle adding an existing user to a new app
    const handleAddAppToUser = async (appId: string) => {
        if (!selectedPerson) return;
        setAddingAppId(appId);
        try {
            const app = availableApps.find(a => a.id === appId);
            const roleToUse = userRoles.find(r => r.id === addAppRoleId) || userRoles[0];
            const platformRole = roleToUse?.roleMapping[app?.type || ""] || "READ_ONLY";

            const res = await fetch("/api/data-sources/linked-accounts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: selectedPerson.email,
                    name: selectedPerson.name,
                    dataSourceIds: [appId],
                    roles: { [appId]: platformRole },
                }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                showToast("success", `${selectedPerson.name} toegevoegd aan ${app?.name || "app"}`);
                // Update local state
                const newAccess: AccessItem = {
                    dataSourceId: appId,
                    dataSourceName: app?.name || "",
                    dataSourceType: app?.type || "",
                    accountId: data.linkedAccountId || appId,
                    accountRole: platformRole,
                    accountStatus: "PENDING",
                };
                setLocalPeople(prev => prev.map(p =>
                    p.email === selectedPerson.email
                        ? { ...p, accesses: [...p.accesses, newAccess] }
                        : p
                ));
                setSelectedPerson(prev => prev ? { ...prev, accesses: [...prev.accesses, newAccess] } : null);
                router.refresh();
            } else {
                showToast("error", data.message || data.error || "Toevoegen mislukt");
            }
        } catch (err) {
            console.error("Add app failed:", err);
            showToast("error", "Netwerkfout bij het toevoegen");
        } finally {
            setAddingAppId(null);
        }
    };

    // Callbacks for UserRolesTab component
    const handleCreateRole = async (name: string, description: string, color: string) => {
        const defaultMapping: Record<string, string> = {};
        PLATFORM_ROLES.forEach(p => { defaultMapping[p.platformType] = p.defaultRole; });

        const res = await fetch("/api/user-roles", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, description: description || null, color, roleMapping: defaultMapping }),
        });
        const data = await res.json();
        if (data.success) {
            showToast("success", `Rol "${name}" aangemaakt`);
            fetchUserRoles();
        } else {
            showToast("error", data.error || "Aanmaken mislukt");
        }
    };

    const handleDeleteRole = async (roleId: string) => {
        try {
            const res = await fetch("/api/user-roles", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: roleId }),
            });
            const data = await res.json();
            if (data.success) {
                showToast("success", "Rol verwijderd");
                fetchUserRoles();
            } else {
                showToast("error", data.error || "Verwijderen mislukt");
            }
        } catch (err) {
            showToast("error", "Netwerkfout");
        }
    };

    const handleUpdateRoleMapping = async (roleId: string, platformType: string, newPlatformRole: string) => {
        const role = userRoles.find(r => r.id === roleId);
        if (!role) return;
        const updatedMapping = { ...role.roleMapping, [platformType]: newPlatformRole };
        try {
            const res = await fetch("/api/user-roles", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: roleId, roleMapping: updatedMapping }),
            });
            const data = await res.json();
            if (data.success) {
                setUserRoles(prev => prev.map(r => r.id === roleId ? { ...r, roleMapping: updatedMapping } : r));
            }
        } catch (err) {
            showToast("error", "Opslaan mislukt");
        }
    };

    // Callback for InvitePanel component
    const handleInviteUser = async (data: {
        firstName: string;
        lastName: string;
        email: string;
        appIds: string[];
        roleId: string;
        platformConfig: Record<string, Record<string, string>>;
    }) => {
        const selectedRole = userRoles.find(r => r.id === data.roleId);
        if (!selectedRole) return;

        const resolvedRoles: Record<string, string> = {};
        for (const appId of data.appIds) {
            const app = availableApps.find(a => a.id === appId);
            if (app) {
                resolvedRoles[appId] = selectedRole.roleMapping[app.type] || "READ_ONLY";
            }
        }

        const fullName = [data.firstName, data.lastName].filter(Boolean).join(" ") || data.email.split("@")[0];

        const res = await fetch("/api/data-sources/linked-accounts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: data.email,
                name: fullName,
                firstName: data.firstName,
                lastName: data.lastName,
                dataSourceIds: data.appIds,
                roles: resolvedRoles,
                platformConfig: data.platformConfig,
            }),
        });
        const result = await res.json();
        if (res.ok && result.success) {
            showToast("success", result.message || `Uitnodiging verstuurd naar ${data.email}`);
            router.refresh();
        } else {
            showToast("error", result.message || result.error || "Er ging iets mis bij het uitnodigen");
            throw new Error("Invite failed"); // Signal failure to InvitePanel
        }
    };

    useEffect(() => {
        setLocalPeople(people);
    }, [people]);

    const openPanel = (person: Person) => {
        setSelectedPerson(person);
        setSelectedApps(new Set());
        setPanelOpen(true);
    };

    const closePanel = () => {
        setPanelOpen(false);
        setTimeout(() => {
            setSelectedPerson(null);
            setSelectedApps(new Set());
        }, 300);
    };

    const toggleApp = (accountId: string) => {
        setSelectedApps((prev) => {
            const next = new Set(prev);
            if (next.has(accountId)) next.delete(accountId);
            else next.add(accountId);
            return next;
        });
    };

    const handleRemoveAccess = async () => {
        if (selectedApps.size === 0 || !selectedPerson) return;
        setRemoving(true);

        try {
            const res = await fetch("/api/data-sources/linked-accounts", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids: Array.from(selectedApps) }),
            });

            const data = await res.json();

            if (res.ok && data.success) {
                // Update local state
                const removedIds = Array.from(selectedApps);
                const updatedPeople = localPeople
                    .map((p) => {
                        if (p.email !== selectedPerson.email) return p;
                        return {
                            ...p,
                            accesses: p.accesses.filter((a) => !removedIds.includes(a.accountId)),
                        };
                    })
                    .filter((p) => p.accesses.length > 0);

                setLocalPeople(updatedPeople);

                const updatedPerson = updatedPeople.find((p) => p.email === selectedPerson.email);
                if (updatedPerson) {
                    setSelectedPerson(updatedPerson);
                    setSelectedApps(new Set());
                } else {
                    closePanel();
                }

                showToast("success", `Toegang verwijderd voor ${selectedPerson.email}`);
            } else {
                showToast("error", data.results?.find((r: any) => !r.success)?.message || "Verwijderen mislukt");
            }
        } catch (err) {
            console.error("Failed to remove access:", err);
            showToast("error", "Netwerkfout bij het verwijderen van toegang");
        } finally {
            setRemoving(false);
        }
    };

    return (
        <div style={{ padding: "32px", maxWidth: "1200px", margin: "0 auto", position: "relative" }}>
            {/* Back link */}
            <Link
                href={`/dashboard/projects/${clientId}`}
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
                <ArrowLeft size={16} /> Terug naar dashboard
            </Link>

            {/* Title */}
            <div style={{ marginBottom: "8px" }}>
                <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "8px" }}>
                    Toegangsbeheer
                </h1>
                <p style={{ color: "var(--color-text-secondary)", fontSize: "0.9rem" }}>
                    Beheer wie toegang heeft tot de gekoppelde applicaties.
                </p>
                {filterSourceName && (
                    <div style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        marginTop: "12px",
                        padding: "6px 14px",
                        background: "rgba(99, 102, 241, 0.1)",
                        border: "1px solid rgba(99, 102, 241, 0.2)",
                        borderRadius: "8px",
                        fontSize: "0.8rem",
                        color: "var(--color-brand-light)",
                        fontWeight: 600,
                    }}>
                        <AppWindow size={14} />
                        Gefilterd op: {filterSourceName}
                        <Link
                            href={`/dashboard/projects/${clientId}/data/access`}
                            style={{
                                color: "var(--color-text-muted)",
                                marginLeft: "4px",
                                display: "flex",
                                alignItems: "center",
                            }}
                        >
                            <X size={14} />
                        </Link>
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div
                style={{
                    display: "flex",
                    gap: "0",
                    borderBottom: "2px solid var(--color-border)",
                    marginBottom: "28px",
                    marginTop: "24px",
                }}
            >
                <button
                    onClick={() => setActiveTab("users")}
                    style={{
                        padding: "12px 24px",
                        fontSize: "0.875rem",
                        fontWeight: 600,
                        color: activeTab === "users" ? "var(--color-brand)" : "var(--color-text-muted)",
                        background: "none",
                        border: "none",
                        borderBottom: activeTab === "users" ? "2px solid var(--color-brand)" : "2px solid transparent",
                        marginBottom: "-2px",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                    }}
                >
                    <Users size={16} />
                    Gebruikers
                    <span
                        style={{
                            background: activeTab === "users" ? "rgba(99, 102, 241, 0.15)" : "rgba(100, 116, 139, 0.15)",
                            color: activeTab === "users" ? "var(--color-brand)" : "var(--color-text-muted)",
                            padding: "2px 8px",
                            borderRadius: "999px",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                        }}
                    >
                        {localPeople.length}
                    </span>
                </button>
                <button
                    onClick={() => setActiveTab("groups")}
                    style={{
                        padding: "12px 24px",
                        fontSize: "0.875rem",
                        fontWeight: 600,
                        color: activeTab === "groups" ? "var(--color-brand)" : "var(--color-text-muted)",
                        background: "none",
                        border: "none",
                        borderBottom: activeTab === "groups" ? "2px solid var(--color-brand)" : "2px solid transparent",
                        marginBottom: "-2px",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                    }}
                >
                    <Shield size={16} />
                    Gebruikersrollen
                    <span
                        style={{
                            background: activeTab === "groups" ? "rgba(99, 102, 241, 0.15)" : "rgba(100, 116, 139, 0.15)",
                            color: activeTab === "groups" ? "var(--color-brand)" : "var(--color-text-muted)",
                            padding: "2px 8px",
                            borderRadius: "999px",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                        }}
                    >
                        {userRoles.length}
                    </span>
                </button>
            </div>

            {/* Toolbar: Search, Filter, Invite */}
            {activeTab === "users" && (
                <div style={{
                    display: "flex",
                    gap: "12px",
                    marginBottom: "20px",
                    flexWrap: "wrap",
                    alignItems: "center",
                }}>
                    {/* Search Bar */}
                    <div style={{
                        flex: 1,
                        minWidth: "200px",
                        position: "relative",
                    }}>
                        <Search
                            size={16}
                            style={{
                                position: "absolute",
                                left: "12px",
                                top: "50%",
                                transform: "translateY(-50%)",
                                color: "var(--color-text-muted)",
                                pointerEvents: "none",
                            }}
                        />
                        <input
                            type="text"
                            placeholder="Zoek op naam of e-mail..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                width: "100%",
                                padding: "10px 12px 10px 36px",
                                borderRadius: "8px",
                                border: "1px solid var(--color-border)",
                                background: "var(--color-surface)",
                                color: "var(--color-text-primary)",
                                fontSize: "0.875rem",
                                outline: "none",
                                transition: "border-color 0.2s",
                            }}
                            onFocus={(e) => e.currentTarget.style.borderColor = "var(--color-brand)"}
                            onBlur={(e) => e.currentTarget.style.borderColor = "var(--color-border)"}
                        />
                    </div>

                    {/* App Filter */}
                    <div style={{ position: "relative" }}>
                        <button
                            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                padding: "10px 16px",
                                borderRadius: "8px",
                                border: appFilter ? "1px solid var(--color-brand)" : "1px solid var(--color-border)",
                                background: appFilter ? "rgba(99, 102, 241, 0.08)" : "var(--color-surface)",
                                color: appFilter ? "var(--color-brand)" : "var(--color-text-secondary)",
                                fontSize: "0.875rem",
                                fontWeight: 500,
                                cursor: "pointer",
                                transition: "all 0.2s",
                                whiteSpace: "nowrap",
                            }}
                        >
                            <Filter size={16} />
                            {appFilter ? availableApps.find(a => a.type === appFilter)?.name || appFilter : "Filter op app"}
                            <ChevronDown size={14} />
                        </button>
                        {showFilterDropdown && (
                            <>
                                <div
                                    onClick={() => setShowFilterDropdown(false)}
                                    style={{ position: "fixed", inset: 0, zIndex: 40 }}
                                />
                                <div style={{
                                    position: "absolute",
                                    top: "calc(100% + 4px)",
                                    right: 0,
                                    background: "var(--color-surface-elevated)",
                                    border: "1px solid var(--color-border)",
                                    borderRadius: "8px",
                                    padding: "4px",
                                    minWidth: "200px",
                                    boxShadow: "0 10px 30px -10px rgba(0,0,0,0.5)",
                                    zIndex: 50,
                                    animation: "fadeIn 0.15s ease",
                                }}>
                                    <button
                                        onClick={() => { setAppFilter(""); setShowFilterDropdown(false); }}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "8px",
                                            padding: "8px 12px",
                                            width: "100%",
                                            borderRadius: "4px",
                                            border: "none",
                                            background: appFilter === "" ? "rgba(99, 102, 241, 0.1)" : "none",
                                            color: appFilter === "" ? "var(--color-brand)" : "var(--color-text-primary)",
                                            fontSize: "0.875rem",
                                            fontWeight: appFilter === "" ? 600 : 400,
                                            cursor: "pointer",
                                            textAlign: "left",
                                        }}
                                    >
                                        Alle apps
                                        {appFilter === "" && <Check size={14} style={{ marginLeft: "auto" }} />}
                                    </button>
                                    {/* Deduplicate apps by type */}
                                    {Array.from(new Map(availableApps.map(a => [a.type, a])).values()).map((app) => (
                                        <button
                                            key={app.type}
                                            onClick={() => { setAppFilter(app.type); setShowFilterDropdown(false); }}
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "8px",
                                                padding: "8px 12px",
                                                width: "100%",
                                                borderRadius: "4px",
                                                border: "none",
                                                background: appFilter === app.type ? "rgba(99, 102, 241, 0.1)" : "none",
                                                color: appFilter === app.type ? "var(--color-brand)" : "var(--color-text-primary)",
                                                fontSize: "0.875rem",
                                                fontWeight: appFilter === app.type ? 600 : 400,
                                                cursor: "pointer",
                                                textAlign: "left",
                                            }}
                                        >
                                            <span style={{
                                                width: "20px",
                                                height: "20px",
                                                borderRadius: "4px",
                                                background: getAppColor(app.type),
                                                color: "white",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                fontSize: "0.55rem",
                                                fontWeight: 800,
                                                flexShrink: 0,
                                            }}>
                                                {getAppIcon(app.type)}
                                            </span>
                                            {app.name}
                                            {appFilter === app.type && <Check size={14} style={{ marginLeft: "auto" }} />}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Invite Button */}
                    <button
                        onClick={() => setShowInvitePanel(true)}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "10px 20px",
                            borderRadius: "8px",
                            border: "none",
                            background: "var(--color-brand)",
                            color: "white",
                            fontSize: "0.875rem",
                            fontWeight: 600,
                            cursor: "pointer",
                            transition: "all 0.2s",
                            whiteSpace: "nowrap",
                        }}
                        className="invite-btn"
                    >
                        <UserPlus size={16} />
                        Gebruiker toevoegen
                    </button>

                    {/* Sync Button */}
                    <button
                        onClick={handleSync}
                        disabled={syncing}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "10px 20px",
                            borderRadius: "8px",
                            border: "1px solid var(--color-border)",
                            background: "var(--color-surface-elevated)",
                            color: syncing ? "var(--color-text-muted)" : "var(--color-text-primary)",
                            fontSize: "0.875rem",
                            fontWeight: 600,
                            cursor: syncing ? "not-allowed" : "pointer",
                            transition: "all 0.2s",
                            whiteSpace: "nowrap",
                            opacity: syncing ? 0.7 : 1,
                        }}
                    >
                        <RefreshCw size={16} style={syncing ? { animation: "spin 1s linear infinite" } : undefined} />
                        {syncing ? "Synchroniseren..." : "Sync"}
                    </button>
                </div>
            )}

            {/* Users Tab */}
            {activeTab === "users" && (
                <>
                    <div
                        style={{
                            background: "var(--color-surface-elevated)",
                            border: "1px solid var(--color-border)",
                            borderRadius: "12px",
                            overflow: "hidden",
                            animation: "fadeIn 0.3s ease-out",
                        }}
                    >
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                                <tr
                                    style={{
                                        borderBottom: "1px solid var(--color-border)",
                                        textAlign: "left",
                                        fontSize: "0.75rem",
                                        color: "var(--color-text-muted)",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.05em",
                                    }}
                                >
                                    <th style={{ padding: "14px 24px", fontWeight: 600 }}>Gebruiker</th>
                                    <th style={{ padding: "14px 24px", fontWeight: 600 }}>Status</th>
                                    <th style={{ padding: "14px 24px", fontWeight: 600 }}>Toegang</th>
                                    <th style={{ padding: "14px 24px", fontWeight: 600 }}>Gekoppelde apps</th>
                                </tr>
                            </thead>
                            <tbody>
                                {emailUsers.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={4}
                                            style={{
                                                padding: "64px 24px",
                                                textAlign: "center",
                                                color: "var(--color-text-secondary)",
                                            }}
                                        >
                                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
                                                {searchQuery || appFilter ? (
                                                    <>
                                                        <Search size={40} style={{ opacity: 0.3 }} />
                                                        <p>Geen gebruikers gevonden voor je zoekopdracht.</p>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Users size={40} style={{ opacity: 0.3 }} />
                                                        <p>Geen gebruikers gevonden. Sync eerst je apps of voeg handmatig gebruikers toe.</p>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    emailUsers.map((person, idx) => (
                                        <tr
                                            key={idx}
                                            onClick={() => openPanel(person)}
                                            style={{
                                                borderBottom: idx < emailUsers.length - 1 ? "1px solid var(--color-border)" : "none",
                                                cursor: "pointer",
                                                transition: "background 0.15s ease",
                                            }}
                                            className="user-row"
                                        >
                                            <td style={{ padding: "16px 24px" }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                                    <div
                                                        style={{
                                                            width: "36px",
                                                            height: "36px",
                                                            borderRadius: "10px",
                                                            background: "linear-gradient(135deg, var(--color-brand), var(--color-brand-dark))",
                                                            color: "white",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            fontSize: "0.875rem",
                                                            fontWeight: 700,
                                                            flexShrink: 0,
                                                        }}
                                                    >
                                                        {person.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div
                                                            style={{
                                                                fontWeight: 600,
                                                                color: "var(--color-text-primary)",
                                                                fontSize: "0.875rem",
                                                            }}
                                                        >
                                                            {person.name}
                                                        </div>
                                                        <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                                                            {person.email}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: "16px 24px" }}>
                                                {(() => {
                                                    const status = getPersonStatus(person);
                                                    return (
                                                        <span
                                                            style={{
                                                                display: "inline-flex",
                                                                alignItems: "center",
                                                                gap: "6px",
                                                                padding: "4px 10px",
                                                                borderRadius: "999px",
                                                                fontSize: "0.75rem",
                                                                fontWeight: 600,
                                                                background: status.bg,
                                                                color: status.color,
                                                                border: `1px solid ${status.color}25`,
                                                            }}
                                                        >
                                                            <span style={{
                                                                width: "6px",
                                                                height: "6px",
                                                                borderRadius: "50%",
                                                                background: status.color,
                                                            }} />
                                                            {status.label}
                                                        </span>
                                                    );
                                                })()}
                                            </td>
                                            <td style={{ padding: "16px 24px" }}>
                                                <span
                                                    style={{
                                                        fontSize: "0.875rem",
                                                        color: "var(--color-text-primary)",
                                                        fontWeight: 500,
                                                    }}
                                                >
                                                    {person.accesses.length} {person.accesses.length === 1 ? "app" : "apps"}
                                                </span>
                                            </td>
                                            <td style={{ padding: "16px 24px" }}>
                                                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                                                    {person.accesses.map((acc, i) => (
                                                        <div
                                                            key={i}
                                                            style={{
                                                                display: "flex",
                                                                alignItems: "center",
                                                                gap: "6px",
                                                                padding: "4px 10px",
                                                                fontSize: "0.75rem",
                                                                borderRadius: "8px",
                                                                background: `${getAppColor(acc.dataSourceType)}15`,
                                                                color: getAppColor(acc.dataSourceType),
                                                                fontWeight: 600,
                                                                border: `1px solid ${getAppColor(acc.dataSourceType)}25`,
                                                            }}
                                                        >
                                                            <span
                                                                style={{
                                                                    width: "18px",
                                                                    height: "18px",
                                                                    borderRadius: "4px",
                                                                    background: getAppColor(acc.dataSourceType),
                                                                    color: "white",
                                                                    display: "flex",
                                                                    alignItems: "center",
                                                                    justifyContent: "center",
                                                                    fontSize: "0.6rem",
                                                                    fontWeight: 800,
                                                                }}
                                                            >
                                                                {getAppIcon(acc.dataSourceType)}
                                                            </span>
                                                            {acc.dataSourceName}
                                                        </div>
                                                    ))}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Overig section — MCC Manager accounts */}
                    {managerAccounts.length > 0 && (
                        <div style={{ marginTop: "28px" }}>
                            <h3 style={{
                                fontSize: "1rem",
                                fontWeight: 600,
                                color: "var(--color-text-primary)",
                                marginBottom: "12px",
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                            }}>
                                <Shield size={18} style={{ color: "var(--color-text-muted)" }} />
                                Overig (MCC Manager Accounts)
                            </h3>
                            <div
                                style={{
                                    background: "var(--color-surface-elevated)",
                                    border: "1px solid var(--color-border)",
                                    borderRadius: "12px",
                                    overflow: "hidden",
                                }}
                            >
                                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                    <thead>
                                        <tr
                                            style={{
                                                borderBottom: "1px solid var(--color-border)",
                                                textAlign: "left",
                                                fontSize: "0.75rem",
                                                color: "var(--color-text-muted)",
                                                textTransform: "uppercase",
                                                letterSpacing: "0.05em",
                                            }}
                                        >
                                            <th style={{ padding: "14px 24px", fontWeight: 600 }}>Manager</th>
                                            <th style={{ padding: "14px 24px", fontWeight: 600 }}>Status</th>
                                            <th style={{ padding: "14px 24px", fontWeight: 600 }}>Gekoppelde apps</th>
                                            <th style={{ padding: "14px 24px", fontWeight: 600, width: "80px" }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {managerAccounts.map((person, idx) => {
                                            const status = getPersonStatus(person);
                                            return (
                                                <tr
                                                    key={idx}
                                                    style={{
                                                        borderBottom: idx < managerAccounts.length - 1 ? "1px solid var(--color-border)" : "none",
                                                    }}
                                                >
                                                    <td style={{ padding: "16px 24px" }}>
                                                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                                            <div
                                                                style={{
                                                                    width: "36px",
                                                                    height: "36px",
                                                                    borderRadius: "10px",
                                                                    background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                                                                    color: "white",
                                                                    display: "flex",
                                                                    alignItems: "center",
                                                                    justifyContent: "center",
                                                                    fontSize: "0.7rem",
                                                                    fontWeight: 700,
                                                                    flexShrink: 0,
                                                                }}
                                                            >
                                                                MCC
                                                            </div>
                                                            <div>
                                                                <div
                                                                    style={{
                                                                        fontWeight: 600,
                                                                        color: "var(--color-text-primary)",
                                                                        fontSize: "0.875rem",
                                                                    }}
                                                                >
                                                                    {person.name}
                                                                </div>
                                                                <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                                                                    Account ID: {person.email}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: "16px 24px" }}>
                                                        <span
                                                            style={{
                                                                display: "inline-flex",
                                                                alignItems: "center",
                                                                gap: "6px",
                                                                padding: "4px 10px",
                                                                borderRadius: "999px",
                                                                fontSize: "0.75rem",
                                                                fontWeight: 600,
                                                                background: status.bg,
                                                                color: status.color,
                                                                border: `1px solid ${status.color}25`,
                                                            }}
                                                        >
                                                            <span style={{
                                                                width: "6px",
                                                                height: "6px",
                                                                borderRadius: "50%",
                                                                background: status.color,
                                                            }} />
                                                            {status.label}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: "16px 24px" }}>
                                                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                                                            {person.accesses.map((acc, i) => (
                                                                <div
                                                                    key={i}
                                                                    style={{
                                                                        display: "flex",
                                                                        alignItems: "center",
                                                                        gap: "6px",
                                                                        padding: "4px 10px",
                                                                        fontSize: "0.75rem",
                                                                        borderRadius: "8px",
                                                                        background: `${getAppColor(acc.dataSourceType)}15`,
                                                                        color: getAppColor(acc.dataSourceType),
                                                                        fontWeight: 600,
                                                                        border: `1px solid ${getAppColor(acc.dataSourceType)}25`,
                                                                    }}
                                                                >
                                                                    <span
                                                                        style={{
                                                                            width: "18px",
                                                                            height: "18px",
                                                                            borderRadius: "4px",
                                                                            background: getAppColor(acc.dataSourceType),
                                                                            color: "white",
                                                                            display: "flex",
                                                                            alignItems: "center",
                                                                            justifyContent: "center",
                                                                            fontSize: "0.6rem",
                                                                            fontWeight: 800,
                                                                        }}
                                                                    >
                                                                        {getAppIcon(acc.dataSourceType)}
                                                                    </span>
                                                                    {acc.dataSourceName}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: "16px 24px" }}>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedPerson(person);
                                                                setSelectedApps(new Set(person.accesses.map(a => a.accountId)));
                                                                setShowDeleteConfirm(true);
                                                            }}
                                                            style={{
                                                                display: "flex",
                                                                alignItems: "center",
                                                                justifyContent: "center",
                                                                width: "32px",
                                                                height: "32px",
                                                                borderRadius: "8px",
                                                                border: "1px solid var(--color-border)",
                                                                background: "transparent",
                                                                color: "var(--color-text-muted)",
                                                                cursor: "pointer",
                                                                transition: "all 0.2s",
                                                            }}
                                                            className="delete-mcc-btn"
                                                            title="Verwijderen"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Gebruikersrollen Tab */}
            {activeTab === "groups" && (
                <UserRolesTab
                    userRoles={userRoles}
                    onCreateRole={handleCreateRole}
                    onDeleteRole={handleDeleteRole}
                    onUpdateRoleMapping={handleUpdateRoleMapping}
                />
            )}

            {/* Backdrop */}
            <div
                onClick={closePanel}
                style={{
                    position: "fixed",
                    inset: 0,
                    background: "rgba(0, 0, 0, 0.5)",
                    backdropFilter: "blur(4px)",
                    zIndex: 998,
                    opacity: panelOpen ? 1 : 0,
                    pointerEvents: panelOpen ? "auto" : "none",
                    transition: "opacity 0.3s ease",
                }}
            />

            {/* Slide-in Panel */}
            <div
                style={{
                    position: "fixed",
                    top: 0,
                    right: 0,
                    height: "100vh",
                    width: "420px",
                    maxWidth: "90vw",
                    background: "var(--color-surface-elevated)",
                    borderLeft: "1px solid var(--color-border)",
                    boxShadow: panelOpen ? "-8px 0 32px rgba(0, 0, 0, 0.3)" : "none",
                    transform: panelOpen ? "translateX(0)" : "translateX(100%)",
                    transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    zIndex: 999,
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                }}
            >
                {selectedPerson && (
                    <>
                        {/* Panel Header */}
                        <div
                            style={{
                                padding: "24px",
                                borderBottom: "1px solid var(--color-border)",
                                display: "flex",
                                alignItems: "flex-start",
                                justifyContent: "space-between",
                                flexShrink: 0,
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                                <div
                                    style={{
                                        width: "48px",
                                        height: "48px",
                                        borderRadius: "12px",
                                        background: "linear-gradient(135deg, var(--color-brand), var(--color-brand-dark))",
                                        color: "white",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: "1.1rem",
                                        fontWeight: 700,
                                    }}
                                >
                                    {selectedPerson.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h2
                                        style={{
                                            fontSize: "1.1rem",
                                            fontWeight: 700,
                                            color: "var(--color-text-primary)",
                                            marginBottom: "2px",
                                        }}
                                    >
                                        {selectedPerson.name}
                                    </h2>
                                    <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
                                        {selectedPerson.email}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={closePanel}
                                style={{
                                    background: "var(--color-surface-hover)",
                                    border: "none",
                                    borderRadius: "8px",
                                    width: "32px",
                                    height: "32px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    cursor: "pointer",
                                    color: "var(--color-text-secondary)",
                                    transition: "all 0.15s ease",
                                    flexShrink: 0,
                                }}
                                className="panel-close-btn"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Panel Body */}
                        <div
                            style={{
                                flex: 1,
                                overflow: "auto",
                                padding: "24px",
                            }}
                        >
                            <div
                                style={{
                                    fontSize: "0.75rem",
                                    fontWeight: 700,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.05em",
                                    color: "var(--color-text-muted)",
                                    marginBottom: "16px",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px",
                                }}
                            >
                                <AppWindow size={14} />
                                Gekoppelde apps ({selectedPerson.accesses.length})
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                {selectedPerson.accesses.map((acc, i) => {
                                    const isSelected = selectedApps.has(acc.accountId);
                                    return (
                                        <div
                                            key={i}
                                            onClick={() => toggleApp(acc.accountId)}
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "12px",
                                                padding: "14px 16px",
                                                borderRadius: "10px",
                                                border: `1px solid ${isSelected ? "var(--color-danger)" : "var(--color-border)"}`,
                                                background: isSelected
                                                    ? "rgba(239, 68, 68, 0.05)"
                                                    : "var(--color-surface)",
                                                cursor: "pointer",
                                                transition: "all 0.15s ease",
                                            }}
                                            className="app-card"
                                        >
                                            {/* Checkbox */}
                                            <div
                                                style={{
                                                    width: "20px",
                                                    height: "20px",
                                                    borderRadius: "6px",
                                                    border: isSelected
                                                        ? "2px solid var(--color-danger)"
                                                        : "2px solid var(--color-border)",
                                                    background: isSelected
                                                        ? "var(--color-danger)"
                                                        : "transparent",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    flexShrink: 0,
                                                    transition: "all 0.15s ease",
                                                }}
                                            >
                                                {isSelected && (
                                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                                        <path
                                                            d="M2.5 6L5 8.5L9.5 3.5"
                                                            stroke="white"
                                                            strokeWidth="2"
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                        />
                                                    </svg>
                                                )}
                                            </div>

                                            {/* App Icon */}
                                            <div
                                                style={{
                                                    width: "36px",
                                                    height: "36px",
                                                    borderRadius: "8px",
                                                    background: getAppColor(acc.dataSourceType),
                                                    color: "white",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    fontSize: "0.7rem",
                                                    fontWeight: 800,
                                                    flexShrink: 0,
                                                }}
                                            >
                                                {getAppIcon(acc.dataSourceType)}
                                            </div>

                                            {/* App Info */}
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div
                                                    style={{
                                                        fontWeight: 600,
                                                        fontSize: "0.875rem",
                                                        color: "var(--color-text-primary)",
                                                        marginBottom: "2px",
                                                    }}
                                                >
                                                    {acc.dataSourceName}
                                                </div>
                                                <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                                                    {acc.dataSourceType.replace(/_/g, " ")}
                                                    {acc.accountRole && ` · ${acc.accountRole}`}
                                                </div>
                                            </div>

                                            {/* Status + Resend */}
                                            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                                                <div
                                                    style={{
                                                        padding: "3px 8px",
                                                        borderRadius: "6px",
                                                        fontSize: "0.7rem",
                                                        fontWeight: 600,
                                                        background:
                                                            acc.accountStatus === "ACTIVE"
                                                                ? "rgba(16, 185, 129, 0.1)"
                                                                : acc.accountStatus === "PENDING"
                                                                    ? "rgba(245, 158, 11, 0.1)"
                                                                    : "rgba(239, 68, 68, 0.1)",
                                                        color:
                                                            acc.accountStatus === "ACTIVE"
                                                                ? "var(--color-success)"
                                                                : acc.accountStatus === "PENDING"
                                                                    ? "#f59e0b"
                                                                    : "var(--color-danger)",
                                                        textTransform: "uppercase",
                                                        letterSpacing: "0.03em",
                                                    }}
                                                >
                                                    {acc.accountStatus === "ACTIVE" ? "Actief" : acc.accountStatus === "PENDING" ? "Uitgenodigd" : acc.accountStatus}
                                                </div>
                                                {acc.accountStatus === "PENDING" && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleResendInvite(acc.accountId);
                                                        }}
                                                        disabled={resendingId === acc.accountId}
                                                        title="Uitnodiging opnieuw versturen"
                                                        style={{
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            gap: "4px",
                                                            padding: "4px 8px",
                                                            borderRadius: "6px",
                                                            border: "1px solid rgba(245, 158, 11, 0.3)",
                                                            background: "rgba(245, 158, 11, 0.08)",
                                                            color: "#f59e0b",
                                                            fontSize: "0.65rem",
                                                            fontWeight: 600,
                                                            cursor: resendingId === acc.accountId ? "wait" : "pointer",
                                                            opacity: resendingId === acc.accountId ? 0.6 : 1,
                                                            transition: "all 0.15s ease",
                                                        }}
                                                        className="resend-btn"
                                                    >
                                                        <RefreshCw size={11} style={{
                                                            animation: resendingId === acc.accountId ? "spin 1s linear infinite" : "none",
                                                        }} />
                                                        {resendingId === acc.accountId ? "..." : "Opnieuw"}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Add App Section */}
                            {unlinkedApps.length > 0 && (
                                <div style={{ marginTop: "24px" }}>
                                    <button
                                        onClick={() => {
                                            setShowAddApp(!showAddApp);
                                            if (!addAppRoleId && userRoles.length > 0) {
                                                setAddAppRoleId(userRoles[0].id);
                                            }
                                        }}
                                        style={{
                                            display: "flex", alignItems: "center", gap: "8px",
                                            width: "100%", padding: "12px 16px", borderRadius: "10px",
                                            border: `1px dashed ${showAddApp ? "var(--color-brand)" : "var(--color-border)"}`,
                                            background: showAddApp ? "rgba(99, 102, 241, 0.05)" : "transparent",
                                            color: showAddApp ? "var(--color-brand)" : "var(--color-text-muted)",
                                            fontSize: "0.85rem", fontWeight: 600,
                                            cursor: "pointer", transition: "all 0.15s",
                                        }}
                                    >
                                        <Plus size={16} />
                                        Toevoegen aan app ({unlinkedApps.length} beschikbaar)
                                        <ChevronDown size={14} style={{
                                            marginLeft: "auto",
                                            transform: showAddApp ? "rotate(180deg)" : "none",
                                            transition: "transform 0.2s",
                                        }} />
                                    </button>

                                    {showAddApp && (
                                        <div style={{
                                            marginTop: "12px",
                                            padding: "16px",
                                            borderRadius: "10px",
                                            border: "1px solid var(--color-border)",
                                            background: "var(--color-surface)",
                                            animation: "fadeIn 0.2s ease",
                                        }}>
                                            {/* Role selector for adding */}
                                            <div style={{ marginBottom: "12px" }}>
                                                <label style={{
                                                    display: "block", fontSize: "0.7rem", fontWeight: 600,
                                                    color: "var(--color-text-muted)", marginBottom: "6px",
                                                    textTransform: "uppercase", letterSpacing: "0.05em",
                                                }}>
                                                    Rol voor nieuwe app
                                                </label>
                                                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                                                    {userRoles.map(role => (
                                                        <button
                                                            key={role.id}
                                                            onClick={() => setAddAppRoleId(role.id)}
                                                            style={{
                                                                padding: "5px 12px", borderRadius: "6px",
                                                                border: `1px solid ${addAppRoleId === role.id ? "var(--color-brand)" : "var(--color-border)"}`,
                                                                background: addAppRoleId === role.id ? "rgba(99, 102, 241, 0.1)" : "transparent",
                                                                color: addAppRoleId === role.id ? "var(--color-brand)" : "var(--color-text-secondary)",
                                                                fontSize: "0.75rem", fontWeight: addAppRoleId === role.id ? 700 : 500,
                                                                cursor: "pointer", transition: "all 0.15s",
                                                            }}
                                                        >
                                                            {role.name}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Unlinked apps list */}
                                            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                                {unlinkedApps.map(app => (
                                                    <div
                                                        key={app.id}
                                                        style={{
                                                            display: "flex", alignItems: "center", gap: "10px",
                                                            padding: "10px 12px", borderRadius: "8px",
                                                            border: "1px solid var(--color-border)",
                                                            background: "var(--color-surface-elevated)",
                                                        }}
                                                    >
                                                        <div style={{
                                                            width: "30px", height: "30px", borderRadius: "7px",
                                                            background: getAppColor(app.type), color: "white",
                                                            display: "flex", alignItems: "center", justifyContent: "center",
                                                            fontSize: "0.6rem", fontWeight: 800, flexShrink: 0,
                                                        }}>
                                                            {getAppIcon(app.type)}
                                                        </div>
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--color-text-primary)" }}>
                                                                {app.name}
                                                            </div>
                                                            <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>
                                                                {app.type.replace(/_/g, " ")}
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => handleAddAppToUser(app.id)}
                                                            disabled={addingAppId === app.id}
                                                            style={{
                                                                display: "flex", alignItems: "center", gap: "4px",
                                                                padding: "6px 12px", borderRadius: "6px",
                                                                border: "none",
                                                                background: addingAppId === app.id ? "rgba(99, 102, 241, 0.3)" : "var(--color-brand)",
                                                                color: "white", fontSize: "0.75rem", fontWeight: 600,
                                                                cursor: addingAppId === app.id ? "wait" : "pointer",
                                                                opacity: addingAppId === app.id ? 0.7 : 1,
                                                                transition: "all 0.15s",
                                                                flexShrink: 0,
                                                            }}
                                                        >
                                                            <Plus size={12} />
                                                            {addingAppId === app.id ? "..." : "Toevoegen"}
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Panel Footer */}
                        {selectedApps.size > 0 && (
                            <div
                                style={{
                                    padding: "20px 24px",
                                    borderTop: "1px solid var(--color-border)",
                                    flexShrink: 0,
                                    animation: "fadeIn 0.2s ease-out",
                                }}
                            >
                                <button
                                    onClick={() => setShowDeleteConfirm(true)}
                                    disabled={removing}
                                    style={{
                                        width: "100%",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: "8px",
                                        padding: "12px",
                                        borderRadius: "10px",
                                        border: "none",
                                        background: "linear-gradient(135deg, #ef4444, #dc2626)",
                                        color: "white",
                                        fontWeight: 700,
                                        fontSize: "0.875rem",
                                        cursor: removing ? "wait" : "pointer",
                                        opacity: removing ? 0.7 : 1,
                                        transition: "all 0.2s ease",
                                    }}
                                    className="remove-btn"
                                >
                                    <Trash2 size={16} />
                                    {removing
                                        ? "Verwijderen..."
                                        : `Verwijder ${selectedApps.size} ${selectedApps.size === 1 ? "app" : "apps"}`}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Invite Panel */}
            <InvitePanel
                isOpen={showInvitePanel}
                availableApps={availableApps}
                userRoles={userRoles}
                onClose={() => setShowInvitePanel(false)}
                onInvite={handleInviteUser}
            />


            {/* Toast Notification */}
            {
                toast && (
                    <div
                        style={{
                            position: "fixed",
                            top: "24px",
                            right: "24px",
                            zIndex: 200,
                            padding: "14px 20px",
                            borderRadius: "10px",
                            background: toast.type === "success"
                                ? "rgba(16, 185, 129, 0.15)"
                                : "rgba(239, 68, 68, 0.15)",
                            border: `1px solid ${toast.type === "success" ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
                            color: toast.type === "success" ? "#10b981" : "#ef4444",
                            fontSize: "0.875rem",
                            fontWeight: 600,
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            boxShadow: "0 8px 24px -8px rgba(0,0,0,0.3)",
                            backdropFilter: "blur(8px)",
                            animation: "slideIn 0.3s ease",
                            maxWidth: "400px",
                        }}
                    >
                        {toast.type === "success" ? <Check size={18} /> : <X size={18} />}
                        {toast.message}
                        <button
                            onClick={() => setToast(null)}
                            style={{
                                background: "none",
                                border: "none",
                                color: "inherit",
                                cursor: "pointer",
                                padding: "2px",
                                marginLeft: "8px",
                                opacity: 0.7,
                            }}
                        >
                            <X size={14} />
                        </button>
                    </div>
                )
            }

            {/* Delete Confirmation Dialog */}
            {
                showDeleteConfirm && selectedPerson && (
                    <>
                        <div
                            onClick={() => setShowDeleteConfirm(false)}
                            style={{
                                position: "fixed",
                                inset: 0,
                                background: "rgba(0,0,0,0.6)",
                                zIndex: 1100,
                                backdropFilter: "blur(4px)",
                                animation: "fadeIn 0.2s ease",
                            }}
                        />
                        <div
                            style={{
                                position: "fixed",
                                top: "50%",
                                left: "50%",
                                transform: "translate(-50%, -50%)",
                                width: "100%",
                                maxWidth: "420px",
                                background: "var(--color-surface-elevated)",
                                border: "1px solid var(--color-border)",
                                borderRadius: "16px",
                                padding: "32px",
                                zIndex: 1101,
                                animation: "slideUp 0.3s ease",
                                boxShadow: "0 20px 60px -15px rgba(0,0,0,0.5)",
                            }}
                        >
                            <div style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "12px",
                                marginBottom: "16px",
                            }}>
                                <div style={{
                                    width: "44px",
                                    height: "44px",
                                    borderRadius: "12px",
                                    background: "rgba(239, 68, 68, 0.1)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                }}>
                                    <AlertTriangle size={22} color="#ef4444" />
                                </div>
                                <h2 style={{
                                    fontSize: "1.1rem",
                                    fontWeight: 700,
                                    color: "var(--color-text-primary)",
                                }}>
                                    Toegang verwijderen
                                </h2>
                            </div>

                            <p style={{
                                fontSize: "0.9rem",
                                color: "var(--color-text-secondary)",
                                lineHeight: 1.6,
                                marginBottom: "8px",
                            }}>
                                Weet je zeker dat je de toegang voor <strong style={{ color: "var(--color-text-primary)" }}>{selectedPerson.name}</strong> wilt verwijderen?
                            </p>
                            <p style={{
                                fontSize: "0.8rem",
                                color: "var(--color-text-muted)",
                                lineHeight: 1.5,
                                marginBottom: "24px",
                            }}>
                                {selectedApps.size} {selectedApps.size === 1 ? "app wordt" : "apps worden"} ontkoppeld van dit account. Dit kan niet ongedaan worden gemaakt.
                            </p>

                            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    style={{
                                        padding: "10px 20px",
                                        borderRadius: "8px",
                                        border: "1px solid var(--color-border)",
                                        background: "none",
                                        color: "var(--color-text-secondary)",
                                        fontSize: "0.875rem",
                                        fontWeight: 500,
                                        cursor: "pointer",
                                        transition: "all 0.15s",
                                    }}
                                >
                                    Annuleren
                                </button>
                                <button
                                    onClick={() => {
                                        setShowDeleteConfirm(false);
                                        handleRemoveAccess();
                                    }}
                                    disabled={removing}
                                    style={{
                                        padding: "10px 24px",
                                        borderRadius: "8px",
                                        border: "none",
                                        background: "linear-gradient(135deg, #ef4444, #dc2626)",
                                        color: "white",
                                        fontSize: "0.875rem",
                                        fontWeight: 600,
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                        transition: "all 0.15s",
                                    }}
                                    className="remove-btn"
                                >
                                    <Trash2 size={16} />
                                    Ja, verwijderen
                                </button>
                            </div>
                        </div>
                    </>
                )
            }

            <style jsx>{`
                .user-row:hover {
                    background: var(--color-surface-hover);
                }
                .panel-close-btn:hover {
                    background: var(--color-border);
                    color: var(--color-text-primary);
                }
                .app-card:hover {
                    border-color: var(--color-text-muted);
                }
                .remove-btn:hover:not(:disabled) {
                    box-shadow: 0 4px 16px rgba(239, 68, 68, 0.4);
                    transform: translateY(-1px);
                }
                .resend-btn:hover:not(:disabled) {
                    background: rgba(245, 158, 11, 0.15);
                    border-color: rgba(245, 158, 11, 0.5);
                }
                .invite-btn:hover {
                    box-shadow: 0 4px 16px rgba(99, 102, 241, 0.4);
                    transform: translateY(-1px);
                }
                @keyframes slideUp {
                    from { opacity: 0; transform: translate(-50%, -45%); }
                    to { opacity: 1; transform: translate(-50%, -50%); }
                }
                @keyframes slideIn {
                    from { opacity: 0; transform: translateX(20px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div >
    );
}
