"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import {
    LayoutDashboard,
    Users,
    Database,
    FileText,
    Settings,
    ChevronRight,
    ArrowLeft,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface SubItem {
    href: string;
    label: string;
}

interface NavItem {
    href?: string;
    label: string;
    icon: React.ElementType;
    submenu?: SubItem[];
}

export default function Sidebar() {
    const pathname = usePathname();
    const { t } = useLanguage();
    // Instead of a string, we can track the active submenu's items and title
    const [openSubmenu, setOpenSubmenu] = useState<{ title: string, items: SubItem[] } | null>(null);

    // Extract client ID from URL
    const clientMatch = pathname.match(/\/dashboard\/clients\/([^\/]+)/);
    const clientId = clientMatch ? clientMatch[1] : null;

    const isActive = (href: string) => {
        if (href === "/dashboard" && !clientId) return pathname === "/dashboard";
        return pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
    };

    const adminNavItems: NavItem[] = [
        { href: "/dashboard", label: t("navigation", "home"), icon: LayoutDashboard },
        { href: "/dashboard/clients", label: t("navigation", "accounts"), icon: Users },
    ];

    const clientNavItems: NavItem[] = [
        { href: `/dashboard/clients/${clientId}`, label: t("navigation", "home"), icon: LayoutDashboard },
        {
            label: t("navigation", "data"),
            icon: Database,
            submenu: [
                { href: `/dashboard/clients/${clientId}/data/sources`, label: t("navigation", "dataSources") }
            ]
        },
        { href: `/dashboard/clients/${clientId}/report`, label: t("navigation", "report"), icon: FileText },
        { href: `/dashboard/clients/${clientId}/settings`, label: t("navigation", "settings"), icon: Settings },
    ];

    const currentNavItems: NavItem[] = clientId ? clientNavItems : adminNavItems;

    return (
        <div
            style={{ display: "flex", height: "calc(100vh - 60px)", position: "sticky", left: 0, top: "60px", zIndex: 90 }}
        >
            {/* Primary Sidebar */}
            <aside
                style={{
                    height: "100%",
                    width: "64px",
                    background: "var(--color-surface-elevated)",
                    borderRight: "1px solid var(--color-border)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    padding: "16px 0",
                }}
            >
                <nav style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%", alignItems: "center" }}>
                    {currentNavItems.map((item, idx) => {
                        const Icon = item.icon;
                        const active = item.href ? isActive(item.href) : (item.submenu?.some(sub => isActive(sub.href)));

                        return (
                            <div
                                key={idx}
                                style={{ position: "relative" }}
                            >
                                {item.href ? (
                                    <Link
                                        href={item.href}
                                        title={item.label}
                                        onClick={() => setOpenSubmenu(null)}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            width: "42px",
                                            height: "42px",
                                            borderRadius: "10px",
                                            color: active ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                                            background: active ? "rgba(99, 102, 241, 0.15)" : "transparent",
                                            transition: "all 0.2s ease",
                                            position: "relative"
                                        }}
                                        className="nav-link"
                                    >
                                        {active && <div className="active-indicator" />}
                                        <Icon size={20} />
                                    </Link>
                                ) : (
                                    <button
                                        onClick={() => {
                                            if (openSubmenu?.title === item.label) {
                                                setOpenSubmenu(null);
                                            } else if (item.submenu) {
                                                setOpenSubmenu({ title: item.label, items: item.submenu });
                                            }
                                        }}
                                        title={item.label}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            width: "42px",
                                            height: "42px",
                                            borderRadius: "10px",
                                            color: active || openSubmenu?.title === item.label ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                                            background: active || openSubmenu?.title === item.label ? "rgba(99, 102, 241, 0.15)" : "transparent",
                                            cursor: "pointer",
                                            position: "relative",
                                            border: "none"
                                        }}
                                        className="nav-link"
                                    >
                                        {active && <div className="active-indicator" />}
                                        <Icon size={20} />
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </nav>
            </aside>

            {/* Secondary Submenu Sidebar */}
            {openSubmenu && (
                <aside
                    style={{
                        height: "100%",
                        width: "240px",
                        background: "var(--color-surface-elevated)",
                        borderRight: "1px solid var(--color-border)",
                        padding: "24px 16px",
                        animation: "slideIn 0.2s ease-out",
                        display: "flex",
                        flexDirection: "column",
                        gap: "16px",
                        position: "relative"
                    }}
                >
                    <div style={{
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        color: "var(--color-text-muted)",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        paddingLeft: "8px"
                    }}>
                        {openSubmenu.title}
                    </div>
                    <nav style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
                        {openSubmenu.items.map((sub, sIdx) => (
                            <Link
                                key={sIdx}
                                href={sub.href}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    padding: "10px 12px",
                                    borderRadius: "8px",
                                    color: isActive(sub.href) ? "var(--color-brand)" : "var(--color-text-primary)",
                                    background: isActive(sub.href) ? "rgba(99, 102, 241, 0.08)" : "transparent",
                                    textDecoration: "none",
                                    fontSize: "0.875rem",
                                    fontWeight: 500,
                                    transition: "all 0.2s ease"
                                }}
                                className="sub-link"
                            >
                                {sub.label}
                                {isActive(sub.href) && <ChevronRight size={14} />}
                            </Link>
                        ))}
                    </nav>

                    {/* Close Link */}
                    <button
                        onClick={() => setOpenSubmenu(null)}
                        style={{
                            alignSelf: "flex-end",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "8px",
                            borderRadius: "8px",
                            color: "var(--color-text-muted)",
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            fontSize: "0.85rem",
                            transition: "all 0.2s ease"
                        }}
                        className="close-button"
                    >
                        <ArrowLeft size={16} />
                    </button>
                </aside>
            )}

            <style jsx>{`
                .nav-link:hover {
                    background: var(--color-surface-hover);
                    color: var(--color-text-primary);
                }
                .active-indicator {
                    position: absolute;
                    left: -11px;
                    width: 3px;
                    height: 20px;
                    background: var(--color-brand);
                    borderRadius: 0 4px 4px 0;
                }
                .sub-link:hover {
                    background: var(--color-surface-hover);
                    color: var(--color-brand);
                }
                .close-button:hover {
                    color: var(--color-text-primary);
                    background: var(--color-surface-hover);
                }
                @keyframes slideIn {
                    from { transform: translateX(-20px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
}
