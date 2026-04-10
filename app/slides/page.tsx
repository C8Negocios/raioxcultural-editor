"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, horizontalListSortingStrategy,
  useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Editor from "@monaco-editor/react";
import { apiGet, apiPut } from "../lib/api";

interface Slide { num: number; type: "static" | "dynamic"; duration: number | null; }
interface Template { filename: string; content: string; }

function SortableSlide({ slide, onDurChange }: { slide: Slide; onDurChange: (n: number, v: number | null) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: slide.num });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div style={{
        width: 140,
        background: "var(--bg-card)",
        border: `1px solid ${isDragging ? "var(--accent)" : "var(--border-subtle)"}`,
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
        userSelect: "none",
      }}>
        <div
          {...attributes} {...listeners}
          style={{
            padding: "10px 12px",
            background: "var(--bg-elevated)",
            cursor: "grab",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex", alignItems: "center", gap: 8,
          }}
        >
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>⣿</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
            Slide {slide.num}
          </span>
          <span className={`badge ${slide.type === "dynamic" ? "badge-blue" : "badge-violet"}`} style={{ marginLeft: "auto", fontSize: 9 }}>
            {slide.type === "dynamic" ? "Din" : "Est"}
          </span>
        </div>
        <div style={{ padding: "10px 12px" }}>
          <div className="label" style={{ marginBottom: 6 }}>Duração (s)</div>
          <input
            type="number"
            className="input"
            min="1" max="30" step="0.5"
            value={slide.duration ?? ""}
            placeholder="Auto"
            onChange={e => onDurChange(slide.num, e.target.value ? parseFloat(e.target.value) : null)}
            style={{ fontSize: 13, padding: "6px 10px", textAlign: "center" }}
            onPointerDown={e => e.stopPropagation()}
          />
          {!slide.duration && (
            <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4, textAlign: "center" }}>
              Auto (áudio ÷ slides)
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SlidesPage() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [order, setOrder] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Template Editor State
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [editorContent, setEditorContent] = useState<string>("");
  const [savingTemplate, setSavingTemplate] = useState(false);

  // File Upload State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [targetFilename, setTargetFilename] = useState<string>("slide_04.jpg");
  const [uploading, setUploading] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor));

  const load = useCallback(async () => {
    try {
      const d = await apiGet("/api/config/slides");
      setOrder(d.order);
      setSlides(d.slides);

      const t: Template[] = await apiGet("/api/config/templates");
      setTemplates(t);
      if (t.length > 0) {
        setSelectedTemplate(t[0].filename);
        setEditorContent(t[0].content);
      }
    } catch (e: any) {
      console.error(e);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (over && active.id !== over.id) {
      const oldIdx = order.indexOf(Number(active.id));
      const newIdx = order.indexOf(Number(over.id));
      setOrder(arrayMove(order, oldIdx, newIdx));
      setSaved(false);
    }
  };

  const handleDurChange = (num: number, val: number | null) => {
    setSlides(prev => prev.map(s => s.num === num ? { ...s, duration: val } : s));
    setSaved(false);
  };

  const saveOrder = async () => {
    setSaving(true);
    const durations: Record<string, number> = {};
    slides.forEach(s => { if (s.duration !== null) durations[String(s.num)] = s.duration; });
    try {
      await apiPut("/api/config/slides", { order, durations });
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } finally { setSaving(false); }
  };

  const saveTemplate = async () => {
    if (!selectedTemplate) return;
    setSavingTemplate(true);
    try {
      await apiPut(`/api/config/templates/${selectedTemplate}`, { text: editorContent });
      setTemplates(prev => prev.map(t => t.filename === selectedTemplate ? { ...t, content: editorContent } : t));
      alert("Template salvo com sucesso!");
    } catch (e: any) {
      alert("Erro ao salvar: " + e.message);
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleTemplateChange = (filename: string) => {
    setSelectedTemplate(filename);
    const t = templates.find(x => x.filename === filename);
    if (t) setEditorContent(t.content);
  };

  const doUpload = async () => {
    if (!uploadFile) return alert("Selecione um arquivo primeiro.");
    if (!targetFilename) return alert("Defina o nome do arquivo destino (ex: slide_04.jpg)");
    setUploading(true);
    try {
      const formData = new FormData();
      // O backend usa file.filename como destino, então vamos renomear no FormData
      formData.append("file", uploadFile, targetFilename);

      const res = await fetch(`${process.env.NEXT_PUBLIC_VIDEO_SERVICE_URL || "http://localhost:8000"}/api/config/upload-slide`, {
        method: "POST",
        headers: { "x-editor-key": process.env.NEXT_PUBLIC_EDITOR_API_KEY || "c8club-editor-2026" },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      alert("Arquivo estático enviado com sucesso!");
      setUploadFile(null);
    } catch(e:any) {
      alert("Falha no upload: " + e);
    } finally {
      setUploading(false);
    }
  };

  // Injetar dados de demonstração para o preview HTML ao vivo
  const getPreviewHTML = () => {
    let html = editorContent;
    html = html.replace(/{{ empresa }}/g, "Empresa Tech");
    html = html.replace(/{{ \s*empresa\s* }}/g, "Empresa Tech");
    html = html.replace(/{{ nome }}/g, "João Silva");
    html = html.replace(/{{ \s*nome\s* }}/g, "João Silva");
    html = html.replace(/{{ cargo }}/g, "CEO");
    html = html.replace(/{{ \s*cargo\s* }}/g, "CEO");
    html = html.replace(/{{ score }}/g, "65");
    html = html.replace(/{{ \s*score\s* }}/g, "65");
    return html;
  };

  const STATIC_SLIDES = [
    { file: "slide_04.png", label: "Slide 04 (Pilares)" },
    { file: "slide_05.png", label: "Slide 05 (Ritualística)" },
    { file: "slide_06.png", label: "Slide 06 (Dinâmica)" },
    { file: "slide_08.png", label: "Slide 08 (Análise)" },
    { file: "slide_09.png", label: "Slide 09 (Gráfico)" },
    { file: "slide_10.png", label: "Slide 10 (Sintomas)" },
    { file: "slide_12.png", label: "Slide 12 (Solução)" },
    { file: "slide_13.png", label: "Slide 13 (Oferta)" },
  ];

  return (
    <div className="animate-in" style={{ paddingBottom: 64 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800 }}>⊞ Gerenciador de Slides e Visual</h1>
        <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>
          Controle a linha do tempo e edite todos os aspectos visuais dos seus slides dinâmicos e estáticos.
        </p>
      </div>

      {/* Ordem dos Slides */}
      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>1. Linha do Tempo (Dnd)</h2>
      <div className="card" style={{ padding: 24, marginBottom: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 24 }}>
            <div><span style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>Fixo</span><br /><strong>{totalDur.toFixed(1)}s</strong></div>
            <div><span style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>Auto</span><br /><strong style={{ color: "#60a5fa" }}>{autoDur}</strong></div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {saved && <span style={{ fontSize: 12, color: "var(--emerald)" }}>✓ Salvo!</span>}
            <button className="btn btn-primary" onClick={saveOrder} disabled={saving}>
              {saving ? "Salvando…" : "Salvar ordem"}
            </button>
          </div>
        </div>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={order} strategy={horizontalListSortingStrategy}>
            <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 12 }}>
              {orderedSlides.map(slide => <SortableSlide key={slide.num} slide={slide} onDurChange={handleDurChange} />)}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: 24 }}>
        
        {/* Monaco Editor (HTML) com Preview */}
        <div className="card" style={{ padding: 24, flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>2. Editor de HTML Dinâmico (Jinja2)</h2>
            <div style={{ display: "flex", gap: 12 }}>
              <select className="input" value={selectedTemplate} onChange={e => handleTemplateChange(e.target.value)} style={{ minWidth: 200, backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
                {templates.map(t => <option key={t.filename} value={t.filename}>{t.filename}</option>)}
              </select>
              <button className="btn btn-primary" onClick={saveTemplate} disabled={savingTemplate || !selectedTemplate}>
                {savingTemplate ? "..." : "Salvar Código"}
              </button>
            </div>
          </div>
          
          <div style={{ display: "grid", gridTemplateRows: "1fr 1fr", gap: 16, height: 700 }}>
            {/* Visual Preview */}
            <div style={{ 
              border: "1px solid var(--border-subtle)", borderRadius: 8, overflow: "hidden", 
              background: "#333", display: "flex", alignItems: "center", justifyContent: "center",
              position: "relative"
            }}>
              <div style={{ position: "absolute", top: 8, left: 12, fontSize: 11, color: "#aaa", zIndex: 10, background: "rgba(0,0,0,0.5)", padding: "2px 6px", borderRadius: 4 }}>
                Visualização ao Vivo (Escala 25%)
              </div>
              <div style={{ width: 1920, height: 1080, transform: "scale(0.3)", transformOrigin: "center center" }}>
                <iframe 
                  srcDoc={getPreviewHTML()}
                  style={{ width: "100%", height: "100%", border: "none", backgroundColor: "#fff" }}
                />
              </div>
            </div>

            {/* Code */}
            <div style={{ border: "1px solid var(--border-subtle)", borderRadius: 8, overflow: "hidden" }}>
               <Editor
                  height="100%"
                  language="html"
                  theme="vs-dark"
                  value={editorContent}
                  onChange={v => setEditorContent(v || "")}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    wordWrap: "on",
                  }}
                />
            </div>
          </div>
        </div>

        {/* Uploader de Estáticos */}
        <div className="card" style={{ padding: 24, height: "fit-content" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>3. Substituir Slides Estáticos</h2>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>
            Faça upload de suas imagens (`.jpg` ou `.png`) para substituir os visuais estáticos fixos do material. O formato recomendado é 1920x1080px.
          </p>

          <div style={{ marginBottom: 16 }}>
            <label className="label">Qual slide vai substituir?</label>
            <select 
              className="input" 
              value={targetFilename} 
              onChange={e => setTargetFilename(e.target.value)}
              style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}
            >
              {STATIC_SLIDES.map(s => (
                <option key={s.file} value={s.file}>{s.label}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label className="label">Arquivo Imagem Novo</label>
            <input 
              type="file" 
              className="input" 
              onChange={e => setUploadFile(e.target.files?.[0] || null)}
              accept="image/png, image/jpeg"
              style={{ paddingTop: 8, border: "1px dashed var(--border-default)" }}
            />
          </div>

          <button 
            className="btn btn-primary" 
            onClick={doUpload} 
            disabled={uploading || !uploadFile}
            style={{ width: "100%", justifyContent: "center" }}
          >
            {uploading ? "Enviando..." : "⬆ Subir Imagem Selecionada"}
          </button>
        </div>

      </div>
    </div>
  );
}
