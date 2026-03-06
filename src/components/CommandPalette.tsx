"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    Search,
    Home,
    Settings,
    FolderOpen,
    Activity,
    Shield,
    Users,
    BarChart3,
    Bell,
    Command,
} from "lucide-react";

interface CommandItem {
    id: string;
    label: string;
    description?: string;
    icon: React.ReactNode;
    action: () => void;
    keywords?: string[];
}

export default function CommandPalette() {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    // Fetch projects for navigation
    useEffect(() => {
        fetch("/api/projects")
            .then(res => res.json())
            .then(data => setProjects(Array.isArray(data) ? data : []))
            .catch(() => { });
    }, []);

    // Keyboard shortcut to open
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                setIsOpen(prev => !prev);
                setQuery("");
                setSelectedIndex(0);
            }
            if (e.key === "Escape") {
                setIsOpen(false);
            }
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, []);

    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    const navigate = useCallback((path: string) => {
        router.push(path);
        setIsOpen(false);
    }, [router]);

    // Build commands list
    const commands: CommandItem[] = [
        { id: "home", label: "Dashboard", description: "Ga naar het hoofddashboard", icon: <Home size={18} />, action: () => navigate("/"), keywords: ["home", "start", "overzicht"] },
        { id: "settings", label: "Instellingen", description: "Account & profiel instellingen", icon: <Settings size={18} />, action: () => navigate("/settings"), keywords: ["settings", "profiel", "account"] },
        { id: "security", label: "Beveiliging", description: "2FA en security instellingen", icon: <Shield size={18} />, action: () => navigate("/settings"), keywords: ["security", "2fa", "wachtwoord"] },
        { id: "admin", label: "Gebruikers beheren", description: "Admin gebruikersoverzicht", icon: <Users size={18} />, action: () => navigate("/admin/users"), keywords: ["admin", "users", "gebruikers", "beheer"] },
        { id: "incidents", label: "Incidenten", description: "Alle incidenten overzicht", icon: <Activity size={18} />, action: () => navigate("/incidents"), keywords: ["incidents", "problemen", "alerts"] },
        ...projects.map(p => ({
            id: `project-${p.id}`,
            label: p.name,
            description: "Open project",
            icon: <FolderOpen size={18} />,
            action: () => navigate(`/projects/${p.id}`),
            keywords: ["project", p.name.toLowerCase()],
        })),
        ...projects.map(p => ({
            id: `project-report-${p.id}`,
            label: `${p.name} — Rapportages`,
            description: "Bekijk rapportages",
            icon: <BarChart3 size={18} />,
            action: () => navigate(`/projects/${p.id}/reports`),
            keywords: ["rapport", "report", p.name.toLowerCase()],
        })),
        ...projects.map(p => ({
            id: `project-monitoring-${p.id}`,
            label: `${p.name} — Monitoring`,
            description: "Tracking & uptime",
            icon: <Activity size={18} />,
            action: () => navigate(`/projects/${p.id}/monitoring/tracking`),
            keywords: ["monitoring", "tracking", "uptime", p.name.toLowerCase()],
        })),
    ];

    // Filter commands
    const filtered = query.trim()
        ? commands.filter(cmd => {
            const q = query.toLowerCase();
            return cmd.label.toLowerCase().includes(q) ||
                cmd.description?.toLowerCase().includes(q) ||
                cmd.keywords?.some(k => k.includes(q));
        })
        : commands.slice(0, 8); // Show top 8 by default

    // Handle keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setSelectedIndex(prev => Math.min(prev + 1, filtered.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setSelectedIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === "Enter" && filtered[selectedIndex]) {
            e.preventDefault();
            filtered[selectedIndex].action();
        }
    };

    // Reset selection when query changes
    useEffect(() => {
        setSelectedIndex(0);
    }, [query]);

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={() => setIsOpen(false)}
                style={{
                    position: "fixed",
                    inset: 0,
                    background: "rgba(0, 0, 0, 0.5)",
                    backdropFilter: "blur(4px)",
                    zIndex: 9998,
                    animation: "fadeIn 0.15s ease",
                }}
            />

            {/* Palette */}
            <div style={{
                position: "fixed",
                top: "20%",
                left: "50%",
                transform: "translateX(-50%)",
                width: "calc(100% - 32px)",
                maxWidth: "560px",
                background: "var(--color-surface-elevated)",
                border: "1px solid var(--color-border)",
                borderRadius: "16px",
                boxShadow: "0 24px 80px -20px rgba(0, 0, 0, 0.5)",
                zIndex: 9999,
                overflow: "hidden",
                animation: "slideUp 0.2s ease",
            }}>
                {/* Search Input */}
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "16px 20px",
                    borderBottom: "1px solid var(--color-border)",
                }}>
                    <Search size={20} color="var(--color-text-muted)" />
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Zoek pagina's, projecten, acties..."
                        style={{
                            flex: 1,
                            background: "none",
                            border: "none",
                            outline: "none",
                            color: "var(--color-text-primary)",
                            fontSize: "1rem",
                        }}
                    />
                    <kbd style={{
                        padding: "2px 6px",
                        borderRadius: "4px",
                        background: "var(--color-surface)",
                        border: "1px solid var(--color-border)",
                        fontSize: "0.7rem",
                        color: "var(--color-text-muted)",
                        fontFamily: "monospace",
                    }}>
                        ESC
                    </kbd>
                </div>

                {/* Results */}
                <div style={{ maxHeight: "340px", overflowY: "auto", padding: "8px" }}>
                    {filtered.length === 0 ? (
                        <div style={{
                            padding: "32px", textAlign: "center",
                            color: "var(--color-text-muted)", fontSize: "0.85rem",
                        }}>
                            Geen resultaten voor &quot;{query}&quot;
                        </div>
                    ) : (
                        filtered.map((cmd, i) => (
                            <button
                                key={cmd.id}
                                onClick={cmd.action}
                                onMouseEnter={() => setSelectedIndex(i)}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "12px",
                                    width: "100%",
                                    padding: "10px 12px",
                                    borderRadius: "8px",
                                    background: i === selectedIndex ? "var(--color-surface-hover)" : "transparent",
                                    border: "none",
                                    cursor: "pointer",
                                    textAlign: "left",
                                    transition: "background 0.1s",
                                }}
                            >
                                <div style={{
                                    width: "36px", height: "36px", borderRadius: "8px",
                                    background: "var(--color-surface)",
                                    border: "1px solid var(--color-border)",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    color: i === selectedIndex ? "var(--color-brand)" : "var(--color-text-muted)",
                                    flexShrink: 0,
                                }}>
                                    {cmd.icon}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                        fontSize: "0.85rem", fontWeight: 600,
                                        color: "var(--color-text-primary)",
                                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                    }}>
                                        {cmd.label}
                                    </div>
                                    {cmd.description && (
                                        <div style={{
                                            fontSize: "0.75rem", color: "var(--color-text-muted)",
                                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                        }}>
                                            {cmd.description}
                                        </div>
                                    )}
                                </div>
                                {i === selectedIndex && (
                                    <kbd style={{
                                        padding: "2px 6px", borderRadius: "4px",
                                        background: "var(--color-surface)",
                                        border: "1px solid var(--color-border)",
                                        fontSize: "0.65rem", color: "var(--color-text-muted)",
                                        fontFamily: "monospace",
                                    }}>
                                        ↵
                                    </kbd>
                                )}
                            </button>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                    padding: "10px 20px",
                    borderTop: "1px solid var(--color-border)",
                    fontSize: "0.7rem",
                    color: "var(--color-text-muted)",
                }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <kbd style={{ padding: "1px 4px", borderRadius: "3px", background: "var(--color-surface)", border: "1px solid var(--color-border)", fontFamily: "monospace" }}>↑↓</kbd>
                        navigeer
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <kbd style={{ padding: "1px 4px", borderRadius: "3px", background: "var(--color-surface)", border: "1px solid var(--color-border)", fontFamily: "monospace" }}>↵</kbd>
                        open
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <kbd style={{ padding: "1px 4px", borderRadius: "3px", background: "var(--color-surface)", border: "1px solid var(--color-border)", fontFamily: "monospace" }}>esc</kbd>
                        sluiten
                    </span>
                </div>
            </div>

            <style jsx global>{`
                @keyframes slideUp {
                    from { opacity: 0; transform: translateX(-50%) translateY(10px); }
                    to { opacity: 1; transform: translateX(-50%) translateY(0); }
                }
            `}</style>
        </>
    );
}
