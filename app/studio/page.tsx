"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { apiGet, apiPost } from "../lib/api";

interface Funnel {
  id: string;
  name: string;
  slide_count: number;
}

export default function StudioDashboard() {
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFunnels = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGet("/api/config/funnels");
      setFunnels(res.funnels || []);
    } catch (e: any) {
      console.error(e);
      alert("Erro ao carregar funis: " + e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadFunnels(); }, [loadFunnels]);

  return (
    <div className="animate-in" style={{ paddingBottom: 64 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800 }}>🎨 C8 Studio</h1>
        <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>
          Selecione uma apresentação (Funil) para isolar e editar os templates HTML visuais em nosso Pintor Avançado.
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>Carregando funis...</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 24 }}>
          {funnels.map(funnel => (
            <Link key={funnel.id} href={`/studio/${funnel.id}`} style={{ textDecoration: "none" }}>
              <div 
                className="card" 
                style={{ 
                  padding: 24, 
                  cursor: "pointer", 
                  transition: "all 0.2s ease",
                  border: "1px solid var(--border-subtle)",
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "var(--accent)"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border-subtle)"}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                  <div style={{ 
                    width: 48, height: 48, borderRadius: 8, 
                    background: "rgba(168, 85, 247, 0.1)", color: "#a855f7",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 24
                  }}>
                    {funnel.id === "raiox-cultural" ? "🎥" : "🎨"}
                  </div>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                      {funnel.name}
                    </h3>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                      ID: {funnel.id}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 16, borderTop: "1px solid var(--border-subtle)" }}>
                  <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                    Base renderizadora isolada
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--accent)" }}>
                    Pintar Templates →
                  </div>
                </div>
              </div>
            </Link>
          ))}
          
          {funnels.length === 0 && (
            <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px", color: "var(--text-muted)", border: "1px dashed var(--border-subtle)", borderRadius: 8 }}>
              Nenhum funil construído. Crie no Menu "Orquestrador".
            </div>
          )}
        </div>
      )}
    </div>
  );
}
