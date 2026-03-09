"use client";

import { useState, useMemo } from "react";
import {
    Building2, Users, FileText, TrendingUp, Search,
    Plus, Edit2, Eye, Calendar, Euro, Phone, Mail,
    ChevronDown, ChevronUp, Filter, ArrowRight
} from "lucide-react";

type Project = {
    id: string;
    name: string;
    companyName: string | null;
    address: string | null;
    billingEmail: string | null;
    kvkNumber: string | null;
    vatNumber: string | null;
    contractStart: string | null;
    contractEnd: string | null;
    monthlyFee: number | null;
    crmNotes: string | null;
    _count: { contacts: number; invoices: number; users: number };
};

type Invoice = {
    id: string;
    projectId: string;
    invoiceNumber: string;
    amount: number;
    vatAmount: number;
    status: string;
    invoiceDate: string;
    dueDate: string;
    paidAt: string | null;
    description: string | null;
    notes: string | null;
    createdAt: string;
    project: { name: string; companyName: string | null };
};

type Contact = {
    id: string;
    projectId: string;
    name: string;
    email: string | null;
    phone: string | null;
    role: string | null;
    isPrimary: boolean;
    notes: string | null;
    createdAt: string;
    project: { name: string };
};

type Tab = "overview" | "clients" | "invoices" | "contacts";

const STATUS_COLORS: Record<string, string> = {
    CONCEPT: "#94a3b8",
    VERZONDEN: "#f59e0b",
    BETAALD: "#10b981",
    VERLOPEN: "#ef4444",
};

