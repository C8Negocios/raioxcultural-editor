"use client";
import { useEffect, useState, useCallback } from "react";
import { apiGet, apiPut } from "../lib/api";

const PIPER_MODELS = [
  { id: "pt_BR-razo-medium", label: "Razo (Masculino Natural/Finetuned)" },
  { id: "pt_BR-cadu-medium", label: "Cadu (Masculino Inteligente)" },
  { id: "pt_BR-jeff-medium", label: "Jeff (Masculino Animado)" },
  { id: "pt_BR-faber-medium", label: "Faber (Masculino Corporativo/Estável)" },
  { id: "pt_BR-aline-medium", label: "Aline (Feminino Padrão)" }
];

export default function VoicePage() {
  const [speed, setSpeed] = useState(1.0);
  const [model, setModel] = useState("pt_BR-razo-medium");
  const [originalSpeed, setOriginalSpeed] = useState(1.0);
  const [originalModel, setOriginalModel] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testText, setTestText] = useState(
    "Olá! Este é o diagnóstico cultural da sua empresa. Desenvolvemos este material especialmente para você e sua equipe."
  );

  const load = useCallback(async () => {
    try {
      const d = await apiGet("/api/config/voice");
      setSpeed(d.speed); setOriginalSpeed(d.speed);
      setModel(d.model || "pt_BR-razo-medium"); setOriginalModel(d.model || "pt_BR-razo-medium");
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      await apiPut("/api/config/voice", { speed, speaker: 0, model });
      setOriginalSpeed(speed); setOriginalModel(model); setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally { setSaving(false); }
  };

  const downloadVoice = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_VIDEO_SERVICE_URL || "http://localhost:8000"}/api/config/download-voice?model=${model}`, {
        method: "POST",
        headers: { "x-editor-key": process.env.NEXT_PUBLIC_EDITOR_API_KEY || "c8club-editor-2026" }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      alert(data.message);
    } catch (e: any) {
      alert("Erro ao baixar: " + e.message);
    } finally {
      setDownloading(false);
    }
  };

  const testPreview = async () => {
    setTesting(true);
    try {
      const r = await fetch(`${process.env.NEXT_PUBLIC_VIDEO_SERVICE_URL || "http://localhost:8000"}/api/config/preview-audio`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-editor-key": process.env.NEXT_PUBLIC_EDITOR_API_KEY || "c8club-editor-2026" },
        body: JSON.stringify({ script_override: testText, voice: { speed, speaker: 0, model } }),
      });
      if (!r.ok) {
        const err = await r.json(); alert("Erro: " + err.detail); return;
      }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      
      // Quando terminar de tocar, liberamos as variáveis da URL e re-ativamos o botão testPreview 
      audio.onended = () => {
        URL.revokeObjectURL(url);
        setTesting(false);
      };
      audio.play();
    } catch(e) {
      alert("Falha no áudio preview: " + e);
      setTesting(false);
    }
  };

  const speedLabel = (s: number) => {
    if (s <= 0.7) return "Muito rápido";
    if (s <= 0.9) return "Rápido";
    if (s <= 1.1) return "Normal";
    if (s <= 1.4) return "Moderado";
    if (s <= 1.7) return "Lento";
    return "Muito lento";
  };

  const changed = speed !== originalSpeed || model !== originalModel;

  return (
    <div className="animate-in">
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800 }}>♪ Configuração de Narração</h1>
        <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>
          Ajuste a velocidade e as características da voz gerada pelo Piper TTS.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {/* Speed control */}
        <div className="card" style={{ padding: 32 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 24 }}>Locutor (Piper Onnx)</h2>
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "stretch" }}>
              <select
                className="input"
                value={model}
                onChange={e => { setModel(e.target.value); setSaved(false); }}
                style={{ flex: 1, backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}
              >
                {PIPER_MODELS.map(m => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
              <button 
                onClick={downloadVoice} 
                disabled={downloading}
                className="btn btn-ghost"
                title="Se for a primeira vez selecionando esta voz, baixe-a no servidor"
              >
                {downloading ? "↓ Baixando..." : "↓ Baixar Voz no Servidor"}
              </button>
            </div>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>
              O modelo precisa estar baixado no Coolify/Volume para gerar o áudio. Utilize o botão acima caso seja uma voz nova.
            </p>
          </div>

          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 24 }}>Velocidade da Narração</h2>

          {/* Big display */}
          <div style={{
            textAlign: "center",
            marginBottom: 32,
            padding: "24px",
            background: "var(--bg-elevated)",
            borderRadius: "var(--radius-lg)",
          }}>
            <div style={{
              fontSize: 56, fontWeight: 800,
              background: "linear-gradient(135deg, #60a5fa, #818cf8)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>
              {speed.toFixed(2)}×
            </div>
            <div style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 8 }}>
              {speedLabel(speed)}
            </div>
          </div>

          {/* Slider */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>0.5× Mais rápido</span>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>2.0× Mais lento</span>
            </div>
            <input
              type="range"
              min="0.5" max="2.0" step="0.05"
              value={speed}
              onChange={e => { setSpeed(parseFloat(e.target.value)); setSaved(false); }}
              style={{
                width: "100%",
                accentColor: "#3b82f6",
                cursor: "pointer",
                height: 6,
              }}
            />
            {/* Marker ticks */}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
              {[0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0].map(v => (
                <button
                  key={v}
                  onClick={() => setSpeed(v)}
                  style={{
                    background: speed === v ? "#3b82f6" : "var(--bg-elevated)",
                    border: "1px solid var(--border-default)",
                    borderRadius: 4,
                    padding: "2px 6px",
                    fontSize: 11,
                    cursor: "pointer",
                    color: speed === v ? "#fff" : "var(--text-muted)",
                    transition: "all 0.15s",
                  }}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Technical note */}
          <div style={{
            background: "rgba(99,179,237,0.08)",
            border: "1px solid rgba(99,179,237,0.2)",
            borderRadius: "var(--radius-md)",
            padding: "12px 14px",
            fontSize: 12,
            color: "var(--text-muted)",
            lineHeight: 1.6,
            marginBottom: 24,
          }}>
            <strong style={{ color: "#60a5fa" }}>Como funciona:</strong> O parâmetro controla o{" "}
            <code style={{ fontFamily: "monospace", color: "#a78bfa" }}>length_scale</code> do Piper TTS.{" "}
            Valores abaixo de 1.0 aceleram a fala, acima de 1.0 a desaceleram.
            O vídeo se ajusta automaticamente à duração da narração.
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              className="btn btn-primary"
              onClick={save}
              disabled={saving || !changed}
              style={{ flex: 1, justifyContent: "center", opacity: saving || !changed ? 0.5 : 1 }}
            >
              {saving ? "Salvando…" : saved ? "✓ Salvo!" : "Salvar configuração"}
            </button>
          </div>
        </div>

        {/* Test preview */}
        <div className="card" style={{ padding: 32 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Preview de Voz</h2>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20, lineHeight: 1.6 }}>
            Gere um vídeo de preview com a velocidade atual para ouvir como vai ficar antes de salvar.
          </p>

          <div style={{ marginBottom: 16 }}>
            <label className="label">Texto para testar</label>
            <textarea
              className="input"
              value={testText}
              onChange={e => setTestText(e.target.value)}
              rows={6}
              style={{ resize: "vertical", fontFamily: "'Inter', sans-serif", lineHeight: 1.6 }}
            />
          </div>

          <button
            className="btn btn-ghost"
            onClick={testPreview}
            disabled={testing}
            style={{ width: "100%", justifyContent: "center" }}
          >
            {testing ? "Gerando preview…" : "▶ Gerar preview com esta velocidade"}
          </button>

          {/* Pontuação tip */}
          <div style={{ marginTop: 24 }}>
            <div className="label">Dicas de pontuação para pausas naturais</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { symbol: ".", tip: "Pausa longa — use para separar ideias principais" },
                { symbol: ",", tip: "Pausa média — use para listar ou complementar" },
                { symbol: "…", tip: "Pausa dramática — use para criar tensão" },
                { symbol: "!", tip: "Ênfase — mas use com moderação" },
              ].map(({ symbol, tip }) => (
                <div key={symbol} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <code style={{
                    fontFamily: "monospace", fontSize: 15, fontWeight: 700,
                    color: "#60a5fa", background: "rgba(59,130,246,0.1)",
                    padding: "0 6px", borderRadius: 4, flexShrink: 0, lineHeight: 1.8,
                  }}>{symbol}</code>
                  <span style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>{tip}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
