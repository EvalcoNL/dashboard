"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
    ChevronDown,
    LogOut,
    Settings,
    User,
    Moon,
    Sun,
    Activity,
    Globe,
} from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import NotificationDropdown from "./topbar/NotificationDropdown";
import ProjectSwitcher from "./topbar/ProjectSwitcher";

export default function Topbar() {
    const { data: session } = useSession();
    const { theme, toggleTheme } = useTheme();
    const { language, setLanguage, t } = useLanguage();
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const router = useRouter();
    const userMenuRef = useRef<HTMLDivElement>(null);

    // Handle click outside user menu
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setIsUserMenuOpen(false);
            }
        }
        function handleEscape(event: KeyboardEvent) {
            if (event.key === "Escape") setIsUserMenuOpen(false);
        }
        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleEscape);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleEscape);
        };
    }, []);

    return (
        <header
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                height: "60px",
                background: "var(--color-surface-elevated)",
                borderBottom: "1px solid var(--color-border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 24px",
                zIndex: 100,
                backdropFilter: "blur(12px)",
            }}
        >
            {/* Left section: Logo and Client Selector */}
            <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
                <Link
                    href="/dashboard"
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        textDecoration: "none"
                    }}
                >
                    <div
                        style={{
                            width: "32px",
                            height: "32px",
                            background: "linear-gradient(135deg, var(--color-brand), var(--color-brand-light))",
                            borderRadius: "8px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <Activity size={18} color="white" />
                    </div>
                    <span
                        style={{
                            fontSize: "1rem",
                            fontWeight: 700,
                            color: "var(--color-text-primary)",
                            letterSpacing: "-0.02em",
                        }}
                    >
                        Evalco
                    </span>
                </Link>

                <ProjectSwitcher t={t} />
            </div>

            {/* Right section: Theme, Notifications, Language, User */}
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <button
                    onClick={() => setLanguage(language === "nl" ? "en" : "nl")}
                    style={{
                        background: "none",
                        border: "none",
                        color: "var(--color-text-secondary)",
                        cursor: "pointer",
                        padding: "4px 8px",
                        borderRadius: "8px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        transition: "background 0.2s"
                    }}
                    className="hover-bg"
                >
                    <Globe size={18} />
                    <span style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase" }}>
                        {language}
                    </span>
                </button>

                <button
                    onClick={toggleTheme}
                    style={{
                        background: "none",
                        border: "none",
                        color: "var(--color-text-secondary)",
                        cursor: "pointer",
                        padding: "8px",
                        borderRadius: "8px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "background 0.2s"
                    }}
                    className="hover-bg"
                >
                    {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
                </button>

                <NotificationDropdown />

                {/* User Account Dropdown */}
                <div ref={userMenuRef} style={{ position: "relative" }}>
                    <button
                        onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: "4px 8px",
                            borderRadius: "8px",
                        }}
                        className="hover-bg"
                    >
                        <div
                            style={{
                                width: "28px",
                                height: "28px",
                                borderRadius: "50%",
                                background: "var(--color-brand)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "white",
                                fontSize: "0.75rem",
                                fontWeight: 600,
                            }}
                        >
                            {session?.user?.name ? session.user.name.charAt(0).toUpperCase() : <User size={16} />}
                        </div>
                        <ChevronDown size={14} color="var(--color-text-muted)" />
                    </button>

                    {isUserMenuOpen && (
                        <div
                            style={{
                                position: "absolute",
                                top: "100%",
                                right: 0,
                                marginTop: "8px",
                                width: "200px",
                                background: "var(--color-surface-elevated)",
                                border: "1px solid var(--color-border)",
                                borderRadius: "12px",
                                boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
                                padding: "8px",
                                zIndex: 120,
                                animation: "fadeIn 0.2s ease-out"
                            }}
                        >
                            <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--color-border)", marginBottom: "8px" }}>
                                <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--color-text-primary)" }}>{session?.user?.name}</p>
                                <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>{session?.user?.email}</p>
                            </div>

                            <Link
                                href="/dashboard/settings"
                                onClick={() => setIsUserMenuOpen(false)}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "10px",
                                    padding: "8px 12px",
                                    borderRadius: "8px",
                                    color: "var(--color-text-primary)",
                                    textDecoration: "none",
                                    fontSize: "0.875rem",
                                    transition: "background 0.2s"
                                }}
                                className="hover-bg-int"
                            >
                                <Settings size={16} />
                                <span>{t("common", "settings")}</span>
                            </Link>

                            <button
                                onClick={() => signOut({ callbackUrl: "/login" })}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "10px",
                                    width: "100%",
                                    padding: "8px 12px",
                                    borderRadius: "8px",
                                    color: "#f87171",
                                    background: "none",
                                    border: "none",
                                    textAlign: "left",
                                    cursor: "pointer",
                                    fontSize: "0.875rem",
                                    marginTop: "4px",
                                    transition: "background 0.2s"
                                }}
                                className="hover-danger-bg"
                            >
                                <LogOut size={16} />
                                <span>{t("common", "logout")}</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <style jsx>{`
        .hover-bg:hover {
          background: var(--color-surface-hover);
        }
        .hover-bg-int:hover {
          background: var(--color-surface-hover);
        }
        .hover-danger-bg:hover {
          background: rgba(239, 68, 68, 0.1);
        }
      `}</style>
        </header>
    );
}
