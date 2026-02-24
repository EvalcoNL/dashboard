"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ChevronDown, Search } from "lucide-react";

interface Client {
    id: string;
    name: string;
    dataSources?: { externalId: string }[];
}

interface ProjectSwitcherProps {
    t: (namespace: "common" | "navigation", key: string) => string;
}

export default function ProjectSwitcher({ t }: ProjectSwitcherProps) {
    const [clients, setClients] = useState<Client[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const ref = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        fetch("/api/projects")
            .then((res) => res.json())
            .then((data) => setClients(data))
            .catch((err) => console.error("Failed to fetch clients:", err));
    }, []);

    const selectedClient = useMemo(() => {
        const match = pathname.match(/\/dashboard\/projects\/([^\/]+)/);
        if (match && clients.length > 0) {
            return clients.find(c => c.id === match[1]) || null;
        }
        return null;
    }, [pathname, clients]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        function handleEscape(event: KeyboardEvent) {
            if (event.key === "Escape") setIsOpen(false);
        }
        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleEscape);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleEscape);
        };
    }, []);

    const handleClientChange = (client: Client | null) => {
        setIsOpen(false);
        setSearchQuery("");
        if (!client) {
            router.push("/dashboard/projects");
        } else {
            router.push(`/dashboard/projects/${client.id}`);
        }
    };

    const filteredClients = clients.filter(client => {
        const query = searchQuery.toLowerCase();
        const nameMatch = client.name.toLowerCase().includes(query);
        const externalIdMatch = client.dataSources?.[0]?.externalId?.toLowerCase().includes(query);
        return nameMatch || externalIdMatch;
    });

    return (
        <div ref={ref} style={{ position: "relative", display: "flex", alignItems: "center", gap: "8px" }}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "6px 8px",
                    borderRadius: "6px",
                    transition: "background 0.2s"
                }}
                className="hover-bg"
            >
                <span style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)", fontWeight: 500 }}>
                    {t("common", "account")}
                </span>
                <span style={{
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    color: "var(--color-text-primary)"
                }}>
                    {selectedClient ? selectedClient.name : t("common", "allClients")}
                </span>
                <ChevronDown size={14} color="var(--color-text-muted)" />
            </button>

            {isOpen && (
                <div
                    style={{
                        position: "absolute",
                        top: "100%",
                        left: "-10px",
                        marginTop: "8px",
                        width: "450px",
                        background: "var(--color-surface-elevated)",
                        border: "1px solid var(--color-border)",
                        borderRadius: "12px",
                        boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
                        zIndex: 110,
                        overflow: "hidden"
                    }}
                >
                    <div style={{ padding: "12px", borderBottom: "1px solid var(--color-border)" }}>
                        <div style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            padding: "8px 12px",
                            background: "var(--color-surface)",
                            borderRadius: "8px",
                            border: "1px solid var(--color-border)"
                        }}>
                            <input
                                autoFocus
                                placeholder={t("common", "search")}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{
                                    background: "transparent",
                                    border: "none",
                                    color: "var(--color-text-primary)",
                                    fontSize: "0.875rem",
                                    flex: 1,
                                    outline: "none"
                                }}
                            />
                            <Search size={18} color="var(--color-text-muted)" />
                        </div>
                    </div>

                    <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                        <div style={{ padding: "12px 16px 4px", fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase" }}>
                            {t("common", "recent")}
                        </div>

                        {filteredClients.length > 0 ? (
                            filteredClients.map((client) => (
                                <button
                                    key={client.id}
                                    onClick={() => handleClientChange(client)}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        padding: "12px 16px",
                                        width: "100%",
                                        background: "none",
                                        border: "none",
                                        cursor: "pointer",
                                        textAlign: "left",
                                        gap: "12px",
                                        transition: "background 0.2s"
                                    }}
                                    className="hover-bg-int"
                                >
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--color-text-primary)" }}>
                                            {client.name}
                                        </div>
                                    </div>
                                </button>
                            ))
                        ) : (
                            <div style={{ padding: "24px", textAlign: "center", color: "var(--color-text-muted)", fontSize: "0.875rem" }}>
                                {t("common", "noAccountsFound")}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
