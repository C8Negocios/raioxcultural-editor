"use client";
import { useEffect, useState, useCallback, use } from "react";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, horizontalListSortingStrategy,
  useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { apiGet, apiPut } from "../../lib/api";
import Link from "next/link";

interface Slide { num: number; type: "static" | "dynamic"; duration: number | null; }

function SortableSlide({ slide, onDurChange, htmlContent, funnelId }: { slide: Slide; onDurChange: (n: number, v: number | null) => void; htmlContent?: string, funnelId: string }) {
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
        <div style={{ height: 80, width: "100%", position: "relative", borderBottom: "1px solid var(--border-subtle)", overflow: "hidden", background: "#000" }}>
          {htmlContent ? (
            <iframe 
               srcDoc={htmlContent} 
               style={{ width: '1920px', height: '1080px', transform: 'scale(0.0729)', transformOrigin: 'top left', border: 'none', pointerEvents: 'none', position: 'absolute', top: 0, left: 0 }} 
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

export default function SlidesPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const funnelId = unwrappedParams.id;
  const [funnelName, setFunnelName] = useState("");
  const [slides, setSlides] = useState<Slide[]>([]);
  const [order, setOrder] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [htmlTemplates, setHtmlTemplates] = useState<{filename: string, content: string}[]>([]);

  // File Upload State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [targetFilename, setTargetFilename] = useState<string>("slide_04.png");
  const [uploading, setUploading] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor));

  const load = useCallback(async () => {
    try {
      const d = await apiGet(`/api/config/funnels/${funnelId}/slides`);
      setFunnelName(d.name || funnelId);
      setOrder(d.order);
      setSlides(d.slides);
      
      const tList = await apiGet(`/api/config/funnels/${funnelId}/templates`);
      setHtmlTemplates(tList || []);
    } catch (e: any) {
      console.error(e);
    }
  }, [funnelId]);

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
      await apiPut(`/api/config/funnels/${funnelId}/slides`, { order, durations });
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } finally { setSaving(false); }
  };

  const doUpload = async () => {
    if (!uploadFile) return alert("Selecione um arquivo primeiro.");
    if (!targetFilename) return alert("Defina o nome do arquivo destino (ex: slide_04.jpg)");
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile, targetFilename);

      // usa proxy /api/vs — sem Mixed Content
      const res = await fetch(`/api/vs/api/config/funnels/${funnelId}/upload-slide`, {
        method: "POST",
        headers: { "x-editor-key": "c8club-editor-2026" },
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

  const STATIC_SLIDES = [
    { file: "slide_04.png", label: "Slide 04 (Pilares)" },
    { file: "slide_05.png", label: "Slide 05 (Ritualística)" },
    { file: "slide_06.png", label: "Slide 06 (Dinâmica)" },
    { file: "slide_08.png", label: "Slide 08 (Análise)" },
    { file: "slide_09.png", label: "Slide 09 (Gráfico)" },
    { file: "slide_10.png", label: "Slide 10 (Sintomas)" },
    { file: "slide_13.png", label: "Slide 13 (Oferta)" },
  ];

  const totalDur = slides.reduce((s, sl) => s + (sl.duration || 0), 0);
  const autoDur  = slides.filter(s => !s.duration).length;
  const orderedSlides = order.map(n => slides.find(s => s.num === n)).filter(Boolean) as Slide[];

  return (
    <div className="animate-in" style={{ paddingBottom: 64 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800 }}>⊞ Funil: {funnelName}</h1>
        <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>
          Controle a linha do tempo e a duração da apresentação audiovisual gerada para o lead.
        </p>
      </div>

      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>1. Linha do Tempo da Apresentação</h2>
      <div className="card" style={{ padding: 24, marginBottom: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 24 }}>
            <div><span style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>Fixo</span><br /><strong>{totalDur.toFixed(1)}s</strong></div>
            <div><span style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>Auto</span><br /><strong style={{ color: "#60a5fa" }}>{autoDur}</strong></div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {saved && <span style={{ fontSize: 12, color: "var(--emerald)" }}>✓ Salvo!</span>}
            <button className="btn btn-primary" onClick={saveOrder} disabled={saving}>
              {saving ? "Salvando…" : "Salvar ordem na VSL"}
            </button>
          </div>
        </div>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={order} strategy={horizontalListSortingStrategy}>
            <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 12 }}>
              {orderedSlides.map(slide => {
                 const matchingHtml = htmlTemplates.find(t => {
                   const numStr = t.filename.replace("slide_", "").split("_")[0].replace(".html", "");
                   return parseInt(numStr) === slide.num;
                 });
                 return <SortableSlide key={slide.num} slide={slide} onDurChange={handleDurChange} htmlContent={matchingHtml?.content} funnelId={funnelId} />;
              })}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        
        {/* Uploader de Estáticos */}
        <div className="card" style={{ padding: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Substituir Slides Fixos</h2>
          <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 24 }}>
            Substitua imagens passivas (sem dados do lead). O formato obrigatório é `.png` ou `.jpg` em 1920x1080px.
          </p>

          <div style={{ marginBottom: 20 }}>
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
            <label className="label">Nova Imagem Renderizada</label>
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
            style={{ width: "100%", justifyContent: "center", padding: "12px" }}
          >
            {uploading ? "Fazendo Upload..." : "⬆ Substituir Imagem Selecionada no Servidor"}
          </button>
        </div>

      </div>
    </div>
  );
}
