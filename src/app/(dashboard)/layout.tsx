"use client";

import { SessionProvider } from "next-auth/react";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import { NotificationProvider } from "@/components/NotificationProvider";
import { MobileSidebarProvider } from "@/components/layout/MobileSidebarContext";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <SessionProvider>
            <LanguageProvider>
                <ThemeProvider>
                    <NotificationProvider>
                        <MobileSidebarProvider>
                            <div style={{ minHeight: "100vh", background: "var(--color-surface)" }}>
                                <Topbar />
                                <div style={{ display: "flex", paddingTop: "56px" }} className="dashboard-layout">
                                    <Sidebar />
                                    <main
                                        style={{
                                            flex: 1,
                                            minHeight: "calc(100vh - 56px)",
                                            padding: "32px",
                                            background: "var(--color-surface)",
                                            transition: "all 0.3s ease",
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
