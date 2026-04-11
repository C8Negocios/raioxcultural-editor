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

interface Slide { num: number; type: "static" | "dynamic"; duration: number | null; }

export default function ScriptsPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const funnelId = unwrappedParams.id;
  const [activeKey, setActiveKey] = useState("score_61_80");
  
  // Array of funnel slides to dynamically render editors
  const [slides, setSlides] = useState<Slide[]>([]);
  const [htmls, setHtmls] = useState<Record<number, string>>({});
  
  // The structured mapping of slide_num -> text
  const [scriptBlocks, setScriptBlocks] = useState<Record<number, string>>({});
  const [originalScriptBlocks, setOriginalScriptBlocks] = useState<Record<number, string>>({});
  
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load funnel structure first (slides array)
  const loadSlides = useCallback(async () => {
    try {
      const resp = await apiGet(`/api/config/funnels/${funnelId}/slides`);
      setSlides(resp.slides || []);
      // Pre-fetch dynamic HTML contents for previews
      resp.slides.forEach(async (s: Slide) => {
        if (s.type === "dynamic") {
          try {
            const h = await apiGet(`/api/config/funnels/${funnelId}/slides/${s.num}`);
            setHtmls(prev => ({ ...prev, [s.num]: h.html }));
          } catch {}
        }
      });
    } catch {}
  }, [funnelId]);

  const loadScript = useCallback(async (key: string) => {
    setLoading(true);
    setSaved(false);
    try {
      const d = await apiGet(`/api/config/funnels/${funnelId}/scripts/${key}`);
      let parsed: Record<number, string> = {};
      try {
        // Try parsing as exact JSON blocks
        parsed = JSON.parse(d.text);
      } catch {
        // Legacy fallback: put all text in slide 1
        if (d.text.trim()) {
           parsed = { 1: d.text };
        }
      }
      setScriptBlocks(parsed);
      setOriginalScriptBlocks(parsed);
    } catch (e) {
      setScriptBlocks({});
      setOriginalScriptBlocks({});
    } finally { setLoading(false); }
  }, [funnelId]);

  useEffect(() => {
    loadSlides();
    const p = new URLSearchParams(window.location.search).get("key");
    const k = SCRIPTS.find(s => s.key === p) ? p! : "score_61_80";
    setActiveKey(k);
    loadScript(k);
  }, [loadSlides, loadScript]);

  const save = async () => {
    setSaving(true);
    try {
      // Stringify the structured mapping so the backend saves it blindly into .txt
      const payloadText = JSON.stringify(scriptBlocks, null, 2);
      await apiPut(`/api/config/funnels/${funnelId}/scripts/${activeKey}`, { text: payloadText });
      setOriginalScriptBlocks({...scriptBlocks}); 
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally { setSaving(false); }
  };

  const handleBlockChange = (num: number, val: string | undefined) => {
    setScriptBlocks(prev => ({ ...prev, [num]: val || "" }));
    setSaved(false);
  };

  const isChanged = JSON.stringify(scriptBlocks) !== JSON.stringify(originalScriptBlocks);
  const totalChars = Object.values(scriptBlocks).reduce((acc, curr) => acc + (curr?.length || 0), 0);

  return (
    <div className="animate-in" style={{ display: "flex", flexDirection: "column", gap: 0, height: "calc(100vh - 64px)" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800 }}>✍ Editor de Roteiros Interligado</h1>
        <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>
          Página dinâmica ligada exatamente aos seus Slides. Cada bloco corresponderá estritamente a um e garantirá que o corte e sincronia fiquem impecáveis.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 16, flex: 1, minHeight: 0 }}>
        {/* Script selector */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, overflowY: "auto" }}>
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

        {/* Editor Area */}
        <div className="card" style={{ display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
          {/* Toolbar */}
          <div style={{
            padding: "12px 16px",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex", alignItems: "center", gap: 12,
            background: "var(--bg-elevated)",
            zIndex: 10
          }}>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                {SCRIPTS.find(s => s.key === activeKey)?.label}
              </span>
              <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 12 }}>
                {totalChars.toLocaleString()} caracteres
              </span>
            </div>
            {isChanged && (
              <span style={{ fontSize: 12, color: "var(--amber)" }}>⚠ Alterações não salvas</span>
            )}
            {saved && (
              <span style={{ fontSize: 12, color: "var(--emerald)" }}>✓ Salvo com sucesso!</span>
            )}
            <button
              className="btn btn-primary"
              onClick={save}
              disabled={saving || !isChanged}
              style={{ opacity: saving || !isChanged ? 0.5 : 1 }}
            >
              {saving ? "Salvando…" : "Salvar Blocos"}
            </button>
          </div>

          {/* Blocks container */}
          <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "24px 16px", background: "#0a0a0c" }}>
            {loading ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted)" }}>
                Carregando Blocos do Banco...
              </div>
            ) : slides.length === 0 ? (
               <div style={{ textAlign: "center", color: "var(--text-muted)", marginTop: 40 }}>
                 Nenhum slide encontrado na página de Slides para este funil. 
                 <br/><br/>Monte a estrutura na página "Slides" primeiro!
               </div>
            ) : (
               <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
                 {slides.map(slide => {
                   const html = htmls[slide.num];
                   const textVal = scriptBlocks[slide.num] || "";

                   return (
                     <div key={slide.num} style={{ 
                       display: "flex", gap: 16, 
                       background: "var(--bg-card)", borderRadius: "var(--radius-lg)", 
                       border: "1px solid var(--border-subtle)", overflow: "hidden",
                       boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
                     }}>
                        {/* Slide Preview Column */}
                        <div style={{ width: 220, borderRight: "1px solid var(--border-subtle)", background: "var(--bg-elevated)", display: "flex", flexDirection: "column" }}>
                           <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                             <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>Slide {slide.num}</span>
                             <span className={`badge ${slide.type === "dynamic" ? "badge-blue" : "badge-violet"}`} style={{ fontSize: 9 }}>
                               {slide.type === "dynamic" ? "Dinâmico" : "Estático"}
                             </span>
                           </div>
                           <div style={{ height: 124, width: "100%", position: "relative", background: "#000", overflow: "hidden" }}>
                              {slide.type === "dynamic" && html ? (
                                <iframe 
                                   srcDoc={html} 
                                   style={{ width: '1920px', height: '1080px', transform: 'scale(0.1145)', transformOrigin: 'top left', border: 'none', pointerEvents: 'none', position: 'absolute', top: 0, left: 0 }} 
                                />
                              ) : (
                                <img 
                                   src={`/api/vs/funnels/${funnelId}/static/slide_${String(slide.num).padStart(2, '0')}.png`} 
                                   style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                   onError={(e) => { 
                                     (e.target as HTMLImageElement).src = `/api/vs/funnels/${funnelId}/static/slide_${String(slide.num).padStart(2, '0')}.jpg`;
                                     (e.target as HTMLImageElement).onerror = () => {
                                       (e.target as HTMLImageElement).src = `/api/vs/static-slides/slide_${String(slide.num).padStart(2, '0')}.jpg`;
                                       (e.target as HTMLImageElement).onerror = () => { (e.currentTarget as HTMLImageElement).style.opacity='0'; };
                                     };
                                   }} 
                                />
                              )}
                           </div>
                           <div style={{ padding: "8px 12px", fontSize: 10, color: "var(--text-muted)" }}>
                             {textVal.length} caracteres
                           </div>
                        </div>

                        {/* Editor Column */}
                        <div style={{ flex: 1, padding: 8, height: 180 }}>
                          <MonacoEditor
                            height="100%"
                            language="plaintext"
                            theme="vs-dark"
                            value={textVal}
                            onChange={(val) => handleBlockChange(slide.num, val)}
                            options={{
                              fontSize: 14,
                              lineHeight: 1.6,
                              wordWrap: "on",
                              minimap: { enabled: false },
                              scrollBeyondLastLine: false,
                              overviewRulerLanes: 0,
                              hideCursorInOverviewRuler: true,
                              scrollbar: { vertical: "hidden", horizontal: "hidden" },
                              padding: { top: 8, bottom: 8 },
                              fontFamily: "'Inter', sans-serif",
                              renderLineHighlight: "none",
                              bracketPairColorization: { enabled: true },
                            }}
                          />
                        </div>
                     </div>
                   );
                 })}
               </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
