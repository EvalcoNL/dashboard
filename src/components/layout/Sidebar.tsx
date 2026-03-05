"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";
import {
    LayoutDashboard,
    Users,
    Database,
    FileText,
    Settings,
    ChevronRight,
    ArrowLeft,
    Activity,
    AlertTriangle,
    TrendingUp,
    ShieldCheck,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useSession } from "next-auth/react";
import { useMobileSidebar } from "./MobileSidebarContext";

interface SubItem {
    href: string;
    label: string;
    sectionTitle?: string;
}

interface NavItem {
    href?: string;
    label: string;
    icon: React.ElementType;
    submenu?: SubItem[];
}

export default function Sidebar() {
    const { data: session } = useSession();
    const pathname = usePathname();
    const { t } = useLanguage();
    // Track only the label of the active menu to allow dynamic SubItem generation (avoids stale/cached client IDs)
    const [openMenuLabel, setOpenMenuLabel] = useState<string | null>(null);
    const { isOpen: mobileSidebarOpen, close: closeMobileSidebar } = useMobileSidebar();

    // Auto-close mobile sidebar on route change
    useEffect(() => {
        closeMobileSidebar();
    }, [pathname]);

    // Filter admin nav items based on super admin status
    const isSuperAdmin = session?.user?.email === "admin@evalco.nl";

    // Extract project ID from URL
    const clientMatch = pathname.match(/\/dashboard\/projects\/([^\/]+)/);
    const clientId = clientMatch ? clientMatch[1] : null;

    const isActive = (href: string, exactOnly?: boolean) => {
        if (href === "/dashboard") return pathname === "/dashboard";
        // Client home (e.g. /dashboard/projects/123) should only match exactly
        if (clientId && href === `/dashboard/projects/${clientId}`) return pathname === href;
        if (exactOnly) return pathname === href;
        return pathname === href || pathname.startsWith(href + "/");
    };

    const adminNavItems: NavItem[] = [
        { href: "/dashboard", label: t("navigation", "home"), icon: LayoutDashboard },
        { href: "/dashboard/projects", label: t("navigation", "accounts"), icon: Users },
        { href: "/dashboard/incidents", label: t("navigation", "incidents"), icon: AlertTriangle },
    ];

    if (isSuperAdmin) {
        adminNavItems.push({
            href: "/dashboard/admin/users",
            label: "Gebruikersoverzicht",
            icon: ShieldCheck
        });
    }

    // Starred dashboards
    const [starredDashboards, setStarredDashboards] = useState<{ id: string; name: string }[]>([]);
    useEffect(() => {
        if (!clientId) return;
        fetch(`/api/dashboards?clientId=${clientId}`)
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    setStarredDashboards(
                        (data.dashboards || [])
                            .filter((d: { starred?: boolean }) => d.starred)
                            .map((d: { id: string; name: string }) => ({ id: d.id, name: d.name }))
                    );
                }
            })
            .catch(() => { });
    }, [clientId, pathname]); // Refetch on route change to catch star toggles

    const clientNavItems: NavItem[] = [
        { href: `/dashboard/projects/${clientId}`, label: "Overzicht", icon: LayoutDashboard },
        {
            label: "Reports",
            icon: TrendingUp,
            submenu: [
                { href: `/dashboard/projects/${clientId}/reports/dashboards`, label: "Dashboards" },
                ...starredDashboards.map(d => ({
                    href: `/dashboard/projects/${clientId}/reports/dashboards/${d.id}`,
                    label: d.name,
                })),
                { sectionTitle: "AI", href: `/dashboard/projects/${clientId}/reports/ai`, label: "AI Reports" },
            ]
        },
        {
            label: t("navigation", "monitoring"),
            icon: Activity,
            submenu: [
                { href: `/dashboard/projects/${clientId}/monitoring/web`, label: t("navigation", "webMonitoring") },
                { href: `/dashboard/projects/${clientId}/monitoring/incidents`, label: t("navigation", "incidents") },
                { href: `/dashboard/projects/${clientId}/monitoring/tracking`, label: t("navigation", "dataTrackingMonitoring"), sectionTitle: t("navigation", "dataTrackingMonitoringTitle") }
            ]
        },
        {
            label: t("navigation", "data"),
            icon: Database,
            submenu: [
                { sectionTitle: "Connect", href: `/dashboard/projects/${clientId}/data/sources`, label: t("navigation", "dataSources") },
                { href: `/dashboard/projects/${clientId}/data/access`, label: t("navigation", "access") },
                { sectionTitle: "Analyze", href: `/dashboard/projects/${clientId}/data/explorer`, label: "Data Explorer" },
                { sectionTitle: "Organize", href: `/dashboard/projects/${clientId}/data/dimensions`, label: "Dimensies" },
                { href: `/dashboard/projects/${clientId}/data/metrics`, label: "Metrics" },
                { href: `/dashboard/projects/${clientId}/data/currencies`, label: "Currencies" },
                { sectionTitle: "Beheer", href: `/dashboard/projects/${clientId}/data/sync`, label: "Sync & Planning" },
                { href: `/dashboard/projects/${clientId}/data/health`, label: "Data Health & Kwaliteit" },
            ]
        },
    ];

    const currentNavItems: NavItem[] = clientId ? clientNavItems : adminNavItems;

    // Derive the currently open submenu items from the fresh nav items list
    const openSubmenuItem = currentNavItems.find(item => item.label === openMenuLabel);
    const activeSubmenu = openSubmenuItem?.submenu ? { title: openSubmenuItem.label, items: openSubmenuItem.submenu } : null;

    return (
        <>
            {/* Mobile backdrop */}
            {mobileSidebarOpen && (
                <div
                    className="sidebar-backdrop"
                    onClick={closeMobileSidebar}
                />
            )}
            <div
                className={`sidebar-wrapper ${mobileSidebarOpen ? "sidebar-open" : ""}`}
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
                                            onClick={() => setOpenMenuLabel(null)}
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
                                                if (openMenuLabel === item.label) {
                                                    setOpenMenuLabel(null);
                                                } else if (item.submenu) {
                                                    setOpenMenuLabel(item.label);
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
                                                color: active || openMenuLabel === item.label ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                                                background: active || openMenuLabel === item.label ? "rgba(99, 102, 241, 0.15)" : "transparent",
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
                    <div style={{ marginTop: "auto", paddingBottom: "8px", display: "flex", justifyContent: "center" }}>
                        <Link
                            href={clientId ? `/dashboard/projects/${clientId}/settings` : `/dashboard/settings`}
                            title={t("navigation", "settings")}
                            onClick={() => setOpenMenuLabel(null)}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: "42px",
                                height: "42px",
                                borderRadius: "10px",
                                color: isActive(clientId ? `/dashboard/projects/${clientId}/settings` : `/dashboard/settings`) ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                                background: isActive(clientId ? `/dashboard/projects/${clientId}/settings` : `/dashboard/settings`) ? "rgba(99, 102, 241, 0.15)" : "transparent",
                                transition: "all 0.2s ease",
                                position: "relative"
                            }}
                            className="nav-link"
                        >
                            {isActive(clientId ? `/dashboard/projects/${clientId}/settings` : `/dashboard/settings`) && <div className="active-indicator" />}
                            <Settings size={20} />
                        </Link>
                    </div>
                </aside>

                {/* Secondary Submenu Sidebar */}
                {activeSubmenu && (
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
                        {activeSubmenu.title !== t("navigation", "data") && (
                            <div style={{
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                color: "var(--color-text-muted)",
                                textTransform: "uppercase",
                                letterSpacing: "0.05em",
                                paddingLeft: "8px"
                            }}>
                                {activeSubmenu.title}
                            </div>
                        )}
                        <nav style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
                            {activeSubmenu.items.map((sub, sIdx) => {
                                const isSiblingPrefix = activeSubmenu.items.some(
                                    (other, oIdx) => oIdx !== sIdx && other.href.startsWith(sub.href + "/")
                                );
                                const active = isActive(sub.href, isSiblingPrefix);
                                return (
                                    <div key={sIdx}>
                                        {sub.sectionTitle && (
                                            <div style={{
                                                fontSize: "0.75rem",
                                                fontWeight: 700,
                                                color: "var(--color-text-muted)",
                                                textTransform: "uppercase",
                                                letterSpacing: "0.05em",
                                                paddingLeft: "8px",
                                                marginTop: sIdx > 0 ? "16px" : "0",
                                                marginBottom: "8px"
                                            }}>
                                                {sub.sectionTitle}
                                            </div>
                                        )}
                                        <Link
                                            href={sub.href}
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "space-between",
                                                padding: "10px 12px",
                                                borderRadius: "8px",
                                                color: active ? "var(--color-brand)" : "var(--color-text-primary)",
                                                background: active ? "rgba(99, 102, 241, 0.08)" : "transparent",
                                                textDecoration: "none",
                                                fontSize: "0.875rem",
                                                fontWeight: 500,
                                                transition: "all 0.2s ease"
                                            }}
                                            className="sub-link"
                                        >
                                            {sub.label}
                                            {active && <ChevronRight size={14} />}
                                        </Link>
                                    </div>
                                );
                            })}
                        </nav>

                        {/* Close Link */}
                        <button
                            onClick={() => setOpenMenuLabel(null)}
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
        </>
    );
}
