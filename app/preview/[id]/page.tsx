"use client";
import React, { useState, useRef, useEffect, use } from "react";

// Sempre usa o proxy /api/vs para evitar Mixed Content (browser HTTPS → video-service HTTP)
const BASE = "/api/vs";
const KEY  = "c8club-editor-2026";

const SCORE_KEYS = [
  { key: "score_0_20",    label: "0–20 pts — Cultura Reativa",             color: "#ef4444" },
  { key: "score_21_40",   label: "21–40 pts — Cultura Instável",           color: "#f97316" },
  { key: "score_41_60",   label: "41–60 pts — Cultura em Construção",      color: "#f59e0b" },
  { key: "score_61_80",   label: "61–80 pts — Cultura Estruturada",        color: "#3b82f6" },
  { key: "score_81_100",  label: "81–100 pts — Alta Performance",          color: "#10b981" },
];

interface Job { job_id: string; status: string; url: string | null; error: string | null; }

export default function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const funnelId = unwrappedParams.id;
  const [nome,     setNome]     = useState("João Silva");
  const [empresa,  setEmpresa]  = useState("Empresa Demo Ltda");
  const [cargo,    setCargo]    = useState("CEO");
  const [score,    setScore]    = useState(65);
  const [colabs,   setColabs]   = useState("26 a 50");
  const [scriptKey, setScriptKey] = useState("score_61_80");

  const [job,      setJob]      = useState<Job | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [elapsed,  setElapsed]  = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearPolling = () => {
    if (pollRef.current)  { clearInterval(pollRef.current);  pollRef.current  = null; }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  useEffect(() => () => clearPolling(), []);

  const generate = async () => {
    clearPolling();
    setLoading(true);
    setJob(null);
    setElapsed(0);

    const r = await fetch(`${BASE}/api/config/preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-editor-key": KEY },
      body: JSON.stringify({
        funnel_id: funnelId,
        script_key: scriptKey,
        voice: null,
        lead_demo: { nome, empresa, cargo, score, colaboradores: colabs },
      }),
    });
    const { job_id } = await r.json();
    setJob({ job_id, status: "processing", url: null, error: null });

    // Timer
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);

    // Polling
    pollRef.current = setInterval(async () => {
      const res = await fetch(`${BASE}/api/config/preview/${job_id}`, {
        headers: { "x-editor-key": KEY },
      });
      const data = await res.json();
      setJob(data);
      if (data.status !== "processing") {
        clearPolling();
        setLoading(false);
      }
    }, 3000);
  };

  const scoreColor = SCORE_KEYS.find(s => s.key === scriptKey)?.color || "#3b82f6";

  return (
    <div className="animate-in">
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800 }}>▶ Preview do Vídeo</h1>
        <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>
          Gere um vídeo de teste com dados fictícios para validar o resultado antes de usar em produção.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: 24 }}>
        {/* Form */}
        <div>
          <div className="card" style={{ padding: 24, marginBottom: 16 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>Dados do lead demo</h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { label: "Nome", val: nome, set: setNome },
                { label: "Empresa", val: empresa, set: setEmpresa },
                { label: "Cargo", val: cargo, set: setCargo },
              ].map(({ label, val, set }) => (
                <div key={label}>
                  <label className="label">{label}</label>
                  <input className="input" value={val} onChange={e => set(e.target.value)} />
                </div>
              ))}

              <div>
                <label className="label">Score Cultural</label>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <input
                    type="range" min="0" max="100" value={score}
                    onChange={e => {
                      const s = parseInt(e.target.value);
                      setScore(s);
                      // Auto-select script key based on score
                      if (s <= 20) setScriptKey("score_0_20");
                      else if (s <= 40) setScriptKey("score_21_40");
                      else if (s <= 60) setScriptKey("score_41_60");
                      else if (s <= 80) setScriptKey("score_61_80");
                      else setScriptKey("score_81_100");
                    }}
                    style={{ flex: 1, accentColor: scoreColor }}
                  />
                  <div style={{
                    width: 48, height: 48, borderRadius: "50%",
                    background: scoreColor,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 800, fontSize: 16, color: "#fff", flexShrink: 0,
                    boxShadow: `0 0 20px ${scoreColor}55`,
                  }}>{score}</div>
                </div>
              </div>

              <div>
                <label className="label">Colaboradores</label>
                <select
                  className="input"
                  value={colabs}
                  onChange={e => setColabs(e.target.value)}
                  style={{ cursor: "pointer" }}
                >
                  {["01 a 10","11 a 25","26 a 50","51 a 100","101 a 300","301 a 500","501 a 1000","acima de 1000"].map(v => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Roteiro usado</label>
                <select
                  className="input"
                  value={scriptKey}
                  onChange={e => setScriptKey(e.target.value)}
                  style={{ cursor: "pointer" }}
                >
                  {SCORE_KEYS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          <button
            className="btn btn-primary"
            onClick={generate}
            disabled={loading}
            style={{ width: "100%", justifyContent: "center", padding: "14px", fontSize: 15 }}
          >
            {loading ? `⏳ Gerando… ${elapsed}s` : "▶ Gerar Preview"}
          </button>
        </div>

        {/* Video result */}
        <div className="card" style={{ padding: 24, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
          {!job && !loading && (
            <div style={{ textAlign: "center", color: "var(--text-muted)" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🎬</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Pronto para gerar</div>
              <div style={{ fontSize: 13 }}>Configure os dados ao lado e clique em Gerar Preview</div>
              <div style={{ fontSize: 12, marginTop: 12, color: "var(--text-muted)" }}>
                ⏱ Geração leva em média 2–4 minutos
              </div>
            </div>
          )}

          {loading && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 20, animation: "spin 2s linear infinite" }}>⟳</div>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Gerando vídeo…</div>
              <div style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 16 }}>{elapsed}s decorridos</div>
              <div style={{
                background: "var(--bg-elevated)", borderRadius: 8, padding: "8px 20px",
                fontSize: 13, color: "var(--text-secondary)",
              }}>
                Renderizando slides → gerando áudio → montando vídeo
              </div>
            </div>
          )}

          {job?.status === "done" && job.url && (
            <div style={{ width: "100%", textAlign: "center" }}>
              <div style={{ marginBottom: 16 }}>
                <span className="badge badge-green">✓ Vídeo gerado com sucesso</span>
              </div>
              <video
                key={job.url}
                controls autoPlay playsInline
                style={{
                  width: "100%", maxHeight: 400,
                  borderRadius: "var(--radius-lg)",
                  background: "#000",
                  boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
                }}
              >
                <source src={`${job.url}?t=${Date.now()}`} type="video/mp4" />
              </video>
              <div style={{ marginTop: 12 }}>
                <a href={`${job.url}?t=${Date.now()}`} target="_blank" rel="noreferrer" className="btn btn-ghost" style={{ fontSize: 12 }}>
                  ↗ Abrir em nova aba
                </a>
              </div>
            </div>
          )}

          {job?.status === "error" && (
            <div style={{ textAlign: "center", color: "#fca5a5" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>⚠</div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Erro ao gerar vídeo</div>
              <div style={{
                background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: "var(--radius-md)", padding: 12,
                fontSize: 12, fontFamily: "monospace", maxWidth: 400, textAlign: "left",
              }}>
                {job.error}
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
