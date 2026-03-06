"use client";

import { useState, useCallback } from "react";
import { SessionProvider } from "next-auth/react";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import { NotificationProvider } from "@/components/NotificationProvider";
import { MobileSidebarProvider } from "@/components/layout/MobileSidebarContext";
import CommandPalette from "@/components/CommandPalette";
import OnboardingTour from "@/components/OnboardingTour";

const SIDEBAR_WIDTH = 64;
const SUBMENU_WIDTH = 240;

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [submenuOpen, setSubmenuOpen] = useState(false);
    const handleSubmenuChange = useCallback((open: boolean) => {
        setSubmenuOpen(open);
    }, []);

    const sidebarTotalWidth = SIDEBAR_WIDTH + (submenuOpen ? SUBMENU_WIDTH : 0);

    return (
        <SessionProvider>
            <LanguageProvider>
                <ThemeProvider>
                    <NotificationProvider>
                        <MobileSidebarProvider>
                            <CommandPalette />
                            <OnboardingTour />
                            <div style={{ minHeight: "100vh", background: "var(--color-surface)" }}>
                                <Topbar sidebarWidth={sidebarTotalWidth} />
                                <div style={{ display: "flex" }} className="dashboard-layout">
                                    <Sidebar onSubmenuChange={handleSubmenuChange} />
                                    <main
                                        style={{
                                            flex: 1,
                                            minHeight: "calc(100vh - 56px)",
                                            padding: "32px",
                                            paddingTop: "calc(56px + 32px)",
                                            marginLeft: `${sidebarTotalWidth}px`,
                                            background: "var(--color-surface)",
                                            transition: "margin-left 0.3s ease",
                                        }}
                                        className="dashboard-main"
                                    >
                                        {children}
                                    </main>
                                </div>
                            </div>
                        </MobileSidebarProvider>
                    </NotificationProvider>
                </ThemeProvider>
            </LanguageProvider>
        </SessionProvider>
    );
}
