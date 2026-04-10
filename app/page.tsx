"use client";
import { useEffect, useState } from "react";
import { apiGet, SCORE_COLORS } from "./lib/api";

const SCRIPTS = ["score_0_20","score_21_40","score_41_60","score_61_80","score_81_100"];

export default function Dashboard() {
  const [scripts, setScripts] = useState<Array<{ key: string; label: string; char_count: number; preview: string }>>([]);
  const [voice, setVoice] = useState({ speed: 1.0 });
  const [ok, setOk] = useState(true);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([apiGet("/api/config/scripts"), apiGet("/api/config/voice")])
      .then(([s, v]) => { setScripts(s); setVoice(v); setOk(true); })
      .catch(() => setOk(false))
      .finally(() => setLoaded(true));
  }, []);

  const totalChars = scripts.reduce((s, sc) => s + sc.char_count, 0);

  return (
    <div className="animate-in">
      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
          }}>🎬</div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800 }}>Editor de Vídeo</h1>
            <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Raio-X Cultural — raioxcultural.codigooito.com.br</p>
          </div>
        </div>
      </div>

      {loaded && !ok && (
        <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "var(--radius-md)", padding: 16, marginBottom: 24, color: "#fca5a5", fontSize: 14 }}>
          ⚠ Não foi possível conectar ao video-service. Verifique NEXT_PUBLIC_VIDEO_SERVICE_URL.
        </div>
      )}

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 40 }}>
        {[
          { label: "Roteiros configurados", value: loaded ? scripts.length : "…", sub: loaded ? `${totalChars.toLocaleString()} chars total` : "", color: "#3b82f6", icon: "✍" },
          { label: "Velocidade da voz", value: loaded ? `${voice.speed}×` : "…", sub: loaded ? (voice.speed < 0.9 ? "Mais rápido" : voice.speed > 1.1 ? "Mais lento" : "Padrão") : "", color: "#8b5cf6", icon: "♪" },
          { label: "Slides totais", value: 15, sub: "8 estáticos · 7 dinâmicos", color: "#10b981", icon: "⊞" },
          { label: "Status do serviço", value: !loaded ? "…" : ok ? "Online" : "Offline", sub: "video-service FastAPI", color: !loaded ? "#8ba4c4" : ok ? "#10b981" : "#ef4444", icon: ok ? "✓" : "✗" },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--text-muted)", marginBottom: 8 }}>{s.label}</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>{s.sub}</div>
              </div>
              <div style={{ fontSize: 24, opacity: 0.4 }}>{s.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: "var(--text-secondary)" }}>Ações rápidas</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
          {[
            { href: "/scripts", title: "Editar Roteiros", desc: "Modifique os textos narrados para cada faixa de score", icon: "✍", color: "#3b82f6" },
            { href: "/voice",   title: "Configurar Voz",  desc: "Ajuste velocidade e entonação da narração", icon: "♪", color: "#8b5cf6" },
            { href: "/slides",  title: "Gerenciar Slides", desc: "Reordene slides e defina durações individuais", icon: "⊞", color: "#10b981" },
            { href: "/preview", title: "Gerar Preview", desc: "Teste o vídeo com dados fictícios", icon: "▶", color: "#f59e0b" },
          ].map(a => (
            <a key={a.href} href={a.href} style={{ textDecoration: "none" }}>
              <div className="card" style={{ padding: "20px 24px", cursor: "pointer", transition: "all 0.2s", borderColor: "var(--border-subtle)" }}
                onMouseEnter={e => { Object.assign((e.currentTarget as HTMLElement).style, { borderColor: a.color + "55", transform: "translateY(-2px)" }); }}
                onMouseLeave={e => { Object.assign((e.currentTarget as HTMLElement).style, { borderColor: "var(--border-subtle)", transform: "none" }); }}
              >
                <div style={{ fontSize: 24, marginBottom: 10 }}>{a.icon}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>{a.title}</div>
                <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>{a.desc}</div>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Scripts list */}
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: "var(--text-secondary)" }}>Roteiros ativos</h2>
        <div className="card" style={{ overflow: "hidden" }}>
          {loaded && scripts.map((sc, i) => (
            <a key={sc.key} href={`/scripts?key=${sc.key}`} style={{ textDecoration: "none" }}>
              <div style={{ padding: "16px 24px", borderBottom: i < scripts.length - 1 ? "1px solid var(--border-subtle)" : "none", display: "flex", alignItems: "center", gap: 16, transition: "background 0.15s", cursor: "pointer" }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
              >
                <div style={{ width: 48, height: 4, borderRadius: 2, background: SCORE_COLORS[sc.key], flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 3 }}>{sc.label}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{sc.preview}…</div>
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", flexShrink: 0 }}>{sc.char_count} chars</div>
              </div>
            </a>
          ))}
          {!loaded && SCRIPTS.map((k, i) => (
            <div key={k} style={{ padding: "16px 24px", borderBottom: i < 4 ? "1px solid var(--border-subtle)" : "none" }}>
              <div style={{ height: 16, background: "var(--bg-elevated)", borderRadius: 4, width: "60%", marginBottom: 6 }} />
              <div style={{ height: 12, background: "var(--bg-elevated)", borderRadius: 4, width: "80%" }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
