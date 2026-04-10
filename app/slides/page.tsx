"use client";
import { useEffect, useState, useCallback } from "react";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, horizontalListSortingStrategy,
  useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { apiGet, apiPut } from "../lib/api";

interface Slide { num: number; type: "static" | "dynamic"; duration: number | null; }

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
        {/* Drag handle */}
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
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>⠿</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
            Slide {slide.num}
          </span>
          <span className={`badge ${slide.type === "dynamic" ? "badge-blue" : "badge-violet"}`} style={{ marginLeft: "auto", fontSize: 9 }}>
            {slide.type === "dynamic" ? "Din" : "Est"}
          </span>
        </div>
        {/* Duration */}
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

  const sensors = useSensors(useSensor(PointerSensor));

  const load = useCallback(async () => {
    try {
      const d = await apiGet("/api/config/slides");
      setOrder(d.order);
      setSlides(d.slides);
    } catch {}
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

  const save = async () => {
    setSaving(true);
    const durations: Record<string, number> = {};
    slides.forEach(s => { if (s.duration !== null) durations[String(s.num)] = s.duration; });
    try {
      await apiPut("/api/config/slides", { order, durations });
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } finally { setSaving(false); }
  };

  const totalDur = slides.reduce((s, sl) => s + (sl.duration || 0), 0);
  const autoDur  = slides.filter(s => !s.duration).length;

  const orderedSlides = order.map(n => slides.find(s => s.num === n)).filter(Boolean) as Slide[];

  return (
    <div className="animate-in">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800 }}>⊞ Gerenciador de Slides</h1>
        <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>
          Arraste para reordenar. Defina durações individuais ou deixe em "Auto" para distribuição igual pelo áudio.
        </p>
      </div>

      {/* Summary bar */}
      <div className="card" style={{ padding: "14px 20px", marginBottom: 20, display: "flex", gap: 24, alignItems: "center" }}>
        <div>
          <span style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1 }}>Total fixo</span>
          <br /><strong style={{ fontSize: 16, color: "var(--text-primary)" }}>{totalDur.toFixed(1)}s</strong>
        </div>
        <div style={{ width: 1, background: "var(--border-subtle)", height: 32 }} />
        <div>
          <span style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1 }}>Slides automáticos</span>
          <br /><strong style={{ fontSize: 16, color: "#60a5fa" }}>{autoDur}</strong>
        </div>
        <div style={{ width: 1, background: "var(--border-subtle)", height: 32 }} />
        <div>
          <span style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1 }}>Total de slides</span>
          <br /><strong style={{ fontSize: 16, color: "var(--text-primary)" }}>15</strong>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          {saved && <span style={{ fontSize: 12, color: "var(--emerald)" }}>✓ Salvo!</span>}
          <button className="btn btn-ghost" onClick={load}>↺ Resetar</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? "Salvando…" : "Salvar ordem"}
          </button>
        </div>
      </div>

      {/* Drag-and-drop timeline */}
      <div className="card" style={{ padding: 24 }}>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>
          Arraste os slides para reordenar ↔
        </div>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={order} strategy={horizontalListSortingStrategy}>
            <div style={{
              display: "flex", gap: 12, overflowX: "auto",
              paddingBottom: 12, minHeight: 160,
            }}>
              {orderedSlides.map(slide => (
                <SortableSlide key={slide.num} slide={slide} onDurChange={handleDurChange} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 16, marginTop: 16 }}>
        <div className="badge badge-blue">Din = Dinâmico (HTML renderizado com dados do lead)</div>
        <div className="badge badge-violet">Est = Estático (imagem fixa JPG)</div>
      </div>
    </div>
  );
}
