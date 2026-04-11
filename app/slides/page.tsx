"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { apiGet, apiPost } from "../lib/api";

interface Funnel {
  id: string;
  name: string;
  slide_count: number;
}

export default function FunnelsDashboard() {
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

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

  const handleCreateFunnel = async () => {
    const name = prompt("Qual o nome do novo funil? (Ex: Welcome VSL)");
    if (!name) return;
    
    // Converte nome para ID (minúsculo, sem acentos, espaços -> hífen)
    const funnel_id = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    
    if (!funnel_id) return alert("Nome inválido");
    
    setCreating(true);
    try {
      await apiPost("/api/config/funnels", { funnel_id, name });
      alert("Funil criado com sucesso!");
      loadFunnels();
    } catch (e: any) {
      console.error(e);
      alert("Erro ao criar funil: " + e.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="animate-in" style={{ paddingBottom: 64 }}>
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800 }}>⊞ Gerenciador de Funis</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>
            Visualize, crie e orquestre diferentes apresentações audiovisuais para os roteiros.
          </p>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={handleCreateFunnel}
          disabled={creating}
        >
          {creating ? "Criando..." : "+ Novo Funil"}
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>Carregando funis...</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 24 }}>
          {funnels.map(funnel => (
            <Link key={funnel.id} href={`/slides/${funnel.id}`} style={{ textDecoration: "none" }}>
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
                    background: "rgba(96, 165, 250, 0.1)", color: "#60a5fa",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 24
                  }}>
                    {funnel.id === "raiox-cultural" ? "🎥" : "⊞"}
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
                    <strong>{funnel.slide_count}</strong> slides na timeline
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--accent)" }}>
                    Configurar →
                  </div>
                </div>
              </div>
            </Link>
          ))}
          
          {funnels.length === 0 && (
            <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px", color: "var(--text-muted)", border: "1px dashed var(--border-subtle)", borderRadius: 8 }}>
              Nenhum funil encontrado além do padrão. Crie um novo!
            </div>
          )}
        </div>
      )}
    </div>
  );
}
