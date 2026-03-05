"use client";

import { useState } from "react";
import { User, Mail, Shield, Calendar, Edit2, Trash2, X, Check, AlertTriangle, UserPlus, Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";

interface Client {
    id: string;
    name: string;
}

interface UserData {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: Date | string;
    clients: Client[];
}

interface Props {
    initialUsers: UserData[];
    roles: { name: string }[];
}

export default function UserManagementTable({ initialUsers, roles }: Props) {
    const [users, setUsers] = useState<UserData[]>(initialUsers);
    const [editingUser, setEditingUser] = useState<UserData | null>(null);
    const [deletingUser, setDeletingUser] = useState<UserData | null>(null);
    const [creatingUser, setCreatingUser] = useState(false);
    const [newUser, setNewUser] = useState({ name: "", email: "", password: "", role: "USER" });
    const [showPassword, setShowPassword] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;

        setIsSaving(true);
        setError(null);

        try {
            const res = await fetch(`/api/admin/users/${editingUser.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: editingUser.name,
                    email: editingUser.email,
                    role: editingUser.role,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Fout bij bijwerken");
            }

            const updatedUser = await res.json();
            setUsers(users.map(u => u.id === updatedUser.id ? { ...u, ...updatedUser } : u));
            setEditingUser(null);
            router.refresh();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deletingUser) return;

        setIsSaving(true);
        setError(null);

        try {
            const res = await fetch(`/api/admin/users/${deletingUser.id}`, {
                method: "DELETE",
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Fout bij verwijderen");
            }

            setUsers(users.filter(u => u.id !== deletingUser.id));
            setDeletingUser(null);
            router.refresh();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setError(null);

        try {
            const res = await fetch("/api/admin/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newUser),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Fout bij aanmaken");
            }

            const created = await res.json();
            setUsers([created, ...users]);
            setCreatingUser(false);
            setNewUser({ name: "", email: "", password: "", role: "USER" });
            setShowPassword(false);
            router.refresh();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div style={{ position: "relative" }}>
            {/* Add User Button */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "16px" }}>
                <button
                    onClick={() => { setCreatingUser(true); setError(null); }}
                    style={{
                        display: "inline-flex", alignItems: "center", gap: "8px",
                        padding: "10px 20px", borderRadius: "10px",
                        background: "var(--color-brand)", color: "#fff",
                        border: "none", fontSize: "0.875rem", fontWeight: 600,
                        cursor: "pointer", transition: "all 0.2s"
                    }}
                >
                    <UserPlus size={16} /> Gebruiker Toevoegen
                </button>
            </div>

            <div style={{
                background: "var(--color-surface-elevated)",
                border: "1px solid var(--color-border)",
                borderRadius: "16px",
                overflow: "hidden"
            }}>
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                        <thead>
                            <tr style={{ background: "rgba(255, 255, 255, 0.02)", borderBottom: "1px solid var(--color-border)" }}>
                                <th style={thStyle}>Gebruiker</th>
                                <th style={thStyle}>E-mail</th>
                                <th style={thStyle}>Rol</th>
                                <th style={thStyle}>Accounts</th>
                                <th style={thStyle}>Acties</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => (
                                <tr key={user.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                                    <td style={tdStyle}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                            <div style={{
                                                width: "32px",
                                                height: "32px",
                                                borderRadius: "50%",
                                                background: "rgba(99, 102, 241, 0.1)",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                color: "#6366f1",
                                                fontSize: "0.875rem",
                                                fontWeight: 600
                                            }}>
                                                {user.name ? user.name.charAt(0).toUpperCase() : "?"}
                                            </div>
                                            <span style={{ fontWeight: 500, color: "var(--color-text-primary)" }}>{user.name}</span>
                                        </div>
                                    </td>
                                    <td style={tdStyle}>
                                        <div style={{ color: "var(--color-text-secondary)" }}>{user.email}</div>
                                    </td>
                                    <td style={tdStyle}>
                                        <div style={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: "6px",
                                            padding: "4px 8px",
                                            borderRadius: "6px",
                                            background: "rgba(99, 102, 241, 0.1)",
                                            color: "#6366f1",
                                            fontSize: "0.75rem",
                                            fontWeight: 600
                                        }}>
                                            <Shield size={12} />
                                            {user.role}
                                        </div>
                                    </td>
                                    <td style={tdStyle}>
                                        <div style={{ color: "var(--color-text-muted)", fontSize: "0.8125rem" }}>
                                            {user.clients.length} accounts
                                        </div>
                                    </td>
                                    <td style={tdStyle}>
                                        <div style={{ display: "flex", gap: "8px" }}>
                                            <button
                                                onClick={() => setEditingUser(user)}
                                                style={actionButtonStyle}
                                                title="Bewerken"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => setDeletingUser(user)}
                                                style={{ ...actionButtonStyle, color: "#f87171" }}
                                                title="Verwijderen"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit Modal */}
            {editingUser && (
                <div style={overlayStyle}>
                    <div style={modalStyle}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                            <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--color-text-primary)" }}>Gebruiker Bewerken</h3>
                            <button onClick={() => setEditingUser(null)} style={closeButtonStyle}><X size={20} /></button>
                        </div>

                        <form onSubmit={handleUpdate} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            <div style={inputGroupStyle}>
                                <label style={labelStyle}>Naam</label>
                                <input
                                    type="text"
                                    value={editingUser.name}
                                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                                    style={inputStyle}
                                    required
                                />
                            </div>
                            <div style={inputGroupStyle}>
                                <label style={labelStyle}>E-mail</label>
                                <input
                                    type="email"
                                    value={editingUser.email}
                                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                                    style={inputStyle}
                                    required
                                />
                            </div>
                            <div style={inputGroupStyle}>
                                <label style={labelStyle}>Rol</label>
                                <select
                                    value={editingUser.role}
                                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                                    style={inputStyle}
                                >
                                    {roles.map(role => (
                                        <option key={role.name} value={role.name}>{role.name}</option>
                                    ))}
                                </select>
                            </div>

                            {error && <div style={{ color: "#f87171", fontSize: "0.875rem", marginTop: "8px" }}>{error}</div>}

                            <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    style={primaryButtonStyle}
                                >
                                    {isSaving ? "Opslaan..." : "Wijzigingen Opslaan"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setEditingUser(null)}
                                    style={secondaryButtonStyle}
                                >
                                    Annuleren
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            {deletingUser && (
                <div style={overlayStyle}>
                    <div style={{ ...modalStyle, maxWidth: "400px" }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "16px" }}>
                            <div style={{ padding: "16px", background: "rgba(248, 113, 113, 0.1)", borderRadius: "50%", color: "#f87171" }}>
                                <AlertTriangle size={32} />
                            </div>
                            <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--color-text-primary)" }}>Gebruiker Verwijderen?</h3>
                            <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}>
                                Weet je zeker dat je <strong>{deletingUser.name}</strong> wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.
                            </p>

                            {error && <div style={{ color: "#f87171", fontSize: "0.875rem" }}>{error}</div>}

                            <div style={{ display: "flex", gap: "12px", width: "100%", marginTop: "8px" }}>
                                <button
                                    onClick={handleDelete}
                                    disabled={isSaving}
                                    style={{ ...primaryButtonStyle, background: "#ef4444", flex: 1 }}
                                >
                                    {isSaving ? "Verwijderen..." : "Ja, Verwijderen"}
                                </button>
                                <button
                                    onClick={() => setDeletingUser(null)}
                                    style={{ ...secondaryButtonStyle, flex: 1 }}
                                >
                                    Nee, Behoud
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Create User Modal */}
            {creatingUser && (
                <div style={overlayStyle}>
                    <div style={modalStyle}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                            <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--color-text-primary)" }}>Gebruiker Toevoegen</h3>
                            <button onClick={() => { setCreatingUser(false); setError(null); }} style={closeButtonStyle}><X size={20} /></button>
                        </div>

                        <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            <div style={inputGroupStyle}>
                                <label style={labelStyle}>Naam</label>
                                <input
                                    type="text"
                                    value={newUser.name}
                                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                                    style={inputStyle}
                                    placeholder="Volledige naam"
                                    required
                                />
                            </div>
                            <div style={inputGroupStyle}>
                                <label style={labelStyle}>E-mail</label>
                                <input
                                    type="email"
                                    value={newUser.email}
                                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                    style={inputStyle}
                                    placeholder="naam@voorbeeld.nl"
                                    required
                                />
                            </div>
                            <div style={inputGroupStyle}>
                                <label style={labelStyle}>Wachtwoord</label>
                                <div style={{ position: "relative" }}>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={newUser.password}
                                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                        style={{ ...inputStyle, paddingRight: "44px" }}
                                        placeholder="Minimaal 8 tekens"
                                        minLength={8}
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        style={{
                                            position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)",
                                            background: "none", border: "none", color: "var(--color-text-muted)",
                                            cursor: "pointer", padding: "4px"
                                        }}
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>
                            <div style={inputGroupStyle}>
                                <label style={labelStyle}>Rol</label>
                                <select
                                    value={newUser.role}
                                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                                    style={inputStyle}
                                >
                                    {roles.map(role => (
                                        <option key={role.name} value={role.name}>{role.name}</option>
                                    ))}
                                </select>
                            </div>

                            {error && <div style={{ color: "#f87171", fontSize: "0.875rem", marginTop: "8px" }}>{error}</div>}

                            <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    style={primaryButtonStyle}
                                >
                                    {isSaving ? "Aanmaken..." : "Gebruiker Aanmaken"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setCreatingUser(false); setError(null); }}
                                    style={secondaryButtonStyle}
                                >
                                    Annuleren
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

const thStyle: React.CSSProperties = {
    padding: "16px 24px",
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "var(--color-text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.05em"
};

const tdStyle: React.CSSProperties = {
    padding: "16px 24px",
    fontSize: "0.875rem",
    color: "var(--color-text-primary)"
};

const actionButtonStyle: React.CSSProperties = {
    padding: "8px",
    borderRadius: "8px",
    background: "rgba(255, 255, 255, 0.05)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    color: "var(--color-text-secondary)",
    cursor: "pointer",
    transition: "all 0.2s ease"
};

const overlayStyle: React.CSSProperties = {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0, 0, 0, 0.7)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "20px"
};

const modalStyle: React.CSSProperties = {
    background: "var(--color-surface-elevated)",
    border: "1px solid var(--color-border)",
    borderRadius: "20px",
    width: "100%",
    maxWidth: "500px",
    padding: "32px",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
};

const closeButtonStyle: React.CSSProperties = {
    background: "none",
    border: "none",
    color: "var(--color-text-muted)",
    cursor: "pointer",
    padding: "4px"
};

const inputGroupStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "8px"
};

const labelStyle: React.CSSProperties = {
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "var(--color-text-muted)",
    textTransform: "uppercase"
};

const inputStyle: React.CSSProperties = {
    background: "rgba(0, 0, 0, 0.2)",
    border: "1px solid var(--color-border)",
    borderRadius: "10px",
    padding: "12px",
    color: "var(--color-text-primary)",
    fontSize: "0.875rem"
};

const primaryButtonStyle: React.CSSProperties = {
    background: "var(--color-brand)",
    color: "white",
    border: "none",
    borderRadius: "10px",
    padding: "12px 20px",
    fontSize: "0.875rem",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s ease"
};

const secondaryButtonStyle: React.CSSProperties = {
    background: "rgba(255, 255, 255, 0.05)",
    color: "var(--color-text-primary)",
    border: "1px solid var(--color-border)",
    borderRadius: "10px",
    padding: "12px 20px",
    fontSize: "0.875rem",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s ease"
};
