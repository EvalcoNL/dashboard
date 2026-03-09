"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

/**
 * Breadcrumbs component — auto-generates navigation trail from URL path.
 * Used on all project-depth pages for better orientation.
 */

// Human-readable labels for path segments
const LABELS: Record<string, string> = {
    projects: "Projecten",
    monitoring: "Monitoring",
    web: "Web Monitoring",
    incidents: "Incidenten",
    rules: "Rule Builder",
    tracking: "Data Tracking",
    gtm: "GTM Monitoring",
    reports: "Rapporten",
    ai: "AI Reports",
    data: "Data",
    sources: "Bronnen",
    sync: "Sync",
    explorer: "Explorer",
    settings: "Instellingen",
    edit: "Bewerken",
    admin: "Admin",
    users: "Gebruikers",
    crm: "CRM",
    "audit-logs": "Audit Log",
};

interface BreadcrumbsProps {
    projectName?: string;
}

export default function Breadcrumbs({ projectName }: BreadcrumbsProps) {
    const pathname = usePathname();
    const segments = pathname.split("/").filter(Boolean);

    if (segments.length <= 1) return null; // Don't show on root pages

    const crumbs: { label: string; href: string }[] = [];
    let path = "";

    for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        path += `/${segment}`;

        // Skip IDs (cuid-like) — use project name instead
        if (segment.length > 20 && /^[a-z0-9]+$/i.test(segment)) {
            crumbs.push({
                label: projectName || "Project",
                href: path,
            });
            continue;
        }

        const label = LABELS[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
        crumbs.push({ label, href: path });
    }

    return (
        <nav
            aria-label="Breadcrumb"
            style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "13px",
                color: "var(--color-text-tertiary)",
                marginBottom: "16px",
                flexWrap: "wrap",
            }}
        >
            <Link
                href="/"
                style={{
                    color: "var(--color-text-tertiary)",
                    display: "flex",
                    alignItems: "center",
                    transition: "color 0.15s ease",
                }}
                className="breadcrumb-link"
            >
                <Home size={14} />
            </Link>

            {crumbs.map((crumb, idx) => (
                <span key={crumb.href} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <ChevronRight size={12} style={{ opacity: 0.5 }} />
                    {idx === crumbs.length - 1 ? (
                        <span style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>
                            {crumb.label}
                        </span>
                    ) : (
                        <Link
                            href={crumb.href}
                            style={{
                                color: "var(--color-text-tertiary)",
                                textDecoration: "none",
                                transition: "color 0.15s ease",
                            }}
                            className="breadcrumb-link"
                        >
                            {crumb.label}
                        </Link>
                    )}
                </span>
            ))}
        </nav>
    );
}