const STATUS_LABELS: Record<string, string> = {
    CONCEPT: "Concept",
    VERZONDEN: "Verzonden",
    BETAALD: "Betaald",
    VERLOPEN: "Verlopen",
};

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("nl-NL", {
        style: "currency",
        currency: "EUR",
    }).format(amount);
}

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString("nl-NL", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

export default function CrmDashboard({
    projects,
    invoices,
    contacts,
}: {
    projects: Project[];
    invoices: Invoice[];
    contacts: Contact[];
}) {
    const [activeTab, setActiveTab] = useState<Tab>("overview");
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");

    // Overview stats
    const stats = useMemo(() => {
        const totalRevenue = invoices
            .filter((i) => i.status === "BETAALD")
            .reduce((sum, i) => sum + i.amount, 0);

        const openAmount = invoices
            .filter((i) => i.status === "VERZONDEN")
            .reduce((sum, i) => sum + i.amount, 0);

        const overdueAmount = invoices
            .filter((i) => i.status === "VERLOPEN")
            .reduce((sum, i) => sum + i.amount, 0);

        const mrr = projects.reduce((sum, p) => sum + (p.monthlyFee || 0), 0);

        const activeContracts = projects.filter(
            (p) => p.contractStart && (!p.contractEnd || new Date(p.contractEnd) > new Date())
        ).length;

        return { totalRevenue, openAmount, overdueAmount, mrr, activeContracts };
    }, [invoices, projects]);

    // Filtered data
    const filteredProjects = useMemo(() => {
        const q = searchQuery.toLowerCase();
        return projects.filter(
            (p) =>
                p.name.toLowerCase().includes(q) ||
                (p.companyName || "").toLowerCase().includes(q)
        );
    }, [projects, searchQuery]);

    const filteredInvoices = useMemo(() => {
        const q = searchQuery.toLowerCase();
        return invoices.filter((i) => {
            const matchesSearch =
                i.invoiceNumber.toLowerCase().includes(q) ||
                i.project.name.toLowerCase().includes(q) ||
                (i.project.companyName || "").toLowerCase().includes(q);
            const matchesStatus = statusFilter === "all" || i.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [invoices, searchQuery, statusFilter]);

    const filteredContacts = useMemo(() => {
        const q = searchQuery.toLowerCase();
        return contacts.filter(
            (c) =>
                c.name.toLowerCase().includes(q) ||
                (c.email || "").toLowerCase().includes(q) ||
                c.project.name.toLowerCase().includes(q)
        );
    }, [contacts, searchQuery]);

    const tabs: { key: Tab; label: string; icon: typeof Building2; count?: number }[] = [
        { key: "overview", label: "Overzicht", icon: TrendingUp },
        { key: "clients", label: "Klanten", icon: Building2, count: projects.length },
        { key: "invoices", label: "Facturen", icon: FileText, count: invoices.length },
        { key: "contacts", label: "Contacten", icon: Users, count: contacts.length },
    ];

    return (
        <div className="crm-dashboard">
            <div className="crm-header">
                <div>
                    <h1>CRM — Klantenbeheer</h1>
                    <p>Beheer klanten, contracten, facturen en contactpersonen</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="crm-tabs">
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        className={`crm-tab ${activeTab === tab.key ? "active" : ""}`}
                        onClick={() => {
                            setActiveTab(tab.key);
                            setSearchQuery("");
                            setStatusFilter("all");
                        }}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                        {tab.count !== undefined && (
                            <span className="tab-badge">{tab.count}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* Overview Tab */}
            {activeTab === "overview" && (
                <div className="crm-overview">
                    <div className="stat-cards">
                        <StatCard
                            label="Totale Omzet"
                            value={formatCurrency(stats.totalRevenue)}
                            icon={<Euro size={20} />}
                            color="#10b981"
                        />
                        <StatCard
                            label="Maandelijkse Omzet (MRR)"
                            value={formatCurrency(stats.mrr)}
                            icon={<TrendingUp size={20} />}
                            color="#6366f1"
                        />
                        <StatCard
                            label="Openstaand"
                            value={formatCurrency(stats.openAmount)}
                            icon={<FileText size={20} />}
                            color="#f59e0b"
                        />
                        <StatCard
                            label="Verlopen"
                            value={formatCurrency(stats.overdueAmount)}
                            icon={<FileText size={20} />}
                            color="#ef4444"
                        />
                        <StatCard
                            label="Actieve Contracten"
                            value={stats.activeContracts.toString()}
                            icon={<Calendar size={20} />}
                            color="#8b5cf6"
                        />
                        <StatCard
                            label="Totaal Klanten"
                            value={projects.length.toString()}
                            icon={<Building2 size={20} />}
                            color="#06b6d4"
                        />
                    </div>

                    {/* Recent invoices */}
                    <div className="crm-section">
                        <h3>Recente Facturen</h3>
                        <div className="crm-table-wrapper">
                            <table className="crm-table">
                                <thead>
                                    <tr>
                                        <th>Factuurnr.</th>
                                        <th>Klant</th>
                                        <th>Bedrag</th>
                                        <th>Status</th>
                                        <th>Datum</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {invoices.slice(0, 10).map((inv) => (
                                        <tr key={inv.id}>
                                            <td className="mono">{inv.invoiceNumber}</td>
                                            <td>{inv.project.companyName || inv.project.name}</td>
                                            <td className="mono">{formatCurrency(inv.amount)}</td>
                                            <td>
                                                <StatusBadge status={inv.status} />
                                            </td>
                                            <td className="text-muted">{formatDate(inv.invoiceDate)}</td>
                                        </tr>
                                    ))}
                                    {invoices.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="empty-row">
                                                Geen facturen gevonden
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Revenue Trend & Client Health */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "24px" }}>
                        {/* 6-Month Revenue */}
                        <RevenueChart invoices={invoices} />
                        {/* Client Health */}
                        <ClientHealthList projects={projects} invoices={invoices} />
                    </div>
                </div>
            )}

            {/* Clients Tab */}
            {activeTab === "clients" && (
                <div className="crm-content">
                    <div className="crm-toolbar">
                        <div className="search-box">
                            <Search size={16} />
                            <input
                                placeholder="Zoek op klantnaam of bedrijf..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="client-grid">
                        {filteredProjects.map((project) => (
                            <ClientCard key={project.id} project={project} />
                        ))}
                        {filteredProjects.length === 0 && (
                            <div className="empty-state">Geen klanten gevonden</div>
                        )}
                    </div>
                </div>
            )}

            {/* Invoices Tab */}
            {activeTab === "invoices" && (
                <div className="crm-content">
                    <div className="crm-toolbar">
                        <div className="search-box">
                            <Search size={16} />
                            <input
                                placeholder="Zoek factuur..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="filter-group">
                            <Filter size={14} />
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="all">Alle statussen</option>
                                <option value="CONCEPT">Concept</option>
                                <option value="VERZONDEN">Verzonden</option>
                                <option value="BETAALD">Betaald</option>
                                <option value="VERLOPEN">Verlopen</option>
                            </select>
                        </div>
                    </div>

                    <div className="crm-table-wrapper">
                        <table className="crm-table">
                            <thead>
                                <tr>
                                    <th>Factuurnr.</th>
                                    <th>Klant</th>
                                    <th>Bedrag</th>
                                    <th>BTW</th>
                                    <th>Status</th>
                                    <th>Factuurdatum</th>
                                    <th>Vervaldatum</th>
                                    <th>Omschrijving</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredInvoices.map((inv) => (
                                    <tr key={inv.id}>
                                        <td className="mono">{inv.invoiceNumber}</td>
                                        <td>{inv.project.companyName || inv.project.name}</td>
                                        <td className="mono">{formatCurrency(inv.amount)}</td>
                                        <td className="mono text-muted">{formatCurrency(inv.vatAmount)}</td>
                                        <td>
                                            <StatusBadge status={inv.status} />
                                        </td>
                                        <td className="text-muted">{formatDate(inv.invoiceDate)}</td>
                                        <td className="text-muted">{formatDate(inv.dueDate)}</td>
                                        <td className="text-muted">{inv.description || "—"}</td>
                                    </tr>
                                ))}
                                {filteredInvoices.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="empty-row">
                                            Geen facturen gevonden
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Contacts Tab */}
            {activeTab === "contacts" && (
                <div className="crm-content">
                    <div className="crm-toolbar">
                        <div className="search-box">
                            <Search size={16} />
                            <input
                                placeholder="Zoek contact..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="crm-table-wrapper">
                        <table className="crm-table">
                            <thead>
                                <tr>
                                    <th>Naam</th>
                                    <th>Klant</th>
                                    <th>Rol</th>
                                    <th>E-mail</th>
                                    <th>Telefoon</th>
                                    <th>Primair</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredContacts.map((c) => (
                                    <tr key={c.id}>
                                        <td className="font-medium">{c.name}</td>
                                        <td>{c.project.name}</td>
                                        <td className="text-muted">{c.role || "—"}</td>
                                        <td>
                                            {c.email ? (
                                                <a href={`mailto:${c.email}`} className="contact-link">
                                                    <Mail size={14} /> {c.email}
                                                </a>
                                            ) : (
                                                "—"
                                            )}
                                        </td>
                                        <td>
                                            {c.phone ? (
                                                <a href={`tel:${c.phone}`} className="contact-link">
                                                    <Phone size={14} /> {c.phone}
                                                </a>
                                            ) : (
                                                "—"
                                            )}
                                        </td>
                                        <td>
                                            {c.isPrimary && (
                                                <span className="primary-badge">Primair</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {filteredContacts.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="empty-row">
                                            Geen contacten gevonden
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <style jsx>{`
                .crm-dashboard {
                    padding: 28px 32px;
                    max-width: 1400px;
                }

                .crm-header h1 {
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: #f8fafc;
                    margin: 0 0 4px;
                }

                .crm-header p {
                    color: #64748b;
                    font-size: 0.875rem;
                    margin: 0;
                }

                .crm-tabs {
                    display: flex;
                    gap: 4px;
                    margin: 24px 0;
                    background: rgba(15, 23, 42, 0.4);
                    padding: 4px;
                    border-radius: 12px;
                    border: 1px solid rgba(255, 255, 255, 0.06);
                    width: fit-content;
                }

                .crm-tab {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 10px 18px;
                    border: none;
                    background: transparent;
                    color: #94a3b8;
                    font-size: 0.875rem;
                    font-weight: 500;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .crm-tab:hover {
                    color: #e2e8f0;
                    background: rgba(255, 255, 255, 0.04);
                }

                .crm-tab.active {
                    background: rgba(99, 102, 241, 0.15);
                    color: #a5b4fc;
                    font-weight: 600;
                }

                .tab-badge {
                    font-size: 0.75rem;
                    padding: 2px 8px;
                    border-radius: 10px;
                    background: rgba(255, 255, 255, 0.06);
                    color: #64748b;
                }

                .crm-tab.active .tab-badge {
                    background: rgba(99, 102, 241, 0.2);
                    color: #a5b4fc;
                }

                .stat-cards {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 16px;
                    margin-bottom: 32px;
                }

                .crm-section h3 {
                    font-size: 1rem;
                    font-weight: 600;
                    color: #e2e8f0;
                    margin: 0 0 16px;
                }

                .crm-toolbar {
                    display: flex;
                    gap: 12px;
                    margin-bottom: 20px;
                    flex-wrap: wrap;
                }

                .search-box {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    background: rgba(30, 41, 59, 0.5);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 10px;
                    padding: 0 14px;
                    flex: 1;
                    max-width: 400px;
                    color: #64748b;
                }

                .search-box input {
                    background: transparent;
                    border: none;
                    color: #f8fafc;
                    font-size: 0.875rem;
                    padding: 10px 0;
                    width: 100%;
                    outline: none;
                }

                .filter-group {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    color: #64748b;
                }

                .filter-group select {
                    background: rgba(30, 41, 59, 0.5);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 10px;
                    color: #e2e8f0;
                    padding: 10px 14px;
                    font-size: 0.875rem;
                    cursor: pointer;
                }

                .crm-table-wrapper {
                    overflow-x: auto;
                    border-radius: 12px;
                    border: 1px solid rgba(255, 255, 255, 0.06);
                    background: rgba(15, 23, 42, 0.3);
                }

                .crm-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 0.875rem;
                }

                .crm-table th {
                    text-align: left;
                    padding: 12px 16px;
                    color: #64748b;
                    font-weight: 600;
                    font-size: 0.75rem;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
                    white-space: nowrap;
                }

                .crm-table td {
                    padding: 12px 16px;
                    color: #e2e8f0;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.03);
                }

                .crm-table tbody tr:hover {
                    background: rgba(255, 255, 255, 0.02);
                }

                .mono {
                    font-family: "JetBrains Mono", "Fira Code", monospace;
                    font-size: 0.8125rem;
                }

                .text-muted {
                    color: #64748b !important;
                }

                .font-medium {
                    font-weight: 600;
                }

                .empty-row {
                    text-align: center;
                    color: #475569;
                    padding: 32px 16px !important;
                }

                .client-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
                    gap: 16px;
                }

                .empty-state {
                    text-align: center;
                    color: #475569;
                    padding: 48px 16px;
                    grid-column: 1 / -1;
                }

                .contact-link {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    color: #818cf8;
                    text-decoration: none;
                    font-size: 0.8125rem;
                    transition: color 0.2s;
                }

                .contact-link:hover {
                    color: #a5b4fc;
                }

                .primary-badge {
                    font-size: 0.7rem;
                    padding: 3px 8px;
                    border-radius: 6px;
                    background: rgba(99, 102, 241, 0.15);
                    color: #a5b4fc;
                    font-weight: 600;
                }
            `}</style>
        </div>
    );
}

// ─── Sub Components ──────────────────────────────────────

function StatCard({
    label,
    value,
    icon,
    color,
}: {
    label: string;
    value: string;
    icon: React.ReactNode;
    color: string;
}) {
    return (
        <div className="stat-card">
            <div className="stat-icon" style={{ color, background: `${color}15` }}>
                {icon}
            </div>
            <div>
                <div className="stat-value">{value}</div>
                <div className="stat-label">{label}</div>
            </div>
            <style jsx>{`
                .stat-card {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    padding: 20px;
                    background: rgba(15, 23, 42, 0.4);
                    border: 1px solid rgba(255, 255, 255, 0.06);
                    border-radius: 14px;
                    transition: border-color 0.2s;
                }
                .stat-card:hover {
                    border-color: rgba(255, 255, 255, 0.12);
                }
                .stat-icon {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 44px;
                    height: 44px;
                    border-radius: 12px;
                    flex-shrink: 0;
                }
                .stat-value {
                    font-size: 1.1rem;
                    font-weight: 700;
                    color: #f8fafc;
                }
                .stat-label {
                    font-size: 0.75rem;
                    color: #64748b;
                    margin-top: 2px;
                }
            `}</style>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const color = STATUS_COLORS[status] || "#94a3b8";
    const label = STATUS_LABELS[status] || status;

    return (
        <span
            className="status-badge"
            style={{
                color,
                background: `${color}15`,
                border: `1px solid ${color}30`,
            }}
        >
            <span className="dot" style={{ background: color }} />
            {label}
            <style jsx>{`
                .status-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 0.75rem;
                    font-weight: 600;
                    padding: 4px 10px;
                    border-radius: 8px;
                    white-space: nowrap;
                }
                .dot {
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                }
            `}</style>
        </span>
    );
}

function ClientCard({ project }: { project: Project }) {
    const [expanded, setExpanded] = useState(false);
    const now = new Date();
    const contractActive =
        project.contractStart &&
        (!project.contractEnd || new Date(project.contractEnd) > now);

    return (
        <div className="client-card">
            <div className="client-header" onClick={() => setExpanded(!expanded)}>
                <div className="client-info">
                    <h4>{project.companyName || project.name}</h4>
                    {project.companyName && project.companyName !== project.name && (
                        <span className="project-name">{project.name}</span>
                    )}
                </div>
                <div className="client-meta">
                    {contractActive && (
                        <span className="contract-badge active">Actief</span>
                    )}
                    {project.monthlyFee && (
                        <span className="fee">{formatCurrency(project.monthlyFee)}/mo</span>
                    )}
                    {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
            </div>

            <div className="client-stats">
                <span><Users size={14} /> {project._count.users} gebruikers</span>
                <span><Users size={14} /> {project._count.contacts} contacten</span>
                <span><FileText size={14} /> {project._count.invoices} facturen</span>
            </div>

            {expanded && (
                <div className="client-details">
                    {project.address && (
                        <div className="detail-row">
                            <span className="detail-label">Adres</span>
                            <span>{project.address}</span>
                        </div>
                    )}
                    {project.billingEmail && (
                        <div className="detail-row">
                            <span className="detail-label">Facturatie e-mail</span>
                            <a href={`mailto:${project.billingEmail}`}>{project.billingEmail}</a>
                        </div>
                    )}
                    {project.kvkNumber && (
                        <div className="detail-row">
                            <span className="detail-label">KvK</span>
                            <span>{project.kvkNumber}</span>
                        </div>
                    )}
                    {project.vatNumber && (
                        <div className="detail-row">
                            <span className="detail-label">BTW nr.</span>
                            <span>{project.vatNumber}</span>
                        </div>
                    )}
                    {project.contractStart && (
                        <div className="detail-row">
                            <span className="detail-label">Contract</span>
                            <span>
                                {formatDate(project.contractStart)}
                                {project.contractEnd ? ` — ${formatDate(project.contractEnd)}` : " — Onbepaald"}
                            </span>
                        </div>
                    )}
                    {project.crmNotes && (
                        <div className="detail-row notes">
                            <span className="detail-label">Notities</span>
                            <span>{project.crmNotes}</span>
                        </div>
                    )}
                </div>
            )}

            <style jsx>{`
                .client-card {
                    background: rgba(15, 23, 42, 0.4);
                    border: 1px solid rgba(255, 255, 255, 0.06);
                    border-radius: 14px;
                    overflow: hidden;
                    transition: border-color 0.2s;
                }
                .client-card:hover {
                    border-color: rgba(255, 255, 255, 0.12);
                }
                .client-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    padding: 18px 20px;
                    cursor: pointer;
                    gap: 12px;
                }
                .client-info h4 {
                    font-size: 0.95rem;
                    font-weight: 600;
                    color: #f8fafc;
                    margin: 0;
                }
                .project-name {
                    font-size: 0.75rem;
                    color: #64748b;
                    margin-top: 2px;
                    display: block;
                }
                .client-meta {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    color: #64748b;
                    flex-shrink: 0;
                }
                .contract-badge {
                    font-size: 0.7rem;
                    padding: 3px 8px;
                    border-radius: 6px;
                    font-weight: 600;
                }
                .contract-badge.active {
                    background: rgba(16, 185, 129, 0.15);
                    color: #10b981;
                }
                .fee {
                    font-size: 0.8rem;
                    font-weight: 600;
                    color: #a5b4fc;
                    font-family: "JetBrains Mono", "Fira Code", monospace;
                }
                .client-stats {
                    display: flex;
                    gap: 16px;
                    padding: 0 20px 16px;
                    font-size: 0.75rem;
                    color: #64748b;
                }
                .client-stats span {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                .client-details {
                    border-top: 1px solid rgba(255, 255, 255, 0.06);
                    padding: 16px 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    animation: slideDown 0.2s ease-out;
                }
                @keyframes slideDown {
                    from { opacity: 0; transform: translateY(-8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .detail-row {
                    display: flex;
                    gap: 12px;
                    font-size: 0.825rem;
                    color: #e2e8f0;
                }
                .detail-label {
                    color: #64748b;
                    min-width: 110px;
                    flex-shrink: 0;
                }
                .detail-row a {
                    color: #818cf8;
                    text-decoration: none;
                }
                .detail-row a:hover {
                    color: #a5b4fc;
                }
                .notes {
                    flex-direction: column;
                    gap: 4px;
                }
            `}</style>
        </div>
    );
}

// ── Revenue Chart (6-month bars) ─────────────────────────

function RevenueChart({ invoices }: { invoices: Invoice[] }) {
    const months: { label: string; paid: number; open: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const label = d.toLocaleDateString("nl-NL", { month: "short" });
        const paid = invoices
            .filter(inv => inv.status === "BETAALD" && inv.invoiceDate.startsWith(key))
            .reduce((s, inv) => s + inv.amount, 0);
        const open = invoices
            .filter(inv => (inv.status === "VERZONDEN" || inv.status === "VERLOPEN") && inv.invoiceDate.startsWith(key))
            .reduce((s, inv) => s + inv.amount, 0);
        months.push({ label, paid, open });
    }
    const maxVal = Math.max(...months.map(m => m.paid + m.open), 1);

    return (
        <div style={{
            background: "rgba(15, 23, 42, 0.4)", borderRadius: "14px",
            border: "1px solid rgba(255,255,255,0.06)", padding: "20px",
        }}>
            <h3 style={{ fontSize: "0.85rem", fontWeight: 600, color: "#e2e8f0", margin: "0 0 16px" }}>
                Omzet Trend (6 maanden)
            </h3>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", height: "100px" }}>
                {months.map((m, i) => {
                    const totalH = ((m.paid + m.open) / maxVal) * 100;
                    const paidH = m.paid > 0 ? (m.paid / (m.paid + m.open)) * totalH : 0;
                    const openH = totalH - paidH;
                    return (
                        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                            <div style={{ width: "100%", height: "80px", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                                {openH > 0 && (
                                    <div title={`Openstaand: €${m.open.toFixed(0)}`}
                                        style={{ height: `${openH}%`, background: "#f59e0b", borderRadius: "3px 3px 0 0", minHeight: openH > 0 ? "2px" : 0 }} />
                                )}
                                {paidH > 0 && (
                                    <div title={`Betaald: €${m.paid.toFixed(0)}`}
                                        style={{ height: `${paidH}%`, background: "#10b981", borderRadius: openH > 0 ? "0" : "3px 3px 0 0", minHeight: paidH > 0 ? "2px" : 0 }} />
                                )}
                                {m.paid + m.open === 0 && (
                                    <div style={{ height: "2px", background: "rgba(255,255,255,0.1)", borderRadius: "2px" }} />
                                )}
                            </div>
                            <div style={{ fontSize: "0.65rem", color: "#64748b", textTransform: "capitalize" }}>{m.label}</div>
                        </div>
                    );
                })}
            </div>
            <div style={{ display: "flex", gap: "16px", marginTop: "12px", justifyContent: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.7rem", color: "#64748b" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: "#10b981" }} /> Betaald
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.7rem", color: "#64748b" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: "#f59e0b" }} /> Openstaand
                </div>
            </div>
        </div>
    );
}

// ── Client Health List ───────────────────────────────────

function ClientHealthList({ projects, invoices }: { projects: Project[]; invoices: Invoice[] }) {
    const healthData = projects.map(p => {
        let score = 0;
        // Contract actief: +40
        const contractActive = p.contractStart && (!p.contractEnd || new Date(p.contractEnd) > new Date());
        if (contractActive) score += 40;
        // Geen verlopen facturen: +30
        const overdue = invoices.filter(i => i.projectId === p.id && i.status === "VERLOPEN").length;
        if (overdue === 0) score += 30;
        else if (overdue === 1) score += 15;
        // Heeft contacten: +15
        if (p._count.contacts > 0) score += 15;
        // Heeft MRR: +15
        if (p.monthlyFee && p.monthlyFee > 0) score += 15;

        return { name: p.companyName || p.name, score, overdue, contractActive };
    }).sort((a, b) => a.score - b.score);

    const getColor = (score: number) => score >= 80 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";

    return (
        <div style={{
            background: "rgba(15, 23, 42, 0.4)", borderRadius: "14px",
            border: "1px solid rgba(255,255,255,0.06)", padding: "20px",
        }}>
            <h3 style={{ fontSize: "0.85rem", fontWeight: 600, color: "#e2e8f0", margin: "0 0 16px" }}>
                Client Health Score
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "180px", overflowY: "auto" }}>
                {healthData.map((client, i) => (
                    <div key={i} style={{
                        display: "flex", alignItems: "center", gap: "12px",
                        padding: "8px 12px", borderRadius: "8px",
                        background: "rgba(255,255,255,0.02)",
                    }}>
                        <div style={{
                            width: "32px", height: "32px", borderRadius: "8px",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: "0.7rem", fontWeight: 700,
                            color: getColor(client.score),
                            background: `${getColor(client.score)}15`,
                        }}>
                            {client.score}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                                fontSize: "0.8rem", fontWeight: 600, color: "#e2e8f0",
                                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            }}>
                                {client.name}
                            </div>
                            <div style={{ fontSize: "0.65rem", color: "#64748b" }}>
                                {client.contractActive ? "Contract actief" : "Geen contract"}
                                {client.overdue > 0 && ` · ${client.overdue} verlopen`}
                            </div>
                        </div>
                        {/* Health bar */}
                        <div style={{
                            width: "60px", height: "4px", borderRadius: "2px",
                            background: "rgba(255,255,255,0.06)",
                        }}>
                            <div style={{
                                width: `${client.score}%`, height: "100%", borderRadius: "2px",
                                background: getColor(client.score),
                                transition: "width 0.3s ease",
                            }} />
                        </div>
                    </div>
                ))}
                {healthData.length === 0 && (
                    <div style={{ fontSize: "0.8rem", color: "#475569", textAlign: "center", padding: "16px" }}>
                        Geen klanten beschikbaar
                    </div>
                )}
            </div>
        </div>
    );
}
