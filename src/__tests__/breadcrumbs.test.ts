import { describe, it, expect } from 'vitest';

/**
 * Tests for Breadcrumbs component label mappings and path parsing logic.
 */

// LABELS map (same as in the component)
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

// Test the path parsing logic (extracted from component)
function parseBreadcrumbs(pathname: string, projectName?: string) {
    const segments = pathname.split("/").filter(Boolean);
    const crumbs: { label: string; href: string }[] = [];
    let path = "";

    for (const segment of segments) {
        path += `/${segment}`;

        // Skip IDs (cuid-like)
        if (segment.length > 20 && /^[a-z0-9]+$/i.test(segment)) {
            crumbs.push({ label: projectName || "Project", href: path });
            continue;
        }

        const label = LABELS[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
        crumbs.push({ label, href: path });
    }

    return crumbs;
}

describe('Breadcrumbs Path Parsing', () => {
    it('returns empty for root path', () => {
        const crumbs = parseBreadcrumbs("/");
        expect(crumbs).toHaveLength(0);
    });

    it('parses admin/users path', () => {
        const crumbs = parseBreadcrumbs("/admin/users");
        expect(crumbs).toHaveLength(2);
        expect(crumbs[0].label).toBe("Admin");
        expect(crumbs[1].label).toBe("Gebruikers");
    });

    it('parses project with cuid ID and maps to project name', () => {
        const crumbs = parseBreadcrumbs(
            "/projects/cm8ga82nt0000v0m4grm4t5sn/monitoring/gtm",
            "Isolatie.com"
        );
        expect(crumbs).toHaveLength(4);
        expect(crumbs[0].label).toBe("Projecten");
        expect(crumbs[1].label).toBe("Isolatie.com");
        expect(crumbs[2].label).toBe("Monitoring");
        expect(crumbs[3].label).toBe("GTM Monitoring");
    });

    it('maps all known labels correctly', () => {
        for (const [key, expected] of Object.entries(LABELS)) {
            const crumbs = parseBreadcrumbs(`/${key}`);
            expect(crumbs[0].label).toBe(expected);
        }
    });

    it('capitalizes unknown segments', () => {
        const crumbs = parseBreadcrumbs("/custom-page");
        expect(crumbs[0].label).toBe("Custom-page");
    });

    it('builds correct hrefs', () => {
        const crumbs = parseBreadcrumbs("/projects/abc123defghijklmnopq/monitoring/incidents");
        expect(crumbs[0].href).toBe("/projects");
        expect(crumbs[1].href).toBe("/projects/abc123defghijklmnopq");
        expect(crumbs[2].href).toBe("/projects/abc123defghijklmnopq/monitoring");
        expect(crumbs[3].href).toBe("/projects/abc123defghijklmnopq/monitoring/incidents");
    });
});
