"use client";
import React, { useEffect, useState, useCallback, use, useRef } from "react";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy,
  useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { apiGet, apiPut } from "../../lib/api";
import Link from "next/link";

// ── Constantes ─────────────────────────────────────────────────────────────────
const SCRIPTS = [
  { key: "score_0_20",   label: "Reativa",             pts: "0–20 pts",   color: "#EF4444" },
  { key: "score_21_40",  label: "Instável",             pts: "21–40 pts",  color: "#F97316" },
  { key: "score_41_60",  label: "Em Construção",        pts: "41–60 pts",  color: "#EAB308" },
  { key: "score_61_80",  label: "Estruturada",          pts: "61–80 pts",  color: "#22C55E" },
  { key: "score_81_100", label: "Alta Performance",     pts: "81–100 pts", color: "#2DCCD3" },
];

const JINJA_VARS = [
  { key: "nome", desc: "Ex: João Silva" },
  { key: "empresa", desc: "Ex: Acme Corp" },
  { key: "cargo", desc: "Ex: CEO" },
  { key: "score", desc: "Ex: 72" },
  { key: "nivel", desc: "Ex: Estruturada" },
  { key: "colaboradores", desc: "Ex: 26 a 50" },
  { key: "plano", desc: "Ex: C8 Pro" },
  { key: "preco", desc: "Ex: R$ 497" },
  { key: "proximo_marco", desc: "Ex: 90 dias" },
];

const VOICE_MODELS = [
  { value: "pt_BR-faber-medium", label: "Faber (Padrão)" },
  { value: "pt_BR-edresson-low", label: "Edresson" },
  { value: "pt_BR-razo-medium",  label: "Razo" },
];

interface Slide { num: number; type: "static" | "dynamic"; duration: number | null; }
interface Template { filename: string; content: string; }

// ── Sortable Slide Card (barra lateral esquerda) ───────────────────────────────
function SortableSlideCard({
  slide, isSelected, onClick, template, funnelId,
}: {
  slide: Slide; isSelected: boolean; onClick: () => void;
  template?: Template; funnelId: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: slide.num });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
  const isDyn = slide.type === "dynamic";

  return (
    <div ref={setNodeRef} style={style}>
      <div
        onClick={onClick}
        style={{
          background: isSelected ? "rgba(232,119,34,0.08)" : "rgba(255,255,255,0.03)",
          border: `1px solid ${isSelected ? "rgba(232,119,34,0.4)" : "rgba(255,255,255,0.07)"}`,
          borderRadius: 8, overflow: "hidden", cursor: "pointer",
          transition: "all 0.15s",
          boxShadow: isSelected ? "0 0 0 1px rgba(232,119,34,0.2)" : "none",
        }}
      >
        {/* Drag handle + info */}
        <div
          {...attributes} {...listeners}
          style={{
            padding: "8px 10px", display: "flex", alignItems: "center", gap: 8,
            borderBottom: "1px solid rgba(255,255,255,0.05)",
            background: isSelected ? "rgba(232,119,34,0.05)" : "transparent",
            cursor: "grab",
          }}
        >
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", lineHeight: 1 }}>⣿</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: isSelected ? "#E87722" : "#E5E7EB", flex: 1 }}>
            Slide {slide.num}
          </span>
          <span style={{
            fontSize: 9, fontWeight: 800, padding: "2px 5px", borderRadius: 4,
            background: isDyn ? "rgba(45,204,211,0.12)" : "rgba(255,255,255,0.06)",
            color: isDyn ? "#2DCCD3" : "rgba(255,255,255,0.3)",
            border: `1px solid ${isDyn ? "rgba(45,204,211,0.25)" : "rgba(255,255,255,0.1)"}`,
          }}>
            {isDyn ? "DIN" : "EST"}
          </span>
        </div>

        {/* Thumbnail */}
        <div style={{ height: 60, background: "#000", position: "relative", overflow: "hidden" }}>
          {template?.content ? (
            <iframe
              srcDoc={template.content}
              style={{ width: 1920, height: 1080, transform: "scale(0.0625)", transformOrigin: "top left",
                border: "none", pointerEvents: "none", position: "absolute", top: 0, left: 0 }}
            />
          ) : (
            <img
              src={`/api/vs/funnels/${funnelId}/static/slide_${String(slide.num).padStart(2, "0")}.png`}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0"; }}
            />
          )}
          {!template?.content && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 9, color: "rgba(255,255,255,0.15)" }}>sem template HTML</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Página Principal ───────────────────────────────────────────────────────────
