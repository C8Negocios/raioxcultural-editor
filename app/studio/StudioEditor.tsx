'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { apiGet, apiPut } from '../lib/api';
import c8Assets from './c8-assets.json';

type ElementType = 'text' | 'image' | 'raw-html';

// ─── Paleta Oficial C8 Brand ─────────────────────────────────────────────────
const C8_COLOR_FAMILIES = [
  { family: 'Neutros', colors: [
    { name: 'Cream', hex: '#FEFEFB' }, { name: 'Off-White', hex: '#EAEAE6' },
    { name: 'Cinza Claro', hex: '#C1C1BB' }, { name: 'Cinza Médio', hex: '#7E7E7A' },
    { name: 'Cinza', hex: '#51514E' }, { name: 'Grafite', hex: '#444441' },
    { name: 'Escuro', hex: '#363634' }, { name: 'Carvão', hex: '#292927' },
    { name: 'Quase Preto', hex: '#1B1B1A' }, { name: 'Preto C8', hex: '#101010' },
  ]},
  { family: 'Midnight Code', colors: [
    { name: 'Azul C8', hex: '#00205B' }, { name: 'Azul Navy', hex: '#001440' },
    { name: 'Azul Médio', hex: '#034F8C' }, { name: 'Azul Claro', hex: '#0082C3' },
  ]},
  { family: 'Pulse Core', colors: [
    { name: 'Azul Elétrico', hex: '#0762C8' }, { name: 'Azul Intenso', hex: '#0449A0' },
    { name: 'Azul Suave', hex: '#4A90D9' }, { name: 'Sky Blue', hex: '#62B5E5' },
  ]},
  { family: 'Embergate', colors: [
    { name: 'Cobre C8', hex: '#E87722' }, { name: 'Cobre Escuro', hex: '#B05510' },
    { name: 'Cobre Claro', hex: '#F4A86A' },
  ]},
  { family: 'Solar Link', colors: [
    { name: 'Amarelo C8', hex: '#FFCD00' }, { name: 'Ouro', hex: '#DAAA00' },
    { name: 'Mel', hex: '#FFE566' },
  ]},
  { family: 'Aquasync', colors: [
    { name: 'Turquesa C8', hex: '#2DCCD3' }, { name: 'Turquesa Escuro', hex: '#1A9DA3' },
    { name: 'Turquesa Claro', hex: '#7DE5E9' },
  ]},
];
const C8_COLORS_FLAT = C8_COLOR_FAMILIES.flatMap(f => f.colors.map(c => c.hex));

// ─── Fontes C8 (Unitea Sans — 6 pesos) ───────────────────────────────────────
const C8_FONTS = [
  { label: 'Regular',    value: 'Unitea Sans',  weight: '400', style: 'normal' },
  { label: 'Medium',     value: 'Unitea Sans',  weight: '500', style: 'normal' },
  { label: 'SemiBold',   value: 'Unitea Sans',  weight: '600', style: 'normal' },
  { label: 'Bold',       value: 'Unitea Sans',  weight: '700', style: 'normal' },
  { label: 'ExtraBold',  value: 'Unitea Sans',  weight: '800', style: 'normal' },
  { label: 'Black',      value: 'Unitea Sans',  weight: '900', style: 'normal' },
];

// ─── Variáveis Jinja disponíveis ──────────────────────────────────────────────
const JINJA_VARS = [
  { key: 'nome',          desc: 'Ex: João Silva' },
  { key: 'empresa',       desc: 'Ex: Acme Corp' },
  { key: 'cargo',         desc: 'Ex: CEO' },
  { key: 'score',         desc: 'Ex: 72' },
  { key: 'nivel',         desc: 'Ex: Cultura Estruturada' },
  { key: 'colaboradores', desc: 'Ex: 26 a 50' },
  { key: 'plano',         desc: 'Ex: C8 Pro' },
  { key: 'preco',         desc: 'Ex: R$ 497' },
  { key: 'proximo_marco', desc: 'Ex: 90 dias' },
];

// ─── Interfaces ───────────────────────────────────────────────────────────────
interface FrameElement {
  id: string;
  type: ElementType;
  subtype?: 'background' | 'graphic' | 'logo';
  x: number;
  y: number;
  width?: number;
  height?: number;
  content: string;
  fontSize?: number;
  fontWeight?: string;
  fontStyle?: 'normal' | 'italic';
  textTransform?: 'none' | 'uppercase' | 'lowercase';
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  lineHeight?: number;
  letterSpacing?: number;
  color?: string;
  zIndex: number;
}

interface SlideDef {
  filename: string;
  elements: FrameElement[];
  backgroundColor: string;
  isDynamic?: boolean;
  duration?: number;      // segundos (estático) ou undefined (dinâmico/auto)
  roteiroOrder?: number;  // posição no roteiro 1-based
}

