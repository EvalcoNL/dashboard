"use client";

import { PlatformIcon, getPlatformColor } from "@/lib/config/platform-icons";

export default function DataSourceIcon({ type, size = 24 }: { type: string; size?: number }) {
    return (
        <div style={{
            width: "48px",
            height: "48px",
            borderRadius: "12px",
            background: `${getPlatformColor(type)}15`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
        }}>
            <PlatformIcon type={type} size={size} />
        </div>
    );
}
