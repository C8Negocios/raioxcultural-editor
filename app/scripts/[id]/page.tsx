"use client";
import React, { useEffect, useState, useCallback, use } from "react";
import dynamic from "next/dynamic";
import { apiGet, apiPut, SCORE_COLORS } from "../../lib/api";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

const SCRIPTS = [
  { key: "score_0_20",   label: "Cultura Reativa",             pts: "0–20 pts"    },
  { key: "score_21_40",  label: "Cultura Instável",            pts: "21–40 pts"   },
  { key: "score_41_60",  label: "Cultura em Construção",       pts: "41–60 pts"   },
  { key: "score_61_80",  label: "Cultura Estruturada",         pts: "61–80 pts"   },
  { key: "score_81_100", label: "Cultura de Alta Performance", pts: "81–100 pts"  },
];

const VARS = ["nome","empresa","cargo","score","nivel","colaboradores","plano","preco","proximo_marco"];

export default function ScriptsPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const funnelId = unwrappedParams.id;
  const [activeKey, setActiveKey] = useState("score_61_80");
  const [text, setText] = useState("");
  const [original, setOriginal] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [charCount, setCharCount] = useState(0);

  const loadScript = useCallback(async (key: string) => {
    setLoading(true);
    setSaved(false);
    try {
      const d = await apiGet(`/api/config/funnels/${funnelId}/scripts/${key}`);
      setText(d.text); setOriginal(d.text); setCharCount(d.text.length);
    } catch (e) {
      setText(`// Erro ao carregar: ${e}`);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    // Check URL param
    const p = new URLSearchParams(window.location.search).get("key");
    const k = SCRIPTS.find(s => s.key === p) ? p! : "score_61_80";
    setActiveKey(k);
    loadScript(k);
  }, [loadScript]);

  const save = async () => {
    setSaving(true);
    try {
      await apiPut(`/api/config/funnels/${funnelId}/scripts/${activeKey}`, { text });
      setOriginal(text); setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally { setSaving(false); }
  };

  const handleChange = (val: string | undefined) => {
    const v = val || "";
    setText(v); setCharCount(v.length); setSaved(false);
  };

  const changed = text !== original;

  return (
    <div className="animate-in" style={{ display: "flex", flexDirection: "column", gap: 0, height: "calc(100vh - 64px)" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800 }}>✍ Editor de Roteiros</h1>
        <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>
          Edite o texto narrado por faixa de score. Use <code style={{ background: "var(--bg-elevated)", padding: "1px 6px", borderRadius: 4, color: "#60a5fa", fontSize: 12 }}>{"{variavel}"}</code> para personalização dinâmica.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 16, flex: 1, minHeight: 0 }}>
        {/* Script selector */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {SCRIPTS.map(s => (
            <button
              key={s.key}
              onClick={() => { setActiveKey(s.key); loadScript(s.key); }}
              style={{
                background: activeKey === s.key ? "var(--bg-hover)" : "transparent",
                border: `1px solid ${activeKey === s.key ? SCORE_COLORS[s.key] + "55" : "var(--border-subtle)"}`,
                borderRadius: "var(--radius-md)",
                padding: "12px 14px",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.15s",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: SCORE_COLORS[s.key], flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>{s.label}</span>
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", paddingLeft: 18 }}>{s.pts}</div>
            </button>
          ))}

          {/* Variables reference */}
          <div className="card" style={{ padding: 14, marginTop: 8 }}>
            <div className="label">Variáveis disponíveis</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {VARS.map(v => (
                <code key={v} style={{
                  fontSize: 11, color: "#60a5fa",
                  background: "rgba(59,130,246,0.08)",
                  borderRadius: 4, padding: "2px 6px",
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  {"{" + v + "}"}
                </code>
              ))}
            </div>
          </div>
        </div>

        {/* Editor */}
        <div className="card" style={{ display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
          {/* Toolbar */}
          <div style={{
            padding: "12px 16px",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                {SCRIPTS.find(s => s.key === activeKey)?.label}
              </span>
              <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 12 }}>
                {charCount.toLocaleString()} caracteres
              </span>
            </div>
            {changed && (
              <span style={{ fontSize: 12, color: "var(--amber)" }}>⚠ Alterações não salvas</span>
            )}
            {saved && (
              <span style={{ fontSize: 12, color: "var(--emerald)" }}>✓ Salvo com sucesso!</span>
            )}
            <button
              className="btn btn-primary"
              onClick={save}
              disabled={saving || !changed}
              style={{ opacity: saving || !changed ? 0.5 : 1 }}
            >
              {saving ? "Salvando…" : "Salvar"}
            </button>
          </div>

          {/* Monaco */}
          <div style={{ flex: 1, minHeight: 0 }}>
            {loading ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted)" }}>
                Carregando…
              </div>
            ) : (
              <MonacoEditor
                height="100%"
                language="plaintext"
                theme="vs-dark"
                value={text}
                onChange={handleChange}
                options={{
                  fontSize: 15,
                  lineHeight: 1.8,
                  wordWrap: "on",
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  padding: { top: 16, bottom: 16 },
                  fontFamily: "'Inter', sans-serif",
                  renderLineHighlight: "gutter",
                  bracketPairColorization: { enabled: true },
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
