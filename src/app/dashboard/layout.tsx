"use client";

import { SessionProvider } from "next-auth/react";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <SessionProvider>
            <LanguageProvider>
                <ThemeProvider>
                    <div style={{ minHeight: "100vh", background: "var(--color-surface)" }}>
                        <Topbar />
                        <div style={{ display: "flex", paddingTop: "60px" }}>
                            <Sidebar />
                            <main
                                style={{
                                    flex: 1,
                                    minHeight: "calc(100vh - 60px)",
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

                    <style jsx global>{`
            @media (max-width: 768px) {
                .dashboard-main {
                margin-left: 0 !important;
                padding: 16px !important;
                }
            }
            `}</style>
                </ThemeProvider>
            </LanguageProvider>
        </SessionProvider>
    );
}
