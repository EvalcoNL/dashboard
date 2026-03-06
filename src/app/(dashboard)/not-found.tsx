import { Search, Home } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
    return (
        <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "60vh",
            padding: "32px"
        }}>
            <div className="glass-card" style={{
                padding: "48px",
                textAlign: "center",
                maxWidth: "480px",
                width: "100%"
            }}>
                <div style={{
                    width: "64px",
                    height: "64px",
                    borderRadius: "16px",
                    background: "rgba(99, 102, 241, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 24px",
                    border: "1px solid rgba(99, 102, 241, 0.2)"
                }}>
                    <Search size={28} color="var(--color-brand)" />
                </div>

                <h2 style={{
                    fontSize: "1.5rem",
                    fontWeight: 700,
                    marginBottom: "8px",
                    color: "var(--color-text-primary)"
                }}>
                    Pagina Niet Gevonden
                </h2>

                <p style={{
                    color: "var(--color-text-muted)",
                    fontSize: "0.875rem",
                    marginBottom: "32px",
                    lineHeight: 1.6
                }}>
                    De pagina die je zoekt bestaat niet of is verplaatst.
                </p>

                <Link href="/" style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 24px",
                    background: "var(--color-brand)",
                    color: "white",
                    border: "none",
                    borderRadius: "10px",
                    fontWeight: 600,
                    textDecoration: "none",
                    fontSize: "0.875rem"
                }}>
                    <Home size={16} />
                    Terug naar Dashboard
                </Link>
            </div>
        </div>
    );
}
