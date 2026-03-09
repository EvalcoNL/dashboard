import { User2, FolderPlus, Database, Activity, Bell, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface OnboardingStep {
    id: string;
    title: string;
    description: string;
    icon: LucideIcon;
    href: string; // Where to navigate when clicked
    checkDescription: string; // What constitutes completion
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
    {
        id: "profile",
        title: "Profiel invullen",
        description: "Vul je naam en bedrijfsgegevens in",
        icon: User2,
        href: "/settings",
        checkDescription: "Naam ingesteld",
    },
    {
        id: "project",
        title: "Eerste project aanmaken",
        description: "Maak je eerste project (klant/account) aan",
        icon: FolderPlus,
        href: "/",
        checkDescription: "Minimaal 1 project aangemaakt",
    },
    {
        id: "sources",
        title: "Data bron koppelen",
        description: "Koppel minimaal één data bron (Google Ads, GA4, etc.)",
        icon: Database,
        href: "", // Dynamic: first project
        checkDescription: "Minimaal 1 data bron gekoppeld",
    },
    {
        id: "monitoring",
        title: "Website monitoring instellen",
        description: "Stel uptime monitoring in voor een website",
        icon: Activity,
        href: "", // Dynamic: first project
        checkDescription: "Website monitoring geconfigureerd",
    },
    {
        id: "notifications",
        title: "Notificaties configureren",
        description: "Stel je notificatie voorkeuren in",
        icon: Bell,
        href: "", // Dynamic: first project
        checkDescription: "Notificatie voorkeuren ingesteld",
    },
    {
        id: "team",
        title: "Teamlid uitnodigen",
        description: "Nodig een collega uit om samen te werken",
        icon: Users,
        href: "/admin/users",
        checkDescription: "Minimaal 1 uitnodiging verstuurd",
    },
];
