"use client";
import { usePathname } from "next/navigation";

const links = [
  { href: "/",        icon: "◈", label: "Dashboard" },
  { href: "/scripts", icon: "✍", label: "Roteiros" },
  { href: "/slides",  icon: "⊞", label: "Slides" },
  { href: "/voice",   icon: "♪", label: "Narração" },
  { href: "/preview", icon: "▶", label: "Preview" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside style={{
      width: 220, minWidth: 220,
      background: "var(--bg-surface)",
      borderRight: "1px solid var(--border-subtle)",
      padding: "28px 16px",
      display: "flex", flexDirection: "column", gap: 4,
      position: "sticky", top: 0, height: "100vh",
    }}>
      {/* Logo */}
      <div style={{ marginBottom: 32, padding: "0 8px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 4 }}>
          C8Club
        </div>
        <div style={{
          fontSize: 17, fontWeight: 800, lineHeight: 1.2,
          background: "linear-gradient(135deg, #60a5fa, #818cf8)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>
          Editor de<br />Vídeo
        </div>
      </div>

      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: "var(--text-muted)", padding: "0 8px", marginBottom: 8 }}>
        Menu
      </div>

      {links.map(({ href, icon, label }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <a
            key={href} href={href}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 12px", borderRadius: "var(--radius-md)",
              color: active ? "var(--text-primary)" : "var(--text-secondary)",
              textDecoration: "none", fontSize: 14, fontWeight: 500,
              background: active ? "var(--bg-elevated)" : "transparent",
              borderLeft: active ? `3px solid var(--accent)` : "3px solid transparent",
              transition: "all 0.15s",
            }}
          >
            <span style={{ fontSize: 16, width: 20, textAlign: "center" }}>{icon}</span>
            {label}
          </a>
        );
      })}

      <div style={{ marginTop: "auto", padding: "16px 8px", borderTop: "1px solid var(--border-subtle)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="dot dot-green" />
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Video-service ativo</span>
        </div>
      </div>
    </aside>
  );
}
