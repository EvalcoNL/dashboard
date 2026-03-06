"use client";

import { SessionProvider } from "next-auth/react";
import Topbar from "@/components/layout/Topbar";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import { NotificationProvider } from "@/components/NotificationProvider";
import { MobileSidebarProvider } from "@/components/layout/MobileSidebarContext";

export default function FullscreenLayout({
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
                            <div
                                style={{
                                    minHeight: "100vh",
                                    background: "var(--color-surface)",
                                }}
                            >
                                <Topbar />
                                <div style={{ paddingTop: "56px" }}>
                                    {children}
                                </div>
                            </div>
                        </MobileSidebarProvider>
                    </NotificationProvider>
                </ThemeProvider>
            </LanguageProvider>
        </SessionProvider>
    );
}
