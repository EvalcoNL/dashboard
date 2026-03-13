"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    Plus, Trash2, Users, FolderOpen, MoreHorizontal, X,
    ChevronDown, ChevronRight, Edit3, Check, UserPlus
} from "lucide-react";
import { useNotification } from "@/components/NotificationProvider";

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
}

interface Member {
    id: string;
    role: string;
    user: User;
}

interface Project {
    id: string;
    name: string;
    accountGroupId?: string | null;
}

interface AccountGroup {
    id: string;
    name: string;
    slug: string;
    members: Member[];
    projects: { id: string; name: string }[];
}

export default function AccountGroupsManager({
    initialGroups,
    allUsers,
    allProjects,
}: {
    initialGroups: AccountGroup[];
    allUsers: User[];
    allProjects: Project[];
}) {
    const router = useRouter();
    const { showToast } = useNotification();
    const [groups, setGroups] = useState<AccountGroup[]>(initialGroups);
    const [loading, setLoading] = useState(false);
    const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newGroupName, setNewGroupName] = useState("");
    const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
    const [showAddMemberGroupId, setShowAddMemberGroupId] = useState<string | null>(null);
    const [showAddProjectGroupId, setShowAddProjectGroupId] = useState<string | null>(null);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);

    const createGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newGroupName.trim()) return;
        setLoading(true);
        try {
            const res = await fetch("/api/admin/account-groups", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newGroupName.trim() }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setGroups([data.group, ...groups]);
            setNewGroupName("");
            setShowCreateModal(false);
            showToast("success", `Accountgroep "${data.group.name}" aangemaakt`);
        } catch (err: any) {
            showToast("error", err.message || "Fout bij aanmaken.");
        } finally {
            setLoading(false);
        }
    };

    const deleteGroup = async (groupId: string) => {
        if (!confirm("Weet je zeker dat je deze accountgroep wilt verwijderen? Projecten worden ontkoppeld maar niet verwijderd.")) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/account-groups/${groupId}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Verwijderen mislukt");
            setGroups(groups.filter(g => g.id !== groupId));
            showToast("success", "Accountgroep verwijderd");
        } catch (err: any) {
            showToast("error", err.message);
        } finally {
            setLoading(false);
        }
    };

    const addMember = async (groupId: string, userId: string, role: string = "MEMBER") => {
        const group = groups.find(g => g.id === groupId);
        if (!group) return;
        const newMembers = [...group.members.map(m => ({ userId: m.user.id, role: m.role })), { userId, role }];
        await updateGroup(groupId, { members: newMembers });
        setShowAddMemberGroupId(null);
    };

    const removeMember = async (groupId: string, userId: string) => {
        const group = groups.find(g => g.id === groupId);
        if (!group) return;
        const newMembers = group.members.filter(m => m.user.id !== userId).map(m => ({ userId: m.user.id, role: m.role }));
        await updateGroup(groupId, { members: newMembers });
    };

    const addProject = async (groupId: string, projectId: string) => {
        const group = groups.find(g => g.id === groupId);
        if (!group) return;
        const newProjectIds = [...group.projects.map(p => p.id), projectId];
        await updateGroup(groupId, { projectIds: newProjectIds });
        setShowAddProjectGroupId(null);
    };

    const removeProject = async (groupId: string, projectId: string) => {
        const group = groups.find(g => g.id === groupId);
        if (!group) return;
        const newProjectIds = group.projects.filter(p => p.id !== projectId).map(p => p.id);
        await updateGroup(groupId, { projectIds: newProjectIds });
    };

    const updateGroup = async (groupId: string, data: Record<string, unknown>) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/account-groups/${groupId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error);
            setGroups(groups.map(g => g.id === groupId ? result.group : g));
            showToast("success", "Accountgroep bijgewerkt");
            router.refresh();
        } catch (err: any) {
            showToast("error", err.message || "Fout bij bijwerken.");
        } finally {
            setLoading(false);
        }
    };

    const availableUsersForGroup = (group: AccountGroup) =>
        allUsers.filter(u => !group.members.some(m => m.user.id === u.id));

    const availableProjectsForGroup = (group: AccountGroup) =>
        allProjects.filter(p => !p.accountGroupId || p.accountGroupId === group.id)
            .filter(p => !group.projects.some(gp => gp.id === p.id));

    return (
        <div>
            {/* Header with Create button */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "24px" }}>
                <button
                    onClick={() => setShowCreateModal(true)}
                    style={{
                        display: "flex", alignItems: "center", gap: "8px",
                        padding: "10px 20px", background: "var(--color-brand)", color: "white",
                        border: "none", borderRadius: "8px", fontWeight: 600, cursor: "pointer",
                        fontSize: "0.9rem"
                    }}
                >
                    <Plus size={18} />
                    Nieuwe Accountgroep
                </button>
            </div>

            {/* Groups List */}
            {groups.length === 0 ? (
                <div style={{
                    padding: "48px", textAlign: "center",
                    border: "1px dashed var(--color-border)", borderRadius: "12px",
                    color: "var(--color-text-muted)"
                }}>
                    <p style={{ fontSize: "1.1rem", marginBottom: "8px" }}>Nog geen accountgroepen</p>
                    <p style={{ fontSize: "0.85rem" }}>Maak een groep aan om projecten en gebruikers te bundelen.</p>
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {groups.map(group => {
                        const isExpanded = expandedGroupId === group.id;
                        return (
                            <div
                                key={group.id}
                                style={{
                                    border: "1px solid var(--color-border)",
                                    borderRadius: "12px",
                                    background: "var(--color-surface-elevated)",
                                    overflow: "hidden"
                                }}
                            >
                                {/* Group Header */}
                                <div
                                    style={{
                                        display: "flex", alignItems: "center", justifyContent: "space-between",
                                        padding: "16px 20px", cursor: "pointer",
                                    }}
                                    onClick={() => setExpandedGroupId(isExpanded ? null : group.id)}
                                >
                                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                        {isExpanded ? <ChevronDown size={18} color="var(--color-text-muted)" /> : <ChevronRight size={18} color="var(--color-text-muted)" />}
                                        <div>
                                            <div style={{ fontSize: "1.05rem", fontWeight: 600, color: "var(--color-text-primary)" }}>{group.name}</div>
                                            <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", display: "flex", gap: "16px", marginTop: "2px" }}>
                                                <span><Users size={12} style={{ marginRight: "4px", verticalAlign: "middle" }} />{group.members.length} leden</span>
                                                <span><FolderOpen size={12} style={{ marginRight: "4px", verticalAlign: "middle" }} />{group.projects.length} projecten</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }} onClick={e => e.stopPropagation()}>
                                        <button
                                            onClick={() => deleteGroup(group.id)}
                                            style={{
                                                background: "transparent", border: "none", color: "var(--color-text-muted)",
                                                cursor: "pointer", padding: "6px", borderRadius: "6px"
                                            }}
                                            title="Verwijderen"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                {/* Expanded Content */}
                                {isExpanded && (
                                    <div style={{ borderTop: "1px solid var(--color-border)", padding: "20px" }}>
                                        {/* Members Section */}
                                        <div style={{ marginBottom: "24px" }}>
                                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                                                <h3 style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--color-text-primary)", margin: 0 }}>
                                                    <Users size={14} style={{ marginRight: "6px", verticalAlign: "middle" }} />
                                                    Leden
                                                </h3>
                                                <button
                                                    onClick={() => setShowAddMemberGroupId(showAddMemberGroupId === group.id ? null : group.id)}
                                                    style={{
                                                        display: "flex", alignItems: "center", gap: "4px",
                                                        padding: "4px 10px", background: "rgba(99,102,241,0.1)",
                                                        color: "var(--color-brand)", border: "none", borderRadius: "6px",
                                                        fontSize: "0.8rem", fontWeight: 600, cursor: "pointer"
                                                    }}
                                                >
                                                    <UserPlus size={14} /> Toevoegen
                                                </button>
                                            </div>

                                            {/* Add Member Dropdown */}
                                            {showAddMemberGroupId === group.id && (
                                                <div style={{
                                                    marginBottom: "12px", padding: "12px", background: "var(--color-surface)",
                                                    border: "1px solid var(--color-border)", borderRadius: "8px"
                                                }}>
                                                    {availableUsersForGroup(group).length === 0 ? (
                                                        <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem", margin: 0 }}>Alle gebruikers zijn al lid.</p>
                                                    ) : (
                                                        <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxHeight: "200px", overflowY: "auto" }}>
                                                            {availableUsersForGroup(group).map(user => (
                                                                <button
                                                                    key={user.id}
                                                                    onClick={() => addMember(group.id, user.id)}
                                                                    disabled={loading}
                                                                    style={{
                                                                        display: "flex", alignItems: "center", gap: "8px",
                                                                        padding: "8px 10px", background: "transparent", border: "none",
                                                                        borderRadius: "6px", cursor: "pointer", textAlign: "left",
                                                                        color: "var(--color-text-primary)", fontSize: "0.85rem", width: "100%"
                                                                    }}
                                                                    className="hover-row"
                                                                >
                                                                    <div style={{
                                                                        width: "28px", height: "28px", borderRadius: "14px",
                                                                        background: "rgba(99,102,241,0.1)", display: "flex",
                                                                        alignItems: "center", justifyContent: "center",
                                                                        fontSize: "0.75rem", fontWeight: 600, color: "var(--color-brand)"
                                                                    }}>
                                                                        {user.name.charAt(0).toUpperCase()}
                                                                    </div>
                                                                    <div>
                                                                        <div style={{ fontWeight: 500 }}>{user.name}</div>
                                                                        <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>{user.email}</div>
                                                                    </div>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Members List */}
                                            {group.members.length === 0 ? (
                                                <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem", fontStyle: "italic" }}>Nog geen leden toegevoegd.</p>
                                            ) : (
                                                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                                    {group.members.map(member => (
                                                        <div key={member.id} style={{
                                                            display: "flex", alignItems: "center", justifyContent: "space-between",
                                                            padding: "8px 12px", borderRadius: "8px",
                                                            border: "1px solid var(--color-border)", background: "var(--color-surface)"
                                                        }}>
                                                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                                                <div style={{
                                                                    width: "30px", height: "30px", borderRadius: "15px",
                                                                    background: "rgba(99,102,241,0.1)", display: "flex",
                                                                    alignItems: "center", justifyContent: "center",
                                                                    fontSize: "0.8rem", fontWeight: 600, color: "var(--color-brand)"
                                                                }}>
                                                                    {member.user.name.charAt(0).toUpperCase()}
                                                                </div>
                                                                <div>
                                                                    <div style={{ fontSize: "0.9rem", fontWeight: 500, color: "var(--color-text-primary)" }}>{member.user.name}</div>
                                                                    <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>{member.user.email}</div>
                                                                </div>
                                                            </div>
                                                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                                <span style={{
                                                                    fontSize: "0.7rem", padding: "2px 8px", borderRadius: "10px",
                                                                    background: member.role === "ADMIN" ? "rgba(239, 68, 68, 0.1)" : "rgba(99,102,241,0.1)",
                                                                    color: member.role === "ADMIN" ? "#ef4444" : "var(--color-brand)",
                                                                    fontWeight: 600
                                                                }}>
                                                                    {member.role}
                                                                </span>
                                                                <button
                                                                    onClick={() => removeMember(group.id, member.user.id)}
                                                                    disabled={loading}
                                                                    style={{
                                                                        background: "transparent", border: "none",
                                                                        color: "var(--color-text-muted)", cursor: "pointer",
                                                                        padding: "4px", borderRadius: "4px"
                                                                    }}
                                                                    title="Verwijderen"
                                                                >
                                                                    <X size={14} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Projects Section */}
                                        <div>
                                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                                                <h3 style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--color-text-primary)", margin: 0 }}>
                                                    <FolderOpen size={14} style={{ marginRight: "6px", verticalAlign: "middle" }} />
                                                    Projecten
                                                </h3>
                                                <button
                                                    onClick={() => setShowAddProjectGroupId(showAddProjectGroupId === group.id ? null : group.id)}
                                                    style={{
                                                        display: "flex", alignItems: "center", gap: "4px",
                                                        padding: "4px 10px", background: "rgba(99,102,241,0.1)",
                                                        color: "var(--color-brand)", border: "none", borderRadius: "6px",
                                                        fontSize: "0.8rem", fontWeight: 600, cursor: "pointer"
                                                    }}
                                                >
                                                    <Plus size={14} /> Toevoegen
                                                </button>
                                            </div>

                                            {/* Add Project Dropdown */}
                                            {showAddProjectGroupId === group.id && (
                                                <div style={{
                                                    marginBottom: "12px", padding: "12px", background: "var(--color-surface)",
                                                    border: "1px solid var(--color-border)", borderRadius: "8px"
                                                }}>
                                                    {availableProjectsForGroup(group).length === 0 ? (
                                                        <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem", margin: 0 }}>Geen beschikbare projecten.</p>
                                                    ) : (
                                                        <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxHeight: "200px", overflowY: "auto" }}>
                                                            {availableProjectsForGroup(group).map(project => (
                                                                <button
                                                                    key={project.id}
                                                                    onClick={() => addProject(group.id, project.id)}
                                                                    disabled={loading}
                                                                    style={{
                                                                        display: "flex", alignItems: "center", gap: "8px",
                                                                        padding: "8px 10px", background: "transparent", border: "none",
                                                                        borderRadius: "6px", cursor: "pointer", textAlign: "left",
                                                                        color: "var(--color-text-primary)", fontSize: "0.85rem", width: "100%"
                                                                    }}
                                                                    className="hover-row"
                                                                >
                                                                    <FolderOpen size={14} color="var(--color-text-muted)" />
                                                                    {project.name}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Projects List */}
                                            {group.projects.length === 0 ? (
                                                <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem", fontStyle: "italic" }}>Nog geen projecten gekoppeld.</p>
                                            ) : (
                                                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                                                    {group.projects.map(project => (
                                                        <div key={project.id} style={{
                                                            display: "flex", alignItems: "center", gap: "6px",
                                                            padding: "6px 12px", borderRadius: "8px",
                                                            border: "1px solid var(--color-border)", background: "var(--color-surface)",
                                                            fontSize: "0.85rem", color: "var(--color-text-primary)"
                                                        }}>
                                                            <FolderOpen size={12} color="var(--color-text-muted)" />
                                                            {project.name}
                                                            <button
                                                                onClick={() => removeProject(group.id, project.id)}
                                                                disabled={loading}
                                                                style={{
                                                                    background: "transparent", border: "none",
                                                                    color: "var(--color-text-muted)", cursor: "pointer",
                                                                    padding: "2px", borderRadius: "4px", marginLeft: "4px"
                                                                }}
                                                                title="Ontkoppelen"
                                                            >
                                                                <X size={12} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create Modal */}
            {showCreateModal && (
                <div style={{
                    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                    background: "rgba(0, 0, 0, 0.5)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    zIndex: 50, backdropFilter: "blur(4px)"
                }}>
                    <div style={{
                        background: "var(--color-surface)",
                        border: "1px solid var(--color-border)",
                        borderRadius: "12px",
                        width: "100%", maxWidth: "420px",
                        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)"
                    }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid var(--color-border)" }}>
                            <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600, color: "var(--color-text-primary)" }}>Nieuwe Accountgroep</h3>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                style={{ background: "transparent", border: "none", color: "var(--color-text-muted)", cursor: "pointer" }}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={createGroup} style={{ padding: "24px" }}>
                            <div style={{ marginBottom: "20px" }}>
                                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 500, color: "var(--color-text-primary)", marginBottom: "8px" }}>
                                    Naam
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={newGroupName}
                                    onChange={(e) => setNewGroupName(e.target.value)}
                                    placeholder="bijv. Bureau MediaMax"
                                    style={{
                                        width: "100%", padding: "10px 12px", borderRadius: "8px",
                                        border: "1px solid var(--color-border)", background: "var(--color-background)",
                                        color: "var(--color-text-primary)", fontSize: "0.95rem",
                                        outline: "none", boxSizing: "border-box"
                                    }}
                                />
                            </div>
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                                <button
                                    type="button" onClick={() => setShowCreateModal(false)}
                                    style={{
                                        padding: "8px 16px", borderRadius: "8px", border: "1px solid var(--color-border)",
                                        background: "transparent", color: "var(--color-text-primary)",
                                        fontWeight: 500, cursor: "pointer"
                                    }}
                                >
                                    Annuleren
                                </button>
                                <button
                                    type="submit" disabled={loading}
                                    style={{
                                        padding: "8px 16px", borderRadius: "8px", border: "none",
                                        background: "var(--color-brand)", color: "white",
                                        fontWeight: 500, cursor: loading ? "not-allowed" : "pointer",
                                        opacity: loading ? 0.7 : 1
                                    }}
                                >
                                    {loading ? "Bezig..." : "Aanmaken"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style jsx>{`
                .hover-row:hover {
                    background: var(--color-surface-hover) !important;
                }
            `}</style>
        </div>
    );
}