export default function RoteiroPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: funnelId } = use(params);

  const [funnelName, setFunnelName] = useState("");
  const [order, setOrder]           = useState<number[]>([]);
  const [slides, setSlides]         = useState<Slide[]>([]);
  const [templates, setTemplates]   = useState<Template[]>([]);
  const [selectedNum, setSelectedNum] = useState<number | null>(null);

  // Script state
  const [activeKey, setActiveKey]   = useState("score_61_80");
  const [scriptBlocks, setScriptBlocks] = useState<Record<number, string>>({});
  const [origBlocks, setOrigBlocks]     = useState<Record<number, string>>({});
  const [loadingScript, setLoadingScript] = useState(false);

  // Voice state
  const [voiceSpeed, setVoiceSpeed]   = useState(1.0);
  const [voiceModel, setVoiceModel]   = useState("pt_BR-faber-medium");
  const [savingVoice, setSavingVoice] = useState(false);

  // Audio preview state
  const [playingSlide, setPlayingSlide] = useState<number | null>(null);
  const [audioUrl, setAudioUrl]         = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Save state
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  // Autocomplete
  const [autocomplete, setAutocomplete] = useState({ visible: false, filter: "" });
  const scriptRef = useRef<HTMLTextAreaElement | null>(null);

  const sensors = useSensors(useSensor(PointerSensor));

  // ── Load ────────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    try {
      const [slideData, tList, voiceCfg] = await Promise.all([
        apiGet(`/api/config/funnels/${funnelId}/slides`),
        apiGet(`/api/config/funnels/${funnelId}/templates`),
        apiGet(`/api/config/funnels/${funnelId}/voice`).catch(() => null),
      ]);

      setFunnelName(slideData.name || funnelId);
      setOrder(slideData.order || []);
      setSlides(slideData.slides || []);
      setTemplates(tList || []);
      if (voiceCfg) {
        setVoiceSpeed(voiceCfg.speed ?? 1.0);
        setVoiceModel(voiceCfg.model ?? "pt_BR-faber-medium");
      }

      const firstNum = (slideData.order || [])[0] ?? null;
      setSelectedNum(firstNum);
    } catch (e) { console.error(e); }
  }, [funnelId]);

  const loadScript = useCallback(async (key: string) => {
    setLoadingScript(true);
    try {
      const d = await apiGet(`/api/config/funnels/${funnelId}/scripts/${key}`);
      let parsed: Record<number, string> = {};
      try { parsed = JSON.parse(d.text); } catch {
        if (d.text?.trim()) parsed = { 1: d.text };
      }
      setScriptBlocks(parsed);
      setOrigBlocks(parsed);
    } finally { setLoadingScript(false); }
  }, [funnelId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadScript(activeKey); }, [activeKey, loadScript]);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const getTemplate = (num: number) =>
    templates.find(t => {
      const n = parseInt(t.filename.replace("slide_", "").split("_")[0].replace(".html", ""));
      return n === num;
    });

  const orderedSlides = order.map(n => slides.find(s => s.num === n)).filter(Boolean) as Slide[];
  const selectedSlide = slides.find(s => s.num === selectedNum);
  const selectedTemplate = selectedNum != null ? getTemplate(selectedNum) : undefined;

  // Script do slide selecionado
  const selectedScript = selectedNum != null ? (scriptBlocks[selectedNum] ?? "") : "";
  const isChanged = JSON.stringify(scriptBlocks) !== JSON.stringify(origBlocks);

  // ── Drag & Drop ─────────────────────────────────────────────────────────────
  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (over && active.id !== over.id) {
      const oldIdx = order.indexOf(Number(active.id));
      const newIdx = order.indexOf(Number(over.id));
      setOrder(prev => arrayMove(prev, oldIdx, newIdx));
    }
  };

  // ── Autocomplete ────────────────────────────────────────────────────────────
  const handleScriptChange = (val: string) => {
    if (selectedNum == null) return;
    setScriptBlocks(prev => ({ ...prev, [selectedNum]: val }));
    const pos = scriptRef.current?.selectionStart ?? val.length;
    const match = val.slice(0, pos).match(/\{\{(\w*)$/);
    if (match) setAutocomplete({ visible: true, filter: match[1] });
    else setAutocomplete({ visible: false, filter: "" });
  };

  const insertVar = (key: string) => {
    if (selectedNum == null) return;
    const tx = scriptRef.current;
    const pos = tx?.selectionStart ?? selectedScript.length;
    const cleaned = selectedScript.slice(0, pos).replace(/\{\{\w*$/, "");
    const after = selectedScript.slice(pos);
    setScriptBlocks(prev => ({ ...prev, [selectedNum]: `${cleaned}{{ ${key} }}${after}` }));
    setAutocomplete({ visible: false, filter: "" });
  };

  // ── Audio Preview ───────────────────────────────────────────────────────────
  const playAudio = async (slideNum: number) => {
    const text = scriptBlocks[slideNum] ?? "";
    if (!text.trim()) return alert("Escreva algo no roteiro deste slide primeiro.");
    setPlayingSlide(slideNum);
    setAudioUrl(null);
    try {
      const res = await fetch("/api/vs/api/config/preview-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-editor-key": "c8club-editor-2026" },
        body: JSON.stringify({
          funnel_id: funnelId,
          script_key: activeKey,
          script_override: text,
          voice: { speed: voiceSpeed, model: voiceModel, speaker: 0 },
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      setAudioUrl(url);
      setTimeout(() => audioRef.current?.play(), 100);
    } catch (e: any) {
      alert("Erro ao gerar áudio: " + e.message);
    } finally {
      setPlayingSlide(null);
    }
  };

  // ── Salvar Roteiro ──────────────────────────────────────────────────────────
  const save = async () => {
    setSaving(true);
    const durations: Record<string, number> = {};
    slides.forEach(s => { if (s.duration != null) durations[String(s.num)] = s.duration; });
    try {
      await apiPut(`/api/config/funnels/${funnelId}/slides`, { order, durations });
      await apiPut(`/api/config/funnels/${funnelId}/scripts/${activeKey}`, {
        text: JSON.stringify(scriptBlocks, null, 2),
      });
      setOrigBlocks({ ...scriptBlocks });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally { setSaving(false); }
  };

  // ── Salvar Configuração de Voz ──────────────────────────────────────────────
  const saveVoice = async () => {
    setSavingVoice(true);
    try {
      await apiPut(`/api/config/funnels/${funnelId}/voice`, { speed: voiceSpeed, model: voiceModel, speaker: 0 });
      alert("✅ Voz salva!");
    } finally { setSavingVoice(false); }
  };

  // ── Adicionar slide ─────────────────────────────────────────────────────────
  const addSlide = async () => {
    const nextNum = order.length > 0 ? Math.max(...order) + 1 : 1;
    const newOrder = [...order, nextNum];
    await apiPut(`/api/config/funnels/${funnelId}/slides`, { order: newOrder, durations: {} });
    setOrder(newOrder);
    setSlides(prev => [...prev, { num: nextNum, type: "dynamic", duration: null }]);
    setSelectedNum(nextNum);
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  const accent = "#E87722";

  return (
    <div style={{
      height: "calc(100vh - 64px)", display: "flex", flexDirection: "column",
      background: "#0E0F14", color: "#E5E7EB", fontFamily: "'Inter','Unitea Sans',sans-serif", overflow: "hidden",
    }}>

      {/* ── HEADER ── */}
      <div style={{
        padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "linear-gradient(90deg,#000D24,#00205B)",
        display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {/* C8 Logo */}
          <svg width="24" height="16" viewBox="0 0 28 20" fill="none">
            <path d="M8.4 0C3.76 0 0 3.58 0 8s3.76 8 8.4 8c2.52 0 4.76-1.04 6.3-2.7l-2.52-2.24C11.28 12 9.92 12.6 8.4 12.6c-2.8 0-5.04-2.06-5.04-4.6S5.6 3.4 8.4 3.4c1.52 0 2.88.6 3.78 1.56l2.52-2.26C13.16 1.04 10.92 0 8.4 0Z" fill="#E87722" />
            <path d="M19.6 0c-2.52 0-4.76 1.04-6.3 2.7l2.52 2.24C16.72 4 18.08 3.4 19.6 3.4c2.8 0 5.04 2.06 5.04 4.6s-2.24 4.6-5.04 4.6c-1.52 0-2.88-.6-3.78-1.56l-2.52 2.26C14.84 14.96 17.08 16 19.6 16 24.24 16 28 12.42 28 8s-3.76-8-8.4-8Z" fill="#FEFEFB" />
          </svg>
          <div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase" }}>
              Funil
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#FEFEFB", letterSpacing: "-0.3px" }}>
              🎬 {funnelName || funnelId}
            </div>
          </div>
        </div>

        {/* Seletor de variante de score */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>Variante:</span>
          <select value={activeKey} onChange={e => setActiveKey(e.target.value)}
            style={{ background: "#1E2130", color: "#E5E7EB", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, padding: "6px 10px", fontSize: 13, fontWeight: 600 }}>
            {SCRIPTS.map(s => (
              <option key={s.key} value={s.key}>{s.label} ({s.pts})</option>
            ))}
          </select>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: SCRIPTS.find(s => s.key === activeKey)?.color ?? "#888", flexShrink: 0 }} />
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          {isChanged && <span style={{ fontSize: 11, color: "#FBBF24", alignSelf: "center" }}>⚠ Não salvo</span>}
          {saved    && <span style={{ fontSize: 11, color: "#10B981", alignSelf: "center" }}>✓ Salvo!</span>}
          <button onClick={save} disabled={saving}
            style={{ background: "linear-gradient(135deg,#E87722,#D96B10)", color: "#FFF", border: "none", padding: "7px 18px", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 13, boxShadow: "0 4px 12px rgba(232,119,34,0.3)" }}>
            {saving ? "Salvando…" : "💾 Salvar Roteiro"}
          </button>
        </div>
      </div>

      {/* ── CORPO: 3 colunas ── */}
      <div style={{ flex: 1, display: "flex", minHeight: 0, overflow: "hidden" }}>

        {/* ─── COL 1: Timeline de Slides ─── */}
        <div style={{
          width: 190, flexShrink: 0, background: "#12141C",
          borderRight: "1px solid rgba(255,255,255,0.06)",
          display: "flex", flexDirection: "column",
        }}>
          <div style={{ padding: "10px 10px 6px", flexShrink: 0, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: 8 }}>
              Timeline · {order.length} slides
            </div>
            <button onClick={addSlide}
              style={{ width: "100%", padding: "6px", background: "rgba(232,119,34,0.07)", border: "1px dashed rgba(232,119,34,0.3)", color: "#E87722", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 11 }}>
              + Novo Slide
            </button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={order} strategy={verticalListSortingStrategy}>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {orderedSlides.map(slide => (
                    <SortableSlideCard
                      key={slide.num} slide={slide}
                      isSelected={selectedNum === slide.num}
                      onClick={() => setSelectedNum(slide.num)}
                      template={getTemplate(slide.num)}
                      funnelId={funnelId}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        </div>

        {/* ─── COL 2: Preview do Slide + Roteiro ─── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
          {selectedNum == null ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.2)", fontSize: 14 }}>
              Selecione um slide na timeline para editar seu roteiro.
            </div>
          ) : (
            <>
              {/* Preview */}
              <div style={{
                height: 240, flexShrink: 0, background: "#000",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                position: "relative", overflow: "hidden",
              }}>
                {selectedTemplate?.content ? (
                  <iframe
                    srcDoc={selectedTemplate.content}
                    style={{ width: 1920, height: 1080, transform: `scale(${240 / 1080})`, transformOrigin: "top left",
                      border: "none", pointerEvents: "none", position: "absolute", top: 0, left: 0 }}
                  />
                ) : (
                  <img
                    src={`/api/vs/funnels/${funnelId}/static/slide_${String(selectedNum).padStart(2, "0")}.png`}
                    style={{ width: "100%", height: "100%", objectFit: "contain" }}
                    onError={e => { (e.target as HTMLImageElement).style.opacity = "0"; }}
                  />
                )}
                {/* Overlay info */}
                <div style={{
                  position: "absolute", top: 10, left: 10,
                  background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)",
                  borderRadius: 6, padding: "4px 10px",
                  display: "flex", alignItems: "center", gap: 8,
                }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#E87722" }}>Slide {selectedNum}</span>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>1920 × 1080</span>
                </div>
                {/* Abrir no Studio */}
                <div style={{ position: "absolute", top: 10, right: 10 }}>
                  <Link href={`/studio/${funnelId}?slideNum=${selectedNum}`}
                    style={{
                      background: "rgba(232,119,34,0.85)", color: "#FFF",
                      padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 700,
                      textDecoration: "none", display: "flex", alignItems: "center", gap: 5,
                    }}>
                    ✏ Abrir no C8 Studio
                  </Link>
                </div>
              </div>

              {/* Editor de Roteiro */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", padding: "14px 16px", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.6)" }}>
                    📝 Narração — Slide {selectedNum} · Variante "{SCRIPTS.find(s => s.key === activeKey)?.label}"
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      onClick={() => playAudio(selectedNum)}
                      disabled={playingSlide === selectedNum}
                      style={{
                        background: playingSlide === selectedNum ? "rgba(255,255,255,0.07)" : "rgba(45,204,211,0.12)",
                        color: playingSlide === selectedNum ? "rgba(255,255,255,0.3)" : "#2DCCD3",
                        border: "1px solid rgba(45,204,211,0.25)", borderRadius: 6,
                        padding: "5px 12px", cursor: "pointer", fontWeight: 700, fontSize: 12,
                        display: "flex", alignItems: "center", gap: 5,
                      }}>
                      {playingSlide === selectedNum ? "⏳ Gerando…" : "▶ Ouvir TTS"}
                    </button>
                  </div>
                </div>

                {/* Autocomplete popup */}
                <div style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
                  {autocomplete.visible && (
                    <div style={{
                      position: "absolute", bottom: "calc(100% + 4px)", left: 0, right: 0, zIndex: 50,
                      background: "#1E2130", border: "1px solid rgba(232,119,34,0.35)",
                      borderRadius: 8, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                    }}>
                      <div style={{ padding: "5px 10px", fontSize: 10, color: "rgba(255,255,255,0.25)", borderBottom: "1px solid rgba(255,255,255,0.05)", fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase" }}>
                        Variáveis Jinja
                      </div>
                      {JINJA_VARS.filter(v => v.key.startsWith(autocomplete.filter)).map(v => (
                        <div key={v.key} onClick={() => insertVar(v.key)}
                          style={{ padding: "7px 10px", cursor: "pointer", display: "flex", gap: 10 }}
                          onMouseEnter={e => e.currentTarget.style.background = "rgba(232,119,34,0.1)"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                          <code style={{ color: "#E87722", fontSize: 12, fontFamily: "monospace", fontWeight: 700 }}>
                            {"{{ " + v.key + " }}"}
                          </code>
                          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, alignSelf: "center" }}>{v.desc}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <textarea
                    ref={scriptRef}
                    value={selectedScript}
                    onChange={e => handleScriptChange(e.target.value)}
                    onBlur={() => setTimeout(() => setAutocomplete({ visible: false, filter: "" }), 150)}
                    placeholder={"Escreva a narração deste slide...\nDica: digite {{ para inserir variáveis dinâmicas."}
                    style={{
                      flex: 1, width: "100%", minHeight: 120,
                      background: "rgba(255,255,255,0.03)", color: "#F9FAFB",
                      border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8,
                      padding: 12, fontFamily: "'Inter',sans-serif", fontSize: 14, lineHeight: 1.7,
                      resize: "none", boxSizing: "border-box", outline: "none",
                    }}
                  />
                </div>

                {/* Player de áudio */}
                {audioUrl && (
                  <div style={{ flexShrink: 0, background: "rgba(45,204,211,0.06)", border: "1px solid rgba(45,204,211,0.15)", borderRadius: 8, padding: "8px 12px" }}>
                    <div style={{ fontSize: 11, color: "#2DCCD3", fontWeight: 600, marginBottom: 6 }}>🎙 Preview de Áudio — Slide {selectedNum}</div>
                    <audio ref={audioRef} controls src={audioUrl} style={{ width: "100%", height: 32 }} />
                  </div>
                )}

                {/* Contagem de chars */}
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", flexShrink: 0 }}>
                  {selectedScript.length} caracteres neste slide ·{" "}
                  {Object.values(scriptBlocks).reduce((a, b) => a + (b?.length ?? 0), 0)} total
                </div>
              </div>
            </>
          )}
        </div>

        {/* ─── COL 3: Configurações ─── */}
        <div style={{
          width: 260, flexShrink: 0, background: "#12141C",
          borderLeft: "1px solid rgba(255,255,255,0.06)",
          display: "flex", flexDirection: "column", overflowY: "auto",
        }}>
          <div style={{ padding: 14 }}>

            {/* Slide config */}
            {selectedSlide && (
              <>
                <SectionHdr color="#2DCCD3" label="Slide Selecionado" />
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: 12, marginBottom: 14 }}>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 6 }}>Conteúdo</div>
                  <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.05)", padding: 3, borderRadius: 6, marginBottom: 10 }}>
                    {[{ v: "dynamic", l: "⚡ Dinâmico", c: "#2DCCD3" }, { v: "static", l: "📌 Estático", c: accent }].map(opt => (
                      <button key={opt.v}
                        onClick={() => setSlides(prev => prev.map(s => s.num === selectedNum ? { ...s, type: opt.v as any } : s))}
                        style={{ flex: 1, padding: "6px", background: selectedSlide.type === opt.v ? opt.c : "transparent", color: selectedSlide.type === opt.v ? (opt.v === "dynamic" ? "#0A0B10" : "#FFF") : "rgba(255,255,255,0.4)", border: "none", borderRadius: 4, cursor: "pointer", fontWeight: 700, fontSize: 11 }}>
                        {opt.l}
                      </button>
                    ))}
                  </div>

                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 6 }}>Duração</div>
                  <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.05)", padding: 3, borderRadius: 6, marginBottom: 6 }}>
                    {[{ v: null, l: "🎙 Áudio" }, { v: 5, l: "⏱ Manual" }].map(opt => (
                      <button key={String(opt.v)}
                        onClick={() => setSlides(prev => prev.map(s => s.num === selectedNum ? { ...s, duration: opt.v } : s))}
                        style={{ flex: 1, padding: "6px", background: (selectedSlide.duration == null) === (opt.v == null) ? "#4A90D9" : "transparent", color: (selectedSlide.duration == null) === (opt.v == null) ? "#FFF" : "rgba(255,255,255,0.4)", border: "none", borderRadius: 4, cursor: "pointer", fontWeight: 700, fontSize: 11 }}>
                        {opt.l}
                      </button>
                    ))}
                  </div>
                  {selectedSlide.duration != null && (
                    <>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginBottom: 4 }}>Duração: {selectedSlide.duration}s</div>
                      <input type="range" min={0.5} max={30} step={0.5} value={selectedSlide.duration ?? 5}
                        onChange={e => setSlides(prev => prev.map(s => s.num === selectedNum ? { ...s, duration: parseFloat(e.target.value) } : s))}
                        style={{ width: "100%", accentColor: accent }} />
                    </>
                  )}
                </div>

                {/* Link pro Studio */}
                <Link href={`/studio/${funnelId}?slideNum=${selectedNum}`}
                  style={{ display: "block", textAlign: "center", padding: "9px", background: "rgba(232,119,34,0.08)", border: "1px solid rgba(232,119,34,0.2)", color: accent, borderRadius: 7, fontWeight: 700, fontSize: 13, textDecoration: "none", marginBottom: 18 }}>
                  ✏ Abrir no C8 Studio →
                </Link>

                <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", marginBottom: 16 }} />
              </>
            )}

            {/* Variáveis rápidas */}
            <SectionHdr color="#FFCD00" label="Variáveis Disponíveis" />
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 16 }}>
              {JINJA_VARS.map(v => (
                <code key={v.key}
                  onClick={() => insertVar(v.key)}
                  title="Clique para inserir"
                  style={{ fontSize: 11, color: "#E87722", background: "rgba(232,119,34,0.07)", borderRadius: 4, padding: "3px 7px", cursor: "pointer", fontFamily: "monospace", display: "block" }}>
                  {"{{ " + v.key + " }}"} <span style={{ color: "rgba(255,255,255,0.2)", fontFamily: "sans-serif", fontSize: 10 }}>{v.desc}</span>
                </code>
              ))}
            </div>

            <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", marginBottom: 16 }} />

            {/* Configuração de Voz */}
            <SectionHdr color="#4A90D9" label="Voz do Funil" />
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontWeight: 600, marginBottom: 4 }}>MODELO</div>
              <select value={voiceModel} onChange={e => setVoiceModel(e.target.value)}
                style={{ width: "100%", background: "rgba(255,255,255,0.05)", color: "#E5E7EB", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "6px 8px", fontSize: 12 }}>
                {VOICE_MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontWeight: 600, marginBottom: 4 }}>VELOCIDADE: {voiceSpeed.toFixed(2)}×</div>
              <input type="range" min={0.5} max={2.0} step={0.05} value={voiceSpeed}
                onChange={e => setVoiceSpeed(parseFloat(e.target.value))}
                style={{ width: "100%", accentColor: "#4A90D9" }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "rgba(255,255,255,0.2)", marginTop: 2 }}>
                <span>Devagar 0.5×</span><span>Normal 1.0×</span><span>Rápido 2.0×</span>
              </div>
            </div>
            <button onClick={saveVoice} disabled={savingVoice}
              style={{ width: "100%", padding: "7px", background: "rgba(74,144,217,0.12)", color: "#4A90D9", border: "1px solid rgba(74,144,217,0.25)", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 12, marginBottom: 8 }}>
              {savingVoice ? "Salvando…" : "💾 Salvar Voz"}
            </button>

          </div>
        </div>
      </div>
    </div>
  );
}

// ── Micro UI ───────────────────────────────────────────────────────────────────
function SectionHdr({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
      <div style={{ width: 3, height: 13, background: color, borderRadius: 3 }} />
      <span style={{ fontSize: 12, fontWeight: 700, color: "#F9FAFB" }}>{label}</span>
    </div>
  );
}