// ─── Sub-componente: Autocomplete de Variáveis Jinja ─────────────────────────
function VarAutocomplete({
  onInsert, visible, filter
}: { onInsert: (v: string) => void; visible: boolean; filter: string }) {
  if (!visible) return null;
  const filtered = JINJA_VARS.filter(v => v.key.startsWith(filter.toLowerCase()));
  if (filtered.length === 0) return null;
  return (
    <div style={{
      position: 'absolute', bottom: '100%', left: 0, right: 0, marginBottom: '4px',
      background: '#1E2130', border: '1px solid rgba(232,119,34,0.4)',
      borderRadius: '8px', overflow: 'hidden', zIndex: 9999,
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
    }}>
      <div style={{ padding: '6px 10px', fontSize: '10px', color: 'rgba(255,255,255,0.3)', borderBottom: '1px solid rgba(255,255,255,0.05)', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
        Variáveis Jinja disponíveis
      </div>
      {filtered.map(v => (
        <div key={v.key} onClick={() => onInsert(v.key)} style={{
          padding: '8px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px',
          transition: 'background 0.1s'
        }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(232,119,34,0.12)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <code style={{ color: '#E87722', fontSize: '12px', fontFamily: 'monospace', fontWeight: 700 }}>
            {'{{ ' + v.key + ' }}'}
          </code>
          <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px' }}>{v.desc}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function StudioEditor({ funnelId = 'raiox-cultural' }: { funnelId?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [slides, setSlides] = useState<SlideDef[]>([]);
  const [selectedSlideIndex, setSelectedSlideIndex] = useState(0);
  const [scale, setScale] = useState(0.5);
  const [saving, setSaving] = useState(false);

  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, ex: 0, ey: 0 });

  const [rightTab, setRightTab] = useState<'assets' | 'props'>('assets');
  const [visibleAssets, setVisibleAssets] = useState({ bg: 6, gr: 8, lg: 8 });

  // Autocomplete state
  const [autocomplete, setAutocomplete] = useState({ visible: false, filter: '' });

  // ── 1. Inicialização ────────────────────────────────────────────────────────
  useEffect(() => {
    apiGet(`/api/config/funnels/${funnelId}/templates`).then((res: any[]) => {
      if (res.length > 0) {
        const loaded: SlideDef[] = res.map(t => {
          const match = t.content.match(/<script type="application\/json" id="c8-state">([\s\S]*?)<\/script>/);
          if (match) {
            try {
              return JSON.parse(decodeURIComponent(atob(match[1]))) as SlideDef;
            } catch (e) { console.error('Falha parse c8-state', e); }
          }
          return {
            filename: t.filename, backgroundColor: '#101010', isDynamic: true,
            elements: [{ id: Math.random().toString(36).substr(2, 9), type: 'raw-html', content: t.content, x: 0, y: 0, width: 1920, height: 1080, zIndex: -1 }]
          };
        });
        loaded.sort((a, b) => a.filename.localeCompare(b.filename));
        setSlides(loaded);
      } else {
        setSlides([{ filename: 'slide_01_cover.html', backgroundColor: '#00205B', isDynamic: true, elements: [] }]);
      }
    }).catch(console.error);
  }, [funnelId]);

  useEffect(() => {
    const resize = () => {
      if (!containerRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      setScale(Math.min((clientWidth - 80) / 1920, (clientHeight - 80) / 1080));
    };
    setTimeout(resize, 50);
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // ── 2. Gerenciamento de Slides ──────────────────────────────────────────────
  const getSlide = () => slides[selectedSlideIndex];

  const updateSlide = useCallback((newSlide: SlideDef) => {
    setSlides(prev => prev.map((s, i) => i === selectedSlideIndex ? newSlide : s));
  }, [selectedSlideIndex]);

  const updateElement = useCallback((id: string, changes: Partial<FrameElement>) => {
    const s = slides[selectedSlideIndex];
    if (!s) return;
    updateSlide({ ...s, elements: s.elements.map(el => el.id === id ? { ...el, ...changes } : el) });
  }, [slides, selectedSlideIndex, updateSlide]);

  const addSlide = async () => {
    const n = slides.length + 1;
    const filename = `slide_${n.toString().padStart(2, '0')}.html`;
    const newS: SlideDef = { filename, backgroundColor: '#00205B', isDynamic: true, elements: [] };
    setSlides(prev => [...prev, newS]);
    setSelectedSlideIndex(slides.length);
    await saveSlide(newS, true);
  };

  const duplicateAsVariant = async () => {
    const current = slides[selectedSlideIndex];
    const suffix = prompt('Nome da Variação Lógica (ex: score_0_20, error):');
    if (!suffix) return;
    const newS: SlideDef = {
      ...current,
      filename: `${current.filename.replace('.html', '')}_${suffix}.html`,
      elements: JSON.parse(JSON.stringify(current.elements))
    };
    setSlides(prev => [...prev, newS]);
    setSelectedSlideIndex(slides.length);
    await saveSlide(newS, true);
  };

  const deleteCurrentSlide = () => {
    if (slides.length <= 1) return alert('Não pode deletar o último slide');
    if (!confirm('Excluir este slide permanentemente?')) return;
    const idx = selectedSlideIndex;
    setSlides(prev => prev.filter((_, i) => i !== idx));
    setSelectedSlideIndex(Math.max(0, idx - 1));
  };

  // ── 3. Elementos do Canvas ──────────────────────────────────────────────────
  const addTextElement = () => {
    const s = getSlide(); if (!s) return;
    const el: FrameElement = {
      id: Math.random().toString(36).substr(2, 9), type: 'text',
      content: '{{ empresa }}, escreva algo...',
      x: 120, y: 300, width: 900,
      fontSize: 72, color: '#FEFEFB', fontWeight: '700', fontStyle: 'normal',
      textAlign: 'left', textTransform: 'none', lineHeight: 1.15, letterSpacing: 0,
      zIndex: s.elements.length + 1
    };
    updateSlide({ ...s, elements: [...s.elements, el] });
    setSelectedElementId(el.id);
    setRightTab('props');
  };

  const addBackgroundElement = (url: string) => {
    const s = getSlide(); if (!s) return;
    const bg: FrameElement = {
      id: Math.random().toString(36).substr(2, 9), type: 'image', subtype: 'background',
      content: url, x: 0, y: 0, width: 1920, height: 1080, zIndex: 0
    };
    updateSlide({ ...s, elements: [bg, ...s.elements.filter(e => e.subtype !== 'background')] });
  };

  const addImageElement = (url: string, subtype: 'graphic' | 'logo' = 'graphic') => {
    const s = getSlide(); if (!s) return;
    const el: FrameElement = {
      id: Math.random().toString(36).substr(2, 9), type: 'image', subtype,
      content: url, x: 400, y: 300, width: subtype === 'logo' ? 300 : 400,
      zIndex: s.elements.length + 1
    };
    updateSlide({ ...s, elements: [...s.elements, el] });
    setSelectedElementId(el.id);
    setRightTab('props');
  };

  const deleteSelectedElement = () => {
    if (!selectedElementId) return;
    const s = getSlide();
    updateSlide({ ...s, elements: s.elements.filter(e => e.id !== selectedElementId) });
    setSelectedElementId(null);
  };

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Delete' && selectedElementId &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA') deleteSelectedElement();
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [selectedElementId, slides, selectedSlideIndex]);

  // ── 4. Drag & Drop ──────────────────────────────────────────────────────────
  const handleMouseDown = (e: React.MouseEvent, el: FrameElement) => {
    e.stopPropagation();
    setSelectedElementId(el.id);
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, ex: el.x, ey: el.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !selectedElementId) return;
    updateElement(selectedElementId, {
      x: dragStart.current.ex + (e.clientX - dragStart.current.x) / scale,
      y: dragStart.current.ey + (e.clientY - dragStart.current.y) / scale,
    });
  };

  // ── 5. Autocomplete de Variáveis Jinja ─────────────────────────────────────
  const handleTextareaChange = (content: string, elId: string) => {
    updateElement(elId, { content });
    // Detectar se acabou de digitar {{
    const cursorPos = textareaRef.current?.selectionStart ?? content.length;
    const textBefore = content.slice(0, cursorPos);
    const match = textBefore.match(/\{\{(\w*)$/);
    if (match) {
      setAutocomplete({ visible: true, filter: match[1] });
    } else {
      setAutocomplete({ visible: false, filter: '' });
    }
  };

  const insertVariable = (key: string, elId: string, currentContent: string) => {
    const textarea = textareaRef.current;
    const pos = textarea?.selectionStart ?? currentContent.length;
    const before = currentContent.slice(0, pos);
    const after = currentContent.slice(pos);
    // Remove o {{ parcial antes do cursor
    const cleaned = before.replace(/\{\{\w*$/, '');
    const newContent = `${cleaned}{{ ${key} }}${after}`;
    updateElement(elId, { content: newContent });
    setAutocomplete({ visible: false, filter: '' });
  };

  // ── 6. Compilação HTML ─────────────────────────────────────────────────────
  const compileHtml = (slide: SlideDef) => {
    const stateData = btoa(encodeURIComponent(JSON.stringify(slide)));

    // @font-face declarations for all Unitea Sans weights
    const fontFaces = [
      `@font-face { font-family: 'Unitea Sans'; src: url('/fonts/Unitea Sans/UniteaSans-Regular.ttf') format('truetype'); font-weight: 400; font-style: normal; }`,
      `@font-face { font-family: 'Unitea Sans'; src: url('/fonts/Unitea Sans/UniteaSans-RegularItalic.ttf') format('truetype'); font-weight: 400; font-style: italic; }`,
      `@font-face { font-family: 'Unitea Sans'; src: url('/fonts/Unitea Sans/UniteaSans-Medium.ttf') format('truetype'); font-weight: 500; font-style: normal; }`,
      `@font-face { font-family: 'Unitea Sans'; src: url('/fonts/Unitea Sans/UniteaSans-MediumItalic.ttf') format('truetype'); font-weight: 500; font-style: italic; }`,
      `@font-face { font-family: 'Unitea Sans'; src: url('/fonts/Unitea Sans/UniteaSans-SemiBold.ttf') format('truetype'); font-weight: 600; font-style: normal; }`,
      `@font-face { font-family: 'Unitea Sans'; src: url('/fonts/Unitea Sans/UniteaSans-SemiBoldItalic.ttf') format('truetype'); font-weight: 600; font-style: italic; }`,
      `@font-face { font-family: 'Unitea Sans'; src: url('/fonts/Unitea Sans/UniteaSans-Bold.ttf') format('truetype'); font-weight: 700; font-style: normal; }`,
      `@font-face { font-family: 'Unitea Sans'; src: url('/fonts/Unitea Sans/UniteaSans-BoldItalic.ttf') format('truetype'); font-weight: 700; font-style: italic; }`,
      `@font-face { font-family: 'Unitea Sans'; src: url('/fonts/Unitea Sans/UniteaSans-ExtraBold.ttf') format('truetype'); font-weight: 800; font-style: normal; }`,
      `@font-face { font-family: 'Unitea Sans'; src: url('/fonts/Unitea Sans/UniteaSans-ExtraBoldItalic.ttf') format('truetype'); font-weight: 800; font-style: italic; }`,
      `@font-face { font-family: 'Unitea Sans'; src: url('/fonts/Unitea Sans/UniteaSans-Black.ttf') format('truetype'); font-weight: 900; font-style: normal; }`,
      `@font-face { font-family: 'Unitea Sans'; src: url('/fonts/Unitea Sans/UniteaSans-BlackItalic.ttf') format('truetype'); font-weight: 900; font-style: italic; }`,
    ].join('\n    ');

    let inner = '';
    const bgEl = slide.elements.find(e => e.subtype === 'background');
    if (bgEl) {
      inner += `<img src="${bgEl.content}" style="position:absolute;top:0;left:0;width:1920px;height:1080px;object-fit:cover;z-index:0;pointer-events:none;" />\n`;
    }

    for (const el of slide.elements) {
      if (el.subtype === 'background') continue;
      if (el.type === 'raw-html') {
        inner += `<div style="position:absolute;width:1920px;height:1080px;top:0;left:0;z-index:${el.zIndex}">${el.content}</div>\n`;
      } else if (el.type === 'text') {
        const css = [
          `position:absolute`, `left:${Math.round(el.x)}px`, `top:${Math.round(el.y)}px`,
          `width:${el.width}px`, `font-size:${el.fontSize}px`,
          `color:${el.color}`, `font-weight:${el.fontWeight || 700}`,
          `font-style:${el.fontStyle || 'normal'}`,
          `text-align:${el.textAlign || 'left'}`,
          `text-transform:${el.textTransform || 'none'}`,
          `line-height:${el.lineHeight ?? 1.15}`,
          `letter-spacing:${el.letterSpacing ?? 0}px`,
          `font-family:'Unitea Sans', sans-serif`, `z-index:${el.zIndex}`
        ].join(';');
        inner += `<div style="${css}">${el.content.replace(/\n/g, '<br/>')}</div>\n`;
      } else if (el.type === 'image') {
        if (el.content.endsWith('.svg') && el.color) {
          inner += `<div style="position:absolute;left:${Math.round(el.x)}px;top:${Math.round(el.y)}px;width:${el.width}px;z-index:${el.zIndex};pointer-events:none;">\n`;
          inner += `  <img src="${el.content}" style="width:100%;height:auto;display:block;opacity:0;" />\n`;
          inner += `  <div style="position:absolute;top:0;left:0;width:100%;height:100%;background-color:${el.color};-webkit-mask-image:url('${el.content}');mask-image:url('${el.content}');-webkit-mask-size:contain;mask-size:contain;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;-webkit-mask-position:center;mask-position:center;"></div>\n</div>\n`;
        } else {
          inner += `<img src="${el.content}" style="position:absolute;left:${Math.round(el.x)}px;top:${Math.round(el.y)}px;width:${el.width}px;height:auto;z-index:${el.zIndex};pointer-events:none;" />\n`;
        }
      }
    }

    const bgCss = slide.backgroundColor.startsWith('#') || slide.backgroundColor.startsWith('rgb')
      ? `background:${slide.backgroundColor}`
      : `background:${slide.backgroundColor} center/cover no-repeat`;

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <style>
    ${fontFaces}
    body { margin:0; padding:0; font-family:'Unitea Sans',sans-serif; ${bgCss}; overflow:hidden; }
    .c8-canvas { width:1920px; height:1080px; position:relative; overflow:hidden; }
  </style>
</head>
<body>
  <div class="c8-canvas">
${inner}  </div>
  <script type="application/json" id="c8-state">${stateData}</script>
</body>
</html>`;
  };

  // ── 7. Salvar e Sincronizar ─────────────────────────────────────────────────
  const saveSlide = async (slideParam?: SlideDef, quiet?: boolean) => {
    setSaving(true);
    try {
      const slide = slideParam ?? getSlide();
      if (!slide) return;

      await apiPut(`/api/config/funnels/${funnelId}/templates/${slide.filename}`, {
        filename: slide.filename, content: compileHtml(slide)
      });

      // Sincronizar com roteiro
      const baseNumMatch = slide.filename.match(/slide_0*(\d+)/);
      if (baseNumMatch) {
        const num = parseInt(baseNumMatch[1], 10);
        try {
          const cfg = await apiGet(`/api/config/funnels/${funnelId}/slides`);
          if (cfg?.order) {
            const order: number[] = cfg.order.includes(num) ? cfg.order : [...cfg.order, num];
            const durations: Record<string, number> = {};
            (cfg.slides || []).forEach((s: any) => { if (s.duration) durations[String(s.num)] = s.duration; });
            // Aplicar duração do slide atual se estático
            if (!slide.isDynamic && slide.duration) durations[String(num)] = slide.duration;
            await apiPut(`/api/config/funnels/${funnelId}/slides`, { order, durations });
          }
        } catch (e) { console.warn('Sync roteiro falhou', e); }
      }

      if (!quiet) alert(`✅ Lâmina "${slide.filename}" salva${slide.isDynamic ? ' (Dinâmica)' : ` (Estática — ${slide.duration ?? '?'}s)`}`);
    } catch (e) {
      console.error(e); alert('Falha de gravação.');
    }
    setSaving(false);
  };

  // ── Atalho Ctrl+S ──────────────────────────────────────────────────────────
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveSlide(); } };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [slides, selectedSlideIndex]);

  // ── Render helpers ─────────────────────────────────────────────────────────
  const currentSlide = getSlide();
  const selectedElement = currentSlide?.elements.find(e => e.id === selectedElementId);
  const currentBg = currentSlide?.elements.find(e => e.subtype === 'background');

  const ColorPicker = ({ value, onChange }: { value: string; onChange: (h: string) => void }) => (
    <div>
      {C8_COLOR_FAMILIES.map(fam => (
        <div key={fam.family} style={{ marginBottom: '8px' }}>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', marginBottom: '4px', fontWeight: 600 }}>{fam.family}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
            {fam.colors.map(c => (
              <div key={c.hex} onClick={() => onChange(c.hex)} title={`${c.name} ${c.hex}`}
                style={{ width: '20px', height: '20px', borderRadius: '4px', background: c.hex, cursor: 'pointer', border: value === c.hex ? '2px solid #E87722' : '1px solid rgba(255,255,255,0.1)', boxSizing: 'border-box' }} />
            ))}
          </div>
        </div>
      ))}
      <div style={{ display: 'flex', gap: '6px', background: 'rgba(255,255,255,0.04)', padding: '6px 8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)', marginTop: '6px' }}>
        <input type="color" value={value.startsWith('#') ? value : '#000000'} onChange={e => onChange(e.target.value)} style={{ width: '24px', height: '24px', border: 'none', padding: 0, background: 'transparent', cursor: 'pointer' }} />
        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace', alignSelf: 'center' }}>{value.toUpperCase()}</span>
      </div>
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ height: '100vh', width: '100%', display: 'flex', flexDirection: 'column', background: '#0E0F14', color: '#E5E7EB', fontFamily: "'Inter','Unitea Sans',sans-serif", overflow: 'hidden' }}>

      {/* ─── HEADER ─── */}
      <div style={{ height: '52px', padding: '0 18px', background: 'linear-gradient(90deg,#000D24 0%,#00205B 100%)', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderRight: '1px solid rgba(255,255,255,0.1)', paddingRight: '14px' }}>
            <svg width="26" height="18" viewBox="0 0 28 20" fill="none">
              <path d="M8.4 0C3.76 0 0 3.58 0 8s3.76 8 8.4 8c2.52 0 4.76-1.04 6.3-2.7l-2.52-2.24C11.28 12 9.92 12.6 8.4 12.6c-2.8 0-5.04-2.06-5.04-4.6S5.6 3.4 8.4 3.4c1.52 0 2.88.6 3.78 1.56l2.52-2.26C13.16 1.04 10.92 0 8.4 0Z" fill="#E87722" />
              <path d="M19.6 0c-2.52 0-4.76 1.04-6.3 2.7l2.52 2.24C16.72 4 18.08 3.4 19.6 3.4c2.8 0 5.04 2.06 5.04 4.6s-2.24 4.6-5.04 4.6c-1.52 0-2.88-.6-3.78-1.56l-2.52 2.26C14.84 14.96 17.08 16 19.6 16 24.24 16 28 12.42 28 8s-3.76-8-8.4-8Z" fill="#FEFEFB" />
            </svg>
            <span style={{ fontSize: '14px', fontWeight: 800, letterSpacing: '-0.3px', color: '#FEFEFB' }}>C8 Studio</span>
          </div>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>{currentSlide?.filename ?? 'Sem arquivo'}</span>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)' }}>· Ctrl+S para salvar</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={duplicateAsVariant} style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}>
            Duplicar Variável
          </button>
          <button onClick={() => saveSlide()} style={{ background: 'linear-gradient(135deg,#E87722,#D96B10)', color: '#fff', border: 'none', padding: '6px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, fontSize: '12px', boxShadow: '0 4px 12px rgba(232,119,34,0.3)' }}>
            {saving ? '⏳ Salvando...' : '💾 Salvar e Sincronizar'}
          </button>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* ─── SIDEBAR ESQUERDA: ROTEIRO VISUAL ─── */}
        <div style={{ width: '220px', flexShrink: 0, background: '#12141C', borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: '8px' }}>Roteiro Visual</div>
            <button onClick={addSlide} style={{ width: '100%', background: 'rgba(232,119,34,0.08)', border: '1px dashed rgba(232,119,34,0.3)', color: '#E87722', padding: '8px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}>
              + Nova Lâmina
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
            {slides.map((s, idx) => {
              const isActive = selectedSlideIndex === idx;
              const isDyn = s.isDynamic !== false;
              return (
                <div key={idx} onClick={() => { setSelectedSlideIndex(idx); setSelectedElementId(null); }}
                  style={{ padding: '9px 10px', background: isActive ? 'rgba(232,119,34,0.1)' : 'transparent', borderRadius: '7px', marginBottom: '3px', cursor: 'pointer', border: isActive ? '1px solid rgba(232,119,34,0.3)' : '1px solid transparent', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '20px', height: '20px', borderRadius: '4px', background: isActive ? '#E87722' : 'rgba(255,255,255,0.07)', color: isActive ? '#FFF' : 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, flexShrink: 0 }}>
                    {idx + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '11px', fontWeight: isActive ? 600 : 400, color: isActive ? '#F9FAFB' : 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.filename.replace('.html', '').replace('slide_', 'L')}
                    </div>
                  </div>
                  {/* Badge DIN / EST — clicável para toggle rápido */}
                  <div onClick={e => {
                    e.stopPropagation();
                    setSlides(prev => prev.map((sl, i) => i === idx ? { ...sl, isDynamic: !sl.isDynamic } : sl));
                  }} title={isDyn ? 'Dinâmico — usa variáveis Jinja. Clique para tornar estático.' : 'Estático — sem variáveis. Clique para tornar dinâmico.'}
                    style={{ fontSize: '9px', fontWeight: 800, padding: '2px 5px', borderRadius: '4px', cursor: 'pointer', flexShrink: 0, background: isDyn ? 'rgba(45,204,211,0.15)' : 'rgba(255,255,255,0.07)', color: isDyn ? '#2DCCD3' : 'rgba(255,255,255,0.35)', border: `1px solid ${isDyn ? 'rgba(45,204,211,0.3)' : 'rgba(255,255,255,0.1)'}` }}>
                    {isDyn ? 'DIN' : 'EST'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── CANVAS ─── */}
        <div ref={containerRef}
          style={{ flex: 1, minWidth: 0, minHeight: 0, backgroundColor: '#0A0B10', backgroundImage: 'radial-gradient(rgba(255,255,255,0.04) 1px,transparent 1px)', backgroundSize: '28px 28px', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onMouseMove={handleMouseMove} onMouseUp={() => setIsDragging(false)}
          onMouseLeave={() => setIsDragging(false)} onMouseDown={() => setSelectedElementId(null)}>

          {currentSlide && (
            <div style={{ width: 1920 * scale, height: 1080 * scale, position: 'relative' }}>
              <div style={{ position: 'absolute', inset: 0, boxShadow: '0 30px 80px -10px rgba(0,0,0,0.9),0 0 0 1px rgba(255,255,255,0.05)', pointerEvents: 'none', zIndex: 200 }} />

              <div style={{ width: '1920px', height: '1080px', background: currentSlide.backgroundColor, transform: `scale(${scale})`, transformOrigin: 'top left', position: 'absolute', top: 0, left: 0, overflow: 'hidden' }}>
                {currentBg && (
                  <img src={currentBg.content} draggable={false}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0, pointerEvents: 'none', display: 'block' }} />
                )}

                {currentSlide.elements.map(el => {
                  if (el.subtype === 'background') return null;
                  const isSel = el.id === selectedElementId;

                  if (el.type === 'raw-html') {
                    return (
                      <div key={el.id} onMouseDown={() => setSelectedElementId(el.id)}
                        contentEditable suppressContentEditableWarning
                        onBlur={e => updateElement(el.id, { content: e.currentTarget.innerHTML })}
                        dangerouslySetInnerHTML={{ __html: el.content }}
                        style={{ position: 'absolute', top: 0, left: 0, width: '1920px', height: '1080px', zIndex: el.zIndex, border: isSel ? '3px dashed rgba(232,119,34,0.8)' : 'none', outline: 'none', cursor: 'text' }} />
                    );
                  }

                  return (
                    <div key={el.id}
                      onMouseDown={e => { e.stopPropagation(); handleMouseDown(e, el); }}
                      onClick={e => e.stopPropagation()}
                      style={{ position: 'absolute', left: el.x, top: el.y, width: el.width, zIndex: el.zIndex, cursor: isDragging ? 'grabbing' : 'grab', border: isSel ? '2px dashed rgba(232,119,34,0.85)' : '2px solid transparent', boxSizing: 'border-box' }}>
                      {isSel && ['tl', 'tr', 'bl', 'br'].map(p => (
                        <div key={p} style={{ position: 'absolute', width: '10px', height: '10px', background: '#E87722', borderRadius: '50%', top: p.includes('t') ? '-5px' : undefined, bottom: p.includes('b') ? '-5px' : undefined, left: p.includes('l') ? '-5px' : undefined, right: p.includes('r') ? '-5px' : undefined }} />
                      ))}
                      {el.type === 'text' && (
                        <div style={{ color: el.color, fontSize: el.fontSize, fontWeight: el.fontWeight, fontStyle: el.fontStyle, textAlign: el.textAlign, textTransform: el.textTransform as any, lineHeight: el.lineHeight, letterSpacing: `${el.letterSpacing ?? 0}px`, fontFamily: "'Unitea Sans',sans-serif", width: '100%', userSelect: 'none' }}>
                          {el.content.split('\n').map((l, i) => <React.Fragment key={i}>{l}<br /></React.Fragment>)}
                        </div>
                      )}
                      {el.type === 'image' && (
                        <div style={{ position: 'relative', width: '100%', display: 'flex' }}>
                          <img src={el.content} draggable={false} style={{ width: '100%', height: 'auto', display: 'block', pointerEvents: 'none', opacity: el.content.endsWith('.svg') && el.color ? 0 : 1, objectFit: 'contain' }} />
                          {el.content.endsWith('.svg') && el.color && (
                            <div style={{ position: 'absolute', inset: 0, backgroundColor: el.color, maskImage: `url('${el.content}')`, maskSize: 'contain', maskRepeat: 'no-repeat', maskPosition: 'center', WebkitMaskImage: `url('${el.content}')`, WebkitMaskSize: 'contain', WebkitMaskRepeat: 'no-repeat', WebkitMaskPosition: 'center', pointerEvents: 'none' }} />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div style={{ position: 'absolute', bottom: '-22px', left: 0, fontSize: '10px', color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace' }}>
                1920 × 1080 · zoom {Math.round(scale * 100)}%
              </div>
            </div>
          )}
          {!currentSlide && <div style={{ color: 'rgba(255,255,255,0.2)' }}>Selecione uma lâmina para editar.</div>}
        </div>

        {/* ─── SIDEBAR DIREITA: ATIVOS & PROPS ─── */}
        <div style={{ width: '300px', background: '#12141C', borderLeft: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '10px', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '6px', padding: '3px', display: 'flex' }}>
              {(['assets', 'props'] as const).map(tab => (
                <button key={tab} onClick={() => setRightTab(tab)} style={{ flex: 1, padding: '6px', background: rightTab === tab ? '#E87722' : 'transparent', color: rightTab === tab ? '#FFF' : 'rgba(255,255,255,0.4)', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 700, fontSize: '12px' }}>
                  {tab === 'assets' ? '🎨 Ativos C8' : '⚙️ Ajustes'}
                </button>
              ))}
            </div>
          </div>

          {/* ── ATIVOS ── */}
          {rightTab === 'assets' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
              <button onClick={addTextElement} style={{ width: '100%', padding: '9px', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.7)', border: '1px dashed rgba(255,255,255,0.15)', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, marginBottom: '14px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                ✏️ Adicionar Texto Livre
              </button>

              {[
                { label: 'Fundos & Texturas 3D', accent: '#E87722', key: 'bg' as const, items: c8Assets.backgrounds, limit: visibleAssets.bg, step: 6, click: (url: string) => addBackgroundElement(url), bg: (id: string) => '#1A1D28' },
                { label: 'Grafismos de Apoio', accent: '#0762C8', key: 'gr' as const, items: c8Assets.graphics, limit: visibleAssets.gr, step: 9, click: (url: string) => addImageElement(url, 'graphic'), bg: (id: string) => id.includes('branco') || id.includes('white') ? '#00205B' : '#1A1D28' },
                { label: 'Topologia & Marcas', accent: '#FFCD00', key: 'lg' as const, items: c8Assets.logos, limit: visibleAssets.lg, step: 9, click: (url: string) => addImageElement(url, 'logo'), bg: (id: string) => id.includes('branco') || id.includes('white') ? '#00205B' : '#1A1D28' },
              ].map(section => (
                <div key={section.key} style={{ marginBottom: '18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                    <div style={{ width: '3px', height: '11px', background: section.accent, borderRadius: '2px' }} />
                    <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'rgba(255,255,255,0.4)' }}>{section.label}</span>
                    {section.key === 'bg' && currentBg && <span style={{ marginLeft: 'auto', fontSize: '9px', color: section.accent, fontWeight: 600 }}>● ATIVO</span>}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '5px' }}>
                    {section.items.slice(0, section.limit).map(item => (
                      <div key={item.id} onClick={() => section.click(item.url)} title={item.id}
                        style={{ background: section.bg(item.id), border: '1px solid rgba(255,255,255,0.07)', borderRadius: '5px', overflow: 'hidden', cursor: 'pointer', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: section.key === 'bg' ? '0' : '5px', transition: 'border-color 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = section.accent}
                        onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'}>
                        <img src={item.url} loading="lazy" decoding="async"
                          style={{ ...(section.key === 'bg' ? { width: '100%', height: '100%', objectFit: 'cover', display: 'block' } : { maxWidth: '100%', maxHeight: '34px', objectFit: 'contain', display: 'block' }) }} />
                      </div>
                    ))}
                  </div>
                  {section.limit < section.items.length && (
                    <button onClick={() => setVisibleAssets(v => ({ ...v, [section.key]: v[section.key] + section.step }))}
                      style={{ width: '100%', padding: '5px', marginTop: '6px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.35)', borderRadius: '5px', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}>
                      Carregar Mais (+{section.step})
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── PROPRIEDADES ── */}
          {rightTab === 'props' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>

              {/* Propriedades de Texto */}
              {selectedElement?.type === 'text' && (
                <div>
                  <SectionHeader color="#2DCCD3" label="Tipografia" />

                  {/* Textarea com autocomplete */}
                  <label style={labelStyle}>Conteúdo</label>
                  <div style={{ position: 'relative' }}>
                    <VarAutocomplete visible={autocomplete.visible} filter={autocomplete.filter}
                      onInsert={key => { if (selectedElement) insertVariable(key, selectedElement.id, selectedElement.content); }} />
                    <textarea ref={textareaRef}
                      value={selectedElement.content}
                      onChange={e => handleTextareaChange(e.target.value, selectedElement.id)}
                      onBlur={() => setTimeout(() => setAutocomplete({ visible: false, filter: '' }), 150)}
                      placeholder="Digite {{ para inserir variável..."
                      style={{ width: '100%', minHeight: '88px', background: 'rgba(255,255,255,0.04)', color: '#F9FAFB', border: '1px solid rgba(255,255,255,0.1)', padding: '9px', borderRadius: '6px', fontFamily: "'Unitea Sans',sans-serif", fontSize: '13px', resize: 'vertical', boxSizing: 'border-box' }} />
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', marginTop: '3px' }}>
                      Dica: digite <code style={{ color: '#E87722' }}>{'{{' }</code> para ver variáveis disponíveis
                    </div>
                  </div>

                  {/* Fonte e Peso */}
                  <label style={{ ...labelStyle, marginTop: '12px' }}>Fonte & Peso</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '10px' }}>
                    {C8_FONTS.map(f => (
                      <button key={f.weight} onClick={() => updateElement(selectedElement.id, { fontWeight: f.weight })}
                        style={{ padding: '4px 8px', background: selectedElement.fontWeight === f.weight ? '#E87722' : 'rgba(255,255,255,0.06)', color: selectedElement.fontWeight === f.weight ? '#FFF' : 'rgba(255,255,255,0.55)', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '11px', fontWeight: 700, fontFamily: `'Unitea Sans'` }}>
                        {f.label}
                      </button>
                    ))}
                  </div>

                  {/* Itálico & Maiúsculas */}
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                    <button onClick={() => updateElement(selectedElement.id, { fontStyle: selectedElement.fontStyle === 'italic' ? 'normal' : 'italic' })}
                      style={{ flex: 1, padding: '6px', background: selectedElement.fontStyle === 'italic' ? '#E87722' : 'rgba(255,255,255,0.06)', color: selectedElement.fontStyle === 'italic' ? '#FFF' : 'rgba(255,255,255,0.55)', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '13px', fontStyle: 'italic', fontWeight: 700 }}>
                      I Itálico
                    </button>
                    <button onClick={() => updateElement(selectedElement.id, { textTransform: selectedElement.textTransform === 'uppercase' ? 'none' : 'uppercase' })}
                      style={{ flex: 1, padding: '6px', background: selectedElement.textTransform === 'uppercase' ? '#E87722' : 'rgba(255,255,255,0.06)', color: selectedElement.textTransform === 'uppercase' ? '#FFF' : 'rgba(255,255,255,0.55)', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px' }}>
                      AA Maiúsculas
                    </button>
                  </div>

                  {/* Alinhamento (4 opções) */}
                  <label style={labelStyle}>Alinhamento</label>
                  <div style={{ display: 'flex', gap: '3px', background: 'rgba(255,255,255,0.05)', padding: '3px', borderRadius: '6px', marginBottom: '12px' }}>
                    {[{ v: 'left', icon: '⬅' }, { v: 'center', icon: '↔' }, { v: 'right', icon: '➡' }, { v: 'justify', icon: '≡' }].map(a => (
                      <button key={a.v} onClick={() => updateElement(selectedElement.id, { textAlign: a.v as any })}
                        style={{ flex: 1, padding: '5px', background: selectedElement.textAlign === a.v ? '#E87722' : 'transparent', color: selectedElement.textAlign === a.v ? '#FFF' : 'rgba(255,255,255,0.4)', border: 'none', borderRadius: '4px', fontSize: '14px', cursor: 'pointer' }}>
                        {a.icon}
                      </button>
                    ))}
                  </div>

                  {/* Tamanho e Largura */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                    {[
                      { label: 'Tamanho (px)', key: 'fontSize' as const, min: 12, max: 300, val: selectedElement.fontSize ?? 72 },
                      { label: 'Largura (px)', key: 'width' as const, min: 100, max: 1900, val: selectedElement.width ?? 900 },
                    ].map(f => (
                      <div key={f.key}>
                        <label style={labelStyle}>{f.label}</label>
                        <input type="number" value={f.val} min={f.min} max={f.max}
                          onChange={e => updateElement(selectedElement.id, { [f.key]: parseInt(e.target.value) })}
                          style={{ width: '100%', background: 'rgba(255,255,255,0.05)', color: '#F9FAFB', border: '1px solid rgba(255,255,255,0.1)', padding: '6px 8px', borderRadius: '5px', boxSizing: 'border-box', fontSize: '12px' }} />
                      </div>
                    ))}
                  </div>

                  {/* Line-height & Letter-spacing */}
                  {[
                    { label: `Entrelinha: ${(selectedElement.lineHeight ?? 1.15).toFixed(2)}`, key: 'lineHeight' as const, min: 0.7, max: 2.5, step: 0.05, val: selectedElement.lineHeight ?? 1.15 },
                    { label: `Espaço letras: ${selectedElement.letterSpacing ?? 0}px`, key: 'letterSpacing' as const, min: -3, max: 20, step: 0.5, val: selectedElement.letterSpacing ?? 0 },
                  ].map(s => (
                    <div key={s.key} style={{ marginBottom: '10px' }}>
                      <label style={labelStyle}>{s.label}</label>
                      <input type="range" min={s.min} max={s.max} step={s.step} value={s.val}
                        onChange={e => updateElement(selectedElement.id, { [s.key]: parseFloat(e.target.value) })}
                        style={{ width: '100%', accentColor: '#E87722' }} />
                    </div>
                  ))}

                  {/* Cor do Texto */}
                  <label style={labelStyle}>Cor do Texto</label>
                  <ColorPicker value={selectedElement.color ?? '#FEFEFB'} onChange={v => updateElement(selectedElement.id, { color: v })} />

                  <Divider />
                  <DangerButton label="Apagar Texto" onClick={deleteSelectedElement} />
                </div>
              )}

              {/* Propriedades de Imagem */}
              {selectedElement?.type === 'image' && selectedElement.subtype !== 'background' && (
                <div>
                  <SectionHeader color="#0762C8" label="Imagem" />
                  {selectedElement.content.endsWith('.svg') && (
                    <>
                      <label style={labelStyle}>Pigmento Vetorial</label>
                      <ColorPicker value={selectedElement.color ?? '#FEFEFB'} onChange={v => updateElement(selectedElement.id, { color: v })} />
                    </>
                  )}
                  <label style={{ ...labelStyle, marginTop: '12px' }}>Largura: {selectedElement.width}px</label>
                  <input type="range" min={50} max={1800} value={selectedElement.width ?? 300} onChange={e => updateElement(selectedElement.id, { width: parseInt(e.target.value) })} style={{ width: '100%', accentColor: '#E87722' }} />
                  <Divider />
                  <DangerButton label="Apagar Imagem" onClick={deleteSelectedElement} />
                </div>
              )}

              {/* Fundo da Lâmina + Configuração de Roteiro */}
              {!selectedElement && currentSlide && (
                <div>
                  {/* Cor de Fundo */}
                  <SectionHeader color="#E87722" label="Fundo da Lâmina" />
                  {currentBg && (
                    <div style={{ marginBottom: '12px', padding: '8px', background: 'rgba(255,255,255,0.04)', borderRadius: '7px', border: '1px solid rgba(255,255,255,0.07)' }}>
                      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginBottom: '5px' }}>Fundo de imagem ativo:</div>
                      <img src={currentBg.content} style={{ width: '100%', height: '52px', objectFit: 'cover', borderRadius: '4px', display: 'block' }} />
                      <button onClick={() => updateSlide({ ...currentSlide, elements: currentSlide.elements.filter(e => e.subtype !== 'background') })}
                        style={{ width: '100%', marginTop: '6px', padding: '5px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#F87171', borderRadius: '5px', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}>
                        Remover Fundo de Imagem
                      </button>
                    </div>
                  )}
                  <label style={labelStyle}>Cor de Fundo</label>
                  <ColorPicker value={currentSlide.backgroundColor} onChange={v => updateSlide({ ...currentSlide, backgroundColor: v })} />

                  <Divider />

                  {/* ─── CONFIGURAÇÃO DO ROTEIRO ─── */}
                  <SectionHeader color="#2DCCD3" label="Configuração do Roteiro" />
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
                    {/* Toggle Dinâmico / Estático */}
                    <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.05)', padding: '3px', borderRadius: '6px', marginBottom: '12px' }}>
                      <button onClick={() => updateSlide({ ...currentSlide, isDynamic: true })}
                        style={{ flex: 1, padding: '7px', background: currentSlide.isDynamic !== false ? '#2DCCD3' : 'transparent', color: currentSlide.isDynamic !== false ? '#0A0B10' : 'rgba(255,255,255,0.4)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 700, fontSize: '12px' }}>
                        ⚡ Dinâmico
                      </button>
                      <button onClick={() => updateSlide({ ...currentSlide, isDynamic: false })}
                        style={{ flex: 1, padding: '7px', background: currentSlide.isDynamic === false ? '#E87722' : 'transparent', color: currentSlide.isDynamic === false ? '#FFF' : 'rgba(255,255,255,0.4)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 700, fontSize: '12px' }}>
                        📌 Estático
                      </button>
                    </div>

                    {currentSlide.isDynamic !== false ? (
                      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
                        <span style={{ color: '#2DCCD3', fontWeight: 700 }}>⚡ Dinâmico</span> — o roteiro injeta variáveis Jinja (<code style={{ color: '#E87722' }}>{'{{ nome }}'}</code> etc.) neste slide. A duração é calculada automaticamente pelo áudio.
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5, marginBottom: '10px' }}>
                          <span style={{ color: '#E87722', fontWeight: 700 }}>📌 Estático</span> — slide fixo, sem variáveis. Define a duração abaixo.
                        </div>
                        <label style={labelStyle}>Duração: {currentSlide.duration ?? 5}s</label>
                        <input type="range" min={1} max={30} step={0.5} value={currentSlide.duration ?? 5}
                          onChange={e => updateSlide({ ...currentSlide, duration: parseFloat(e.target.value) })}
                          style={{ width: '100%', accentColor: '#E87722' }} />
                      </div>
                    )}
                  </div>

                  <Divider />
                  {currentSlide.elements.some(x => x.type === 'raw-html') && (
                    <button onClick={() => updateSlide({ ...currentSlide, elements: currentSlide.elements.filter(x => x.type !== 'raw-html') })}
                      style={{ width: '100%', marginBottom: '8px', padding: '8px', background: 'rgba(245,158,11,0.08)', color: '#FBBF24', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}>
                      Limpar Fundo Legado (GrapesJS)
                    </button>
                  )}
                  <DangerButton label="Excluir Lâmina Inteira" onClick={deleteCurrentSlide} />
                </div>
              )}

              {/* Módulo Legado */}
              {selectedElement?.type === 'raw-html' && (
                <div>
                  <SectionHeader color="#FFCD00" label="Bloco Legado" />
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5, marginBottom: '10px' }}>
                    Slide do editor antigo. Edite o código ou clique direto no canvas.
                  </p>
                  <textarea value={selectedElement.content} onChange={e => updateElement(selectedElement.id, { content: e.target.value })}
                    style={{ width: '100%', minHeight: '200px', background: '#0A0B10', color: '#10B981', border: '1px solid rgba(255,255,255,0.05)', padding: '8px', borderRadius: '6px', fontFamily: 'monospace', fontSize: '10px', resize: 'vertical', boxSizing: 'border-box' }} />
                  <Divider />
                  <DangerButton label="Excluir Bloco Legado" onClick={deleteSelectedElement} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Micro-componentes de UI ──────────────────────────────────────────────────
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '11px', fontWeight: 600,
  color: 'rgba(255,255,255,0.4)', marginBottom: '5px',
  textTransform: 'uppercase', letterSpacing: '0.5px'
};

function SectionHeader({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
      <div style={{ width: '3px', height: '14px', background: color, borderRadius: '3px' }} />
      <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#F9FAFB' }}>{label}</h3>
    </div>
  );
}

function Divider() {
  return <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)', margin: '14px 0' }} />;
}

function DangerButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ width: '100%', padding: '8px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#F87171', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}>
      {label}
    </button>
  );
}
