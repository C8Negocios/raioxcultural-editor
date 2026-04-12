'use client';

import React, { useEffect, useRef, useState } from 'react';
import { apiGet, apiPut } from '../lib/api';
import c8Assets from './c8-assets.json';

type ElementType = 'text' | 'image' | 'raw-html';

// ============ PALETA OFICIAL C8 BRAND ============
// Extraída do SVG "PALETA DE CORES.svg" da pasta "2. Código de Cores"
const C8_COLOR_FAMILIES = [
  {
    family: 'Neutros',
    colors: [
      { name: 'Cream', hex: '#FEFEFB' },
      { name: 'Off-White', hex: '#EAEAE6' },
      { name: 'Cinza Claro', hex: '#C1C1BB' },
      { name: 'Cinza Médio', hex: '#7E7E7A' },
      { name: 'Cinza', hex: '#51514E' },
      { name: 'Grafite', hex: '#444441' },
      { name: 'Escuro', hex: '#363634' },
      { name: 'Carvão', hex: '#292927' },
      { name: 'Quase Preto', hex: '#1B1B1A' },
      { name: 'Preto C8', hex: '#101010' },
    ]
  },
  {
    family: 'Midnight Code',
    colors: [
      { name: 'Azul C8 Principal', hex: '#00205B' },
      { name: 'Azul Navy', hex: '#001440' },
      { name: 'Azul Médio', hex: '#034F8C' },
      { name: 'Azul Claro', hex: '#0082C3' },
    ]
  },
  {
    family: 'Pulse Core',
    colors: [
      { name: 'Azul Elétrico', hex: '#0762C8' },
      { name: 'Azul Intenso', hex: '#0449A0' },
      { name: 'Azul Suave', hex: '#4A90D9' },
      { name: 'Sky Blue', hex: '#62B5E5' },
    ]
  },
  {
    family: 'Embergate',
    colors: [
      { name: 'Cobre C8', hex: '#E87722' },
      { name: 'Cobre Escuro', hex: '#B05510' },
      { name: 'Cobre Claro', hex: '#F4A86A' },
    ]
  },
  {
    family: 'Solar Link',
    colors: [
      { name: 'Amarelo C8', hex: '#FFCD00' },
      { name: 'Ouro', hex: '#DAAA00' },
      { name: 'Mel', hex: '#FFE566' },
    ]
  },
  {
    family: 'Aquasync',
    colors: [
      { name: 'Turquesa C8', hex: '#2DCCD3' },
      { name: 'Turquesa Escuro', hex: '#1A9DA3' },
      { name: 'Turquesa Claro', hex: '#7DE5E9' },
    ]
  },
];

// Flat list para compatibilidade com os campos de cor existentes
const C8_COLORS_FLAT = C8_COLOR_FAMILIES.flatMap(f => f.colors.map(c => c.hex));

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
  color?: string;
  fontWeight?: string;
  textAlign?: 'left'|'center'|'right';
  zIndex: number;
}

interface SlideDef {
  filename: string; 
  elements: FrameElement[];
  backgroundColor: string;
}

export default function StudioEditor({ funnelId = "raiox-cultural" }: { funnelId?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [slides, setSlides] = useState<SlideDef[]>([]);
  const [selectedSlideIndex, setSelectedSlideIndex] = useState(0);
  const [scale, setScale] = useState(0.5);
  const [saving, setSaving] = useState(false);
  
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x:0, y:0, ex:0, ey:0 });

  const [rightTab, setRightTab] = useState<'assets' | 'props'>('assets');
  const [visibleAssets, setVisibleAssets] = useState({ bg: 6, gr: 8, lg: 8 });

  // ============== 1. Initialization ==============
  useEffect(() => {
    apiGet(`/api/config/funnels/${funnelId}/templates`).then((res: any[]) => {
      if (res.length > 0) {
        const loadedSlides: SlideDef[] = res.map(t => {
            const match = t.content.match(/<script type="application\/json" id="c8-state">([\s\S]*?)<\/script>/);
            if (match) {
                try {
                    const jsonStr = decodeURIComponent(atob(match[1]));
                    return JSON.parse(jsonStr) as SlideDef;
                } catch(e) { console.error("Falha ao parsear canvas block", e); }
            }
            return {
                filename: t.filename,
                backgroundColor: "#101010",
                elements: [{
                    id: Math.random().toString(36).substr(2,9),
                    type: "raw-html", content: t.content,
                    x: 0, y: 0, width: 1920, height: 1080, zIndex: -1
                }]
            };
        });
        loadedSlides.sort((a,b) => a.filename.localeCompare(b.filename));
        setSlides(loadedSlides);
      } else {
        setSlides([{ filename: 'slide_01_cover.html', backgroundColor: '#00205B', elements: [] }]);
      }
    }).catch(console.error);
  }, [funnelId]);

  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      const padding = 80;
      const scaleX = (clientWidth - padding) / 1920;
      const scaleY = (clientHeight - padding) / 1080;
      setScale(Math.min(scaleX, scaleY));
    };
    setTimeout(handleResize, 50);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);


  // ============== 2. Ações do Sistema de Slides ==============
  const addSlide = async () => {
     const nextNum = slides.length + 1;
     const filename = `slide_${nextNum.toString().padStart(2, '0')}.html`;
     const newS: SlideDef = { filename, backgroundColor: '#00205B', elements: [] };
     setSlides([...slides, newS]);
     setSelectedSlideIndex(slides.length);
     await handleSaveWorkspace(newS, true);
  };

  const duplicateAsVariant = async () => {
     const current = slides[selectedSlideIndex];
     const suffix = prompt("Nome da Variação Lógica (ex: score_0_20, error, null):");
     if (!suffix) return;
     const baseName = current.filename.replace('.html', '');
     const filename = `${baseName}_${suffix}.html`;
     const newS: SlideDef = { 
        filename, 
        backgroundColor: current.backgroundColor, 
        elements: JSON.parse(JSON.stringify(current.elements)) 
     };
     setSlides([...slides, newS]);
     setSelectedSlideIndex(slides.length);
     await handleSaveWorkspace(newS, true);
  };

  const deleteCurrentSlide = () => {
     if(slides.length <= 1) { alert("Não pode deletar o último slide"); return; }
     if(confirm("Deseja realmente excluir irreversivelmente este slide?")) {
        const idToDelete = selectedSlideIndex;
        setSlides(slides.filter((_, idx) => idx !== idToDelete));
        setSelectedSlideIndex(Math.max(0, idToDelete - 1));
     }
  };


  // ============== 3. Ações do Canvas e Drag/Drop ==============
  const getSelectedSlide = () => slides[selectedSlideIndex];
  
  const updateSlide = (newSlide: SlideDef) => {
      setSlides(slides.map((s, idx) => idx === selectedSlideIndex ? newSlide : s));
  };

  const updateElement = (elId: string, changes: Partial<FrameElement>) => {
      const s = getSelectedSlide();
      if(!s) return;
      updateSlide({
          ...s,
          elements: s.elements.map(el => el.id === elId ? { ...el, ...changes } : el)
      });
  };

  const addTextElement = () => {
     const s = getSelectedSlide();
     if(!s) return;
     const newEl: FrameElement = {
         id: Math.random().toString(36).substr(2,9),
         type: 'text',
         content: '{{ empresa }}, escreva algo...',
         x: 120, y: 300, width: 900,
         fontSize: 72, color: '#FEFEFB', fontWeight: '700', textAlign: 'left',
         zIndex: s.elements.length + 1
     };
     updateSlide({ ...s, elements: [...s.elements, newEl] });
     setSelectedElementId(newEl.id);
     setRightTab('props');
  };

  // Inserir fundo — substitui o fundo existente se houver
  const addBackgroundElement = (url: string) => {
    const s = getSelectedSlide();
    if (!s) return;
    const bgId = Math.random().toString(36).substr(2, 9);
    const newBg: FrameElement = {
      id: bgId,
      type: 'image',
      subtype: 'background',
      content: url,
      x: 0, y: 0, width: 1920, height: 1080,
      zIndex: 0
    };
    // Remove qualquer fundo anterior e insere o novo
    const withoutBg = s.elements.filter(el => el.subtype !== 'background');
    updateSlide({ ...s, elements: [newBg, ...withoutBg] });
    // Não selecionamos o fundo para não travar o editor
    setRightTab('assets');
  };

  const addImageElement = (url: string, subtype: 'graphic' | 'logo' = 'graphic') => {
     const s = getSelectedSlide();
     if(!s) return;
     const defaultWidth = subtype === 'logo' ? 300 : 400;
     const newEl: FrameElement = {
         id: Math.random().toString(36).substr(2,9),
         type: 'image',
         subtype,
         content: url,
         x: 400, y: 300, width: defaultWidth,
         zIndex: s.elements.length + 1
     };
     updateSlide({ ...s, elements: [...s.elements, newEl] });
     setSelectedElementId(newEl.id);
     setRightTab('props');
  };

  const deleteSelectedElement = () => {
     if(!selectedElementId) return;
     const s = getSelectedSlide();
     updateSlide({
         ...s,
         elements: s.elements.filter(el => el.id !== selectedElementId)
     });
     setSelectedElementId(null);
  };

  useEffect(() => {
     const handleKeyDown = (e: KeyboardEvent) => {
         if (e.key === 'Delete' && selectedElementId && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
            deleteSelectedElement();
         }
     };
     window.addEventListener('keydown', handleKeyDown);
     return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElementId, slides, selectedSlideIndex]);

  const handleMouseDown = (e: React.MouseEvent, el: FrameElement) => {
     e.stopPropagation();
     setSelectedElementId(el.id);
     setIsDragging(true);
     dragStart.current = { x: e.clientX, y: e.clientY, ex: el.x, ey: el.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !selectedElementId) return;
    const dx = (e.clientX - dragStart.current.x) / scale;
    const dy = (e.clientY - dragStart.current.y) / scale;
    updateElement(selectedElementId, {
        x: dragStart.current.ex + dx,
        y: dragStart.current.ey + dy,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // ============== 4. Compilação e Gravação ==============
  const compileHtml = (slide: SlideDef) => {
      const stateData = btoa(encodeURIComponent(JSON.stringify(slide)));

      let inner = '';
      // Elemento de fundo (zIndex 0) renderizado primeiro
      const bgEl = slide.elements.find(el => el.subtype === 'background');
      if (bgEl) {
        inner += `<img src="${bgEl.content}" style="position:absolute; top:0; left:0; width:1920px; height:1080px; object-fit:cover; z-index:0; pointer-events:none;" />\n`;
      }

      for (const el of slide.elements) {
         if (el.subtype === 'background') continue; // já renderizado acima
         
         if (el.type === 'raw-html') {
             inner += `<div style="position:absolute; width:1920px; height:1080px; top:0; left:0; z-index:${el.zIndex}">${el.content}</div>\n`;
         } else if (el.type === 'text') {
             const safeText = el.content.replace(/\n/g, '<br/>');
             inner += `<div style="position:absolute; left:${Math.round(el.x)}px; top:${Math.round(el.y)}px; width:${el.width}px; font-size:${el.fontSize}px; color:${el.color}; font-weight:${el.fontWeight}; text-align:${el.textAlign}; font-family:'Unitea Sans', sans-serif; line-height:1.2; z-index:${el.zIndex}">${safeText}</div>\n`;
         } else if (el.type === 'image') {
             if (el.content.endsWith('.svg') && el.color) {
                 inner += `<div style="position:absolute; left:${Math.round(el.x)}px; top:${Math.round(el.y)}px; width:${el.width}px; z-index:${el.zIndex}; pointer-events:none;">\n`;
                 inner += `    <img src="${el.content}" style="width:100%; height:auto; display:block; opacity:0;" />\n`;
                 inner += `    <div style="position:absolute; top:0; left:0; width:100%; height:100%; background-color:${el.color}; -webkit-mask-image:url('${el.content}'); mask-image:url('${el.content}'); -webkit-mask-size:contain; mask-size:contain; -webkit-mask-repeat:no-repeat; mask-repeat:no-repeat; -webkit-mask-position:center; mask-position:center;"></div>\n`;
                 inner += `</div>\n`;
             } else {
                 inner += `<img src="${el.content}" style="position:absolute; left:${Math.round(el.x)}px; top:${Math.round(el.y)}px; width:${el.width}px; height:auto; z-index:${el.zIndex}; pointer-events:none;" />\n`;
             }
         }
      }
   
      const bgStyle = slide.backgroundColor.startsWith('#') || slide.backgroundColor.startsWith('rgb')
        ? `background: ${slide.backgroundColor};`
        : `background: ${slide.backgroundColor} center/cover no-repeat;`;

      return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <style>
    @font-face { font-family: 'Unitea Sans'; src: url('/fonts/Unitea Sans/UniteaSans-Regular.ttf') format('truetype'); font-weight: 400; }
    @font-face { font-family: 'Unitea Sans'; src: url('/fonts/Unitea Sans/UniteaSans-Bold.ttf') format('truetype'); font-weight: 700; }
    body { margin: 0; padding: 0; font-family: 'Unitea Sans', sans-serif; ${bgStyle} overflow:hidden; }
    .c8-canvas { width: 1920px; height: 1080px; position:relative; overflow:hidden; }
  </style>
</head>
<body>
  <div class="c8-canvas">
${inner}  </div>
  <script type="application/json" id="c8-state">${stateData}</script>
</body>
</html>`;
  };

  const handleSaveWorkspace = async (slideParam?: SlideDef, hideAlert?: boolean) => {
     setSaving(true);
     try {
         const slide = slideParam || getSelectedSlide();
         if (!slide) return;
         
         const payload = {
             filename: slide.filename,
             content: compileHtml(slide)
         };
         
         await apiPut(`/api/config/funnels/${funnelId}/templates/${slide.filename}`, payload);

         try {
             const baseNumMatch = slide.filename.match(/slide_0*(\d+)/);
             if (baseNumMatch) {
                 const num = parseInt(baseNumMatch[1], 10);
                 const configRes = await apiGet(`/api/config/funnels/${funnelId}/slides`);
                 
                 if (configRes && configRes.order) {
                     const currentOrder: number[] = configRes.order;
                     if (!currentOrder.includes(num)) {
                         const newOrder = [...currentOrder, num];
                         const durations: Record<string, number> = {};
                         if (configRes.slides) {
                             configRes.slides.forEach((s: any) => {
                                 if (s.duration) durations[String(s.num)] = s.duration;
                             });
                         }
                         await apiPut(`/api/config/funnels/${funnelId}/slides`, { 
                             order: newOrder,
                             durations: durations
                         });
                     }
                 }
             }
         } catch (e) {
             console.error("Falha ao injetar slide na timeline", e);
         }

         if(!hideAlert) alert("🔥 Design Gravado com Sucesso!");
     } catch (e) {
         console.error(e);
         alert("Falha de gravação.");
     }
     setSaving(false);
  };


  // ============== VIEW RENDER ==============
  const currentSlide = getSelectedSlide();
  const selectedElement = currentSlide?.elements.find(x => x.id === selectedElementId);
  const currentBg = currentSlide?.elements.find(el => el.subtype === 'background');

  return (
    <div style={{ 
      height: '100vh', width: '100%', display: 'flex', flexDirection: 'column', 
      background: '#0E0F14', color: '#E5E7EB', fontFamily: "'Inter', 'Unitea Sans', sans-serif", 
      overflow: 'hidden' 
    }}>
      
      {/* ── HEADER C8 STUDIO ── */}
      <div style={{ 
        height: '56px', padding: '0 20px', 
        background: 'linear-gradient(90deg, #000D24 0%, #00205B 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
        zIndex: 10, flexShrink: 0
      }}>
         <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
             {/* Logo C8 */}
             <div style={{ 
               display: 'flex', alignItems: 'center', gap: '8px',
               borderRight: '1px solid rgba(255,255,255,0.1)', paddingRight: '14px' 
             }}>
               <svg width="28" height="20" viewBox="0 0 28 20" fill="none">
                 <path d="M8.4 0C3.76 0 0 3.58 0 8s3.76 8 8.4 8c2.52 0 4.76-1.04 6.3-2.7l-2.52-2.24C11.28 12 9.92 12.6 8.4 12.6c-2.8 0-5.04-2.06-5.04-4.6S5.6 3.4 8.4 3.4c1.52 0 2.88.6 3.78 1.56l2.52-2.26C13.16 1.04 10.92 0 8.4 0Z" fill="#E87722"/>
                 <path d="M19.6 0c-2.52 0-4.76 1.04-6.3 2.7l2.52 2.24C16.72 4 18.08 3.4 19.6 3.4c2.8 0 5.04 2.06 5.04 4.6s-2.24 4.6-5.04 4.6c-1.52 0-2.88-.6-3.78-1.56l-2.52 2.26C14.84 14.96 17.08 16 19.6 16 24.24 16 28 12.42 28 8s-3.76-8-8.4-8Z" fill="#FEFEFB"/>
               </svg>
               <span style={{ fontSize: '15px', fontWeight: 800, letterSpacing: '-0.3px', color: '#FEFEFB' }}>
                 C8 Studio
               </span>
             </div>
             <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
               {currentSlide?.filename || 'Sem arquivo'}
             </span>
         </div>
         <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button onClick={duplicateAsVariant} style={{ 
              background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)', 
              border: '1px solid rgba(255,255,255,0.1)', padding: '7px 14px', 
              borderRadius: '7px', cursor: 'pointer', fontWeight: 600, fontSize: '12px' 
            }}>
                Duplicar Variável
            </button>
            <button onClick={() => handleSaveWorkspace()} style={{ 
              background: 'linear-gradient(135deg, #E87722, #D96B10)', 
              color: '#fff', border: 'none', padding: '7px 18px', 
              borderRadius: '7px', cursor: 'pointer', fontWeight: 700, fontSize: '12px',
              boxShadow: '0 4px 12px rgba(232, 119, 34, 0.35)',
              display: 'flex', alignItems: 'center', gap: '6px'
            }}>
                {saving ? '⏳ Salvando...' : '💾 Salvar Lâmina'}
            </button>
         </div>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
         
         {/* ── SIDEBAR ESQUERDA: ROTEIRO VISUAL ── */}
         <div style={{ 
           width: '220px', flexShrink: 0, 
           background: '#12141C', 
           borderRight: '1px solid rgba(255,255,255,0.06)', 
           display: 'flex', flexDirection: 'column', zIndex: 5
         }}>
            <div style={{ padding: '14px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: '10px' }}>
                  Roteiro Visual
                </div>
                <button 
                  onClick={addSlide} 
                  style={{ 
                    width: '100%', background: 'rgba(232, 119, 34, 0.1)', 
                    border: '1px dashed rgba(232, 119, 34, 0.3)', 
                    color: '#E87722', padding: '9px', borderRadius: '7px', 
                    cursor: 'pointer', fontWeight: 600, fontSize: '12px'
                  }}
                >
                   + Nova Lâmina
                </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px 8px' }}>
                {slides.map((s, idx) => {
                    const isActive = selectedSlideIndex === idx;
                    const hasBg = s.elements.some(el => el.subtype === 'background');
                    return (
                    <div 
                        key={idx} 
                        onClick={() => { setSelectedSlideIndex(idx); setSelectedElementId(null); }}
                        style={{ 
                            padding: '10px', 
                            background: isActive ? 'rgba(232,119,34,0.12)' : 'transparent',
                            borderRadius: '7px', 
                            marginBottom: '4px', 
                            cursor: 'pointer', 
                            border: isActive ? '1px solid rgba(232,119,34,0.35)' : '1px solid transparent',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px'
                        }}
                    >
                        <div style={{ 
                          width: '22px', height: '22px', borderRadius: '5px', 
                          background: isActive ? '#E87722' : 'rgba(255,255,255,0.07)', 
                          color: isActive ? '#FFF' : 'rgba(255,255,255,0.4)', 
                          display: 'flex', alignItems: 'center', justifyContent: 'center', 
                          fontSize: '10px', fontWeight: 700, flexShrink: 0
                        }}>
                            {idx + 1}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ 
                            fontSize: '12px', fontWeight: isActive ? 600 : 400, 
                            color: isActive ? '#F9FAFB' : 'rgba(255,255,255,0.5)', 
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' 
                          }}>
                              {s.filename.replace('.html', '').replace('slide_', 'L')}
                          </div>
                          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', marginTop: '1px' }}>
                            {s.elements.filter(e => e.type !== 'raw-html').length} elementos {hasBg ? '· 🖼️' : ''}
                          </div>
                        </div>
                    </div>
                );})}
            </div>
         </div>

         {/* ── CANVAS (MEIO) ── */}
         <div 
             ref={containerRef}
             style={{ 
                 flex: 1, minWidth: 0, minHeight: 0, 
                 backgroundColor: '#0A0B10', 
                 backgroundImage: 'radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)', 
                 backgroundSize: '28px 28px',
                 position: 'relative', overflow: 'hidden', 
                 display: 'flex', alignItems: 'center', justifyContent: 'center' 
             }}
             onMouseMove={handleMouseMove}
             onMouseUp={handleMouseUp}
             onMouseLeave={handleMouseUp}
             onMouseDown={() => setSelectedElementId(null)}
         >
             {!currentSlide && (
               <div style={{ color: 'rgba(255,255,255,0.2)', fontWeight: 500 }}>
                 Crie ou selecione uma lâmina para começar.
               </div>
             )}
             
             {currentSlide && (
                 <div style={{
                     width: 1920 * scale, height: 1080 * scale,
                     position: 'relative',
                 }}>
                     {/* Sombra e borda */}
                     <div style={{ 
                         position: 'absolute', inset: 0, 
                         boxShadow: '0 30px 80px -10px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.05)', 
                         pointerEvents: 'none', zIndex: 200
                     }}/>

                     {/* Canvas Area Real */}
                     <div style={{
                         width: '1920px', height: '1080px',
                         background: currentSlide.backgroundColor,
                         transform: `scale(${scale})`,
                         transformOrigin: 'top left',
                         position: 'absolute', top: 0, left: 0,
                         overflow: 'hidden'
                     }}>
                         {/* Fundo (background element) renderizado separado para garantir cobertura total */}
                         {currentBg && (
                           <img
                             src={currentBg.content}
                             draggable={false}
                             style={{
                               position: 'absolute', top: 0, left: 0,
                               width: '100%', height: '100%',
                               objectFit: 'cover', zIndex: 0,
                               pointerEvents: 'none',
                               display: 'block'
                             }}
                           />
                         )}

                         {currentSlide.elements.map(el => {
                             if (el.subtype === 'background') return null; // já renderizado
                             const isSelected = el.id === selectedElementId;
                             
                             if (el.type === 'raw-html') {
                                  return (
                                     <div 
                                         key={el.id} 
                                         onMouseDown={() => setSelectedElementId(el.id)}
                                         contentEditable={true}
                                         suppressContentEditableWarning={true}
                                         onBlur={(e) => {
                                             updateElement(el.id, { content: e.currentTarget.innerHTML });
                                         }}
                                         dangerouslySetInnerHTML={{ __html: el.content }}
                                         style={{ 
                                             position: 'absolute', top:0, left:0, width: '1920px', height:'1080px', 
                                             zIndex: el.zIndex,
                                             border: isSelected ? '3px dashed rgba(232,119,34,0.8)' : 'none',
                                             outline: 'none',
                                             cursor: 'text'
                                         }} 
                                     />
                                  );
                             }

                             return (
                                <div
                                   key={el.id}
                                   onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, el); }}
                                   onClick={(e) => e.stopPropagation()}
                                   style={{
                                       position: 'absolute',
                                       left: el.x, top: el.y,
                                       width: el.width,
                                       height: el.type === 'image' ? el.height : undefined,
                                       zIndex: el.zIndex,
                                       cursor: isDragging ? 'grabbing' : 'grab',
                                       border: isSelected ? '2px dashed rgba(232,119,34,0.9)' : '2px solid transparent',
                                       boxSizing: 'border-box',
                                       transition: isDragging ? 'none' : 'border 0.15s ease',
                                   }}
                                >
                                    {isSelected && (
                                        <>
                                            <div style={{ position: 'absolute', top: '-5px', left: '-5px', width: '10px', height: '10px', background: '#E87722', borderRadius: '50%' }}/>
                                            <div style={{ position: 'absolute', top: '-5px', right: '-5px', width: '10px', height: '10px', background: '#E87722', borderRadius: '50%' }}/>
                                            <div style={{ position: 'absolute', bottom: '-5px', left: '-5px', width: '10px', height: '10px', background: '#E87722', borderRadius: '50%' }}/>
                                            <div style={{ position: 'absolute', bottom: '-5px', right: '-5px', width: '10px', height: '10px', background: '#E87722', borderRadius: '50%' }}/>
                                        </>
                                    )}

                                    {el.type === 'text' && (
                                       <div style={{
                                           color: el.color, fontSize: el.fontSize, fontWeight: el.fontWeight,
                                           textAlign: el.textAlign, fontFamily: "'Unitea Sans', sans-serif",
                                           lineHeight: 1.15, width: '100%', userSelect: 'none'
                                       }}>
                                           {el.content.split('\n').map((line, i) => <React.Fragment key={i}>{line}<br/></React.Fragment>)}
                                       </div>
                                    )}
                                    {el.type === 'image' && (
                                       <div style={{ position: 'relative', width: '100%', display: 'flex' }}>
                                           <img src={el.content} draggable={false} style={{ width: '100%', height: 'auto', display: 'block', pointerEvents: 'none', opacity: (el.content.endsWith('.svg') && el.color) ? 0 : 1, objectFit: 'contain' }} />
                                           {(el.content.endsWith('.svg') && el.color) && (
                                               <div style={{ 
                                                   position: 'absolute', inset: 0,
                                                   backgroundColor: el.color,
                                                   maskImage: `url('${el.content}')`, maskSize: 'contain', maskRepeat: 'no-repeat', maskPosition: 'center',
                                                   WebkitMaskImage: `url('${el.content}')`, WebkitMaskSize: 'contain', WebkitMaskRepeat: 'no-repeat', WebkitMaskPosition: 'center',
                                                   pointerEvents: 'none'
                                               }} />
                                           )}
                                       </div>
                                    )}
                                </div>
                             );
                         })}
                     </div>

                     {/* HUD: Info do canvas */}
                     <div style={{ 
                       position: 'absolute', bottom: '-24px', left: 0, 
                       fontSize: '10px', color: 'rgba(255,255,255,0.25)',
                       fontFamily: 'monospace' 
                     }}>
                       1920 × 1080 · zoom {Math.round(scale * 100)}%
                     </div>
                 </div>
             )}
         </div>

         {/* ── SIDEBAR DIREITA: ATIVOS & PROPS ── */}
         <div style={{ 
           width: '300px', 
           background: '#12141C', 
           borderLeft: '1px solid rgba(255,255,255,0.06)', 
           display: 'flex', flexDirection: 'column', zIndex: 5 
         }}>
             
             {/* Tabs */}
             <div style={{ padding: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
                 <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '7px', padding: '3px', display: 'flex' }}>
                    <button onClick={() => setRightTab('assets')} style={{ 
                      flex: 1, padding: '7px', 
                      background: rightTab === 'assets' ? '#E87722' : 'transparent', 
                      color: rightTab === 'assets' ? '#FFF' : 'rgba(255,255,255,0.4)', 
                      border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 700, fontSize: '12px'
                    }}>🎨 Ativos C8</button>
                    <button onClick={() => setRightTab('props')} style={{ 
                      flex: 1, padding: '7px', 
                      background: rightTab === 'props' ? '#E87722' : 'transparent', 
                      color: rightTab === 'props' ? '#FFF' : 'rgba(255,255,255,0.4)', 
                      border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 700, fontSize: '12px'
                    }}>⚙️ Ajustes</button>
                 </div>
             </div>

             {/* ── TELA: BIBLIOTECA DE ATIVOS ── */}
             {rightTab === 'assets' && (
                <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
                    
                    {/* Botão Adicionar Texto */}
                    <button onClick={addTextElement} style={{ 
                      width: '100%', padding: '10px', 
                      background: 'rgba(255, 255, 255, 0.04)', 
                      color: 'rgba(255,255,255,0.7)', 
                      border: '1px dashed rgba(255,255,255,0.15)', 
                      borderRadius: '7px', cursor: 'pointer', fontWeight: 600, 
                      marginBottom: '16px', fontSize: '13px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                    }}>
                        ✏️ Adicionar Texto Livre
                    </button>

                    {/* Seção: Fundos e Texturas */}
                    <div style={{ marginBottom: '20px' }}>
                        <div style={{ 
                          display: 'flex', alignItems: 'center', gap: '6px', 
                          marginBottom: '10px' 
                        }}>
                          <div style={{ width: '3px', height: '12px', background: '#E87722', borderRadius: '2px' }}/>
                          <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'rgba(255,255,255,0.4)' }}>
                            Fundos & Texturas 3D
                          </span>
                          {currentBg && (
                            <span style={{ marginLeft: 'auto', fontSize: '9px', color: '#E87722', fontWeight: 600 }}>
                              ● ATIVO
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                            {c8Assets.backgrounds.slice(0, visibleAssets.bg).map((bg) => (
                               <div 
                                 key={bg.id} 
                                 onClick={() => addBackgroundElement(bg.url)}
                                 title={bg.id}
                                 style={{ 
                                   background: '#1A1D28', border: '1px solid rgba(255,255,255,0.07)', 
                                   borderRadius: '6px', overflow: 'hidden', cursor: 'pointer', 
                                   height: '50px', position: 'relative',
                                   transition: 'border-color 0.15s'
                                 }} 
                                 onMouseEnter={(e) => e.currentTarget.style.borderColor = '#E87722'}
                                 onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'}
                               >
                                  <img src={bg.url} loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                               </div>
                            ))}
                        </div>
                        {visibleAssets.bg < c8Assets.backgrounds.length && (
                            <button onClick={() => setVisibleAssets(v => ({...v, bg: v.bg + 6}))} style={{ width: '100%', padding: '6px', marginTop: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.35)', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}>Carregar Mais (+6)</button>
                        )}
                    </div>

                    {/* Seção: Grafismos */}
                    <div style={{ marginBottom: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                          <div style={{ width: '3px', height: '12px', background: '#0762C8', borderRadius: '2px' }}/>
                          <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'rgba(255,255,255,0.4)' }}>
                            Grafismos de Apoio
                          </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                            {c8Assets.graphics.slice(0, visibleAssets.gr).map((gr) => (
                               <div 
                                 key={gr.id} 
                                 onClick={() => addImageElement(gr.url, 'graphic')}
                                 title={gr.id}
                                 style={{ 
                                   background: gr.id.includes('branco') || gr.id.includes('white') ? '#00205B' : '#1A1D28', 
                                   border: '1px solid rgba(255,255,255,0.07)', 
                                   borderRadius: '6px', padding: '6px', cursor: 'pointer', 
                                   display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                   height: '50px', transition: 'transform 0.1s, border-color 0.15s'
                                 }} 
                                 onMouseEnter={(e) => { e.currentTarget.style.transform='scale(1.05)'; e.currentTarget.style.borderColor='#0762C8'; }}
                                 onMouseLeave={(e) => { e.currentTarget.style.transform='none'; e.currentTarget.style.borderColor='rgba(255,255,255,0.07)'; }}
                               >
                                  <img src={gr.url} loading="lazy" decoding="async" style={{ maxWidth: '100%', maxHeight: '36px', objectFit: 'contain', display: 'block' }} />
                               </div>
                            ))}
                        </div>
                        {visibleAssets.gr < c8Assets.graphics.length && (
                            <button onClick={() => setVisibleAssets(v => ({...v, gr: v.gr + 9}))} style={{ width: '100%', padding: '6px', marginTop: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.35)', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}>Carregar Mais (+9)</button>
                        )}
                    </div>

                    {/* Seção: Logos */}
                    <div style={{ marginBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                          <div style={{ width: '3px', height: '12px', background: '#FFCD00', borderRadius: '2px' }}/>
                          <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'rgba(255,255,255,0.4)' }}>
                            Topologia & Marcas
                          </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                            {c8Assets.logos.slice(0, visibleAssets.lg).map((lg) => (
                               <div 
                                 key={lg.id} 
                                 onClick={() => addImageElement(lg.url, 'logo')}
                                 title={lg.id}
                                 style={{ 
                                   background: lg.id.includes('branco') || lg.id.includes('white') ? '#00205B' : '#1A1D28', 
                                   border: '1px solid rgba(255,255,255,0.07)', 
                                   borderRadius: '6px', padding: '6px', cursor: 'pointer', 
                                   display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                   height: '50px', transition: 'transform 0.1s, border-color 0.15s'
                                 }} 
                                 onMouseEnter={(e) => { e.currentTarget.style.transform='scale(1.05)'; e.currentTarget.style.borderColor='#FFCD00'; }}
                                 onMouseLeave={(e) => { e.currentTarget.style.transform='none'; e.currentTarget.style.borderColor='rgba(255,255,255,0.07)'; }}
                               >
                                  <img src={lg.url} loading="lazy" decoding="async" style={{ maxWidth: '100%', maxHeight: '36px', objectFit: 'contain', display: 'block' }} />
                               </div>
                            ))}
                        </div>
                        {visibleAssets.lg < c8Assets.logos.length && (
                            <button onClick={() => setVisibleAssets(v => ({...v, lg: v.lg + 9}))} style={{ width: '100%', padding: '6px', marginTop: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.35)', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}>Carregar Mais (+9)</button>
                        )}
                    </div>
                </div>
             )}

             {/* ── TELA: PROPRIEDADES ── */}
             {rightTab === 'props' && (
                <div style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>

                    {/* Fundo da Lâmina (nenhum elemento selecionado) */}
                    {!selectedElement && currentSlide && (
                        <div>
                           {/* Fundo da Lâmina */}
                           <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                               <div style={{ width: '3px', height: '14px', background: '#E87722', borderRadius: '3px' }}/>
                               <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#F9FAFB' }}>Fundo da Lâmina</h3>
                           </div>

                           {/* Fundo de imagem atual */}
                           {currentBg && (
                             <div style={{ marginBottom: '14px', padding: '10px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.07)' }}>
                               <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginBottom: '6px' }}>Fundo Ativo:</div>
                               <img src={currentBg.content} style={{ width: '100%', height: '58px', objectFit: 'cover', borderRadius: '5px', display: 'block' }} />
                               <button onClick={() => { 
                                 const s = getSelectedSlide();
                                 if (s) updateSlide({ ...s, elements: s.elements.filter(el => el.subtype !== 'background') });
                               }} style={{ width: '100%', marginTop: '8px', padding: '6px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#F87171', borderRadius: '5px', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}>Remover Fundo de Imagem</button>
                             </div>
                           )}

                           {/* Cor de Fundo */}
                           <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                             Cor de Fundo
                           </label>
                           
                           {/* Paleta de cores completa por família */}
                           {C8_COLOR_FAMILIES.map(family => (
                             <div key={family.family} style={{ marginBottom: '10px' }}>
                               <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', marginBottom: '5px', fontWeight: 600 }}>
                                 {family.family}
                               </div>
                               <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                 {family.colors.map(c => (
                                   <div 
                                     key={c.hex} 
                                     onClick={() => updateSlide({...currentSlide, backgroundColor: c.hex})}
                                     title={`${c.name} ${c.hex}`}
                                     style={{ 
                                       width: '22px', height: '22px', borderRadius: '5px', 
                                       background: c.hex, cursor: 'pointer', 
                                       border: currentSlide.backgroundColor === c.hex 
                                         ? '2px solid #E87722' 
                                         : '1px solid rgba(255,255,255,0.1)',
                                       boxSizing: 'border-box'
                                     }} 
                                   />
                                 ))}
                               </div>
                             </div>
                           ))}

                           {/* Input de cor manual */}
                           <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.04)', padding: '8px', borderRadius: '7px', border: '1px solid rgba(255,255,255,0.08)', marginTop: '10px' }}>
                               <input type="color" value={currentSlide.backgroundColor.startsWith('#') ? currentSlide.backgroundColor : '#00205B'} onChange={(e) => updateSlide({...currentSlide, backgroundColor: e.target.value})} style={{ width: '28px', height: '28px', cursor: 'pointer', border: 'none', padding: 0, background: 'transparent', borderRadius: '4px' }} />
                               <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>
                                 {currentSlide.backgroundColor.toUpperCase()}
                               </span>
                           </div>
                           
                           <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)', margin: '20px 0' }} />

                           <div style={{ fontSize: '11px', fontWeight: 700, color: '#F87171', textTransform: 'uppercase', marginBottom: '10px' }}>
                             Zona de Perigo
                           </div>

                           {currentSlide.elements.some(x => x.type === 'raw-html') && (
                               <button onClick={() => updateSlide({...currentSlide, elements: currentSlide.elements.filter(x => x.type !== 'raw-html')})} style={{ marginBottom: '8px', width: '100%', padding: '9px', background: 'rgba(245, 158, 11, 0.08)', color: '#FBBF24', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '7px', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}>Limpar Fundo Legado (GrapesJS)</button>
                           )}

                           <button onClick={deleteCurrentSlide} style={{ width: '100%', padding: '9px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#F87171', borderRadius: '7px', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}>Excluir Lâmina Inteira</button>
                        </div>
                    )}

                    {/* Propriedades de Imagem */}
                    {selectedElement && selectedElement.type === 'image' && selectedElement.subtype !== 'background' && (
                        <div>
                           <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                               <div style={{ width: '3px', height: '14px', background: '#0762C8', borderRadius: '3px' }}/>
                               <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#F9FAFB' }}>Ajustar Imagem</h3>
                           </div>
                           
                           {selectedElement.content.endsWith('.svg') && (
                               <div style={{ marginBottom: '16px' }}>
                                   <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pigmento Vetorial</label>
                                   <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
                                      {C8_COLORS_FLAT.slice(0, 20).map(c => (
                                          <div key={c} onClick={() => updateElement(selectedElement.id, { color: c })} style={{ width: '18px', height: '18px', borderRadius: '4px', background: c, cursor: 'pointer', border: selectedElement.color === c ? '2px solid #E87722' : '1px solid rgba(255,255,255,0.1)' }} title={c} />
                                      ))}
                                   </div>
                                   <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '7px', padding: '5px 8px' }}>
                                       <input type="color" value={selectedElement.color || '#FEFEFB'} onChange={(e) => updateElement(selectedElement.id, { color: e.target.value })} style={{ width: '22px', height: '22px', border: 'none', padding: 0, background: 'transparent', cursor: 'pointer' }} />
                                       <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>{selectedElement.color || 'Sem cor'}</span>
                                       {selectedElement.color && (
                                           <button onClick={() => updateElement(selectedElement.id, { color: undefined })} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#F87171', cursor: 'pointer', fontSize: '11px', fontWeight: 700 }}>✕</button>
                                       )}
                                   </div>
                               </div>
                           )}

                           <div>
                               <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Largura (px)</label>
                               <input type="range" min="50" max="1500" value={selectedElement.width || 300} onChange={(e) => updateElement(selectedElement.id, { width: parseInt(e.target.value) })} style={{ width: '100%', accentColor: '#E87722' }} />
                               <div style={{ textAlign: 'right', fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>{selectedElement.width}px</div>
                           </div>

                           <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)', margin: '16px 0' }} />
                           <button onClick={deleteSelectedElement} style={{ width: '100%', padding: '9px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#F87171', borderRadius: '7px', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}>Apagar Elemento</button>
                        </div>
                    )}

                    {/* Propriedades de Texto */}
                    {selectedElement && selectedElement.type === 'text' && (
                        <div>
                           <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                               <div style={{ width: '3px', height: '14px', background: '#2DCCD3', borderRadius: '3px' }}/>
                               <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#F9FAFB' }}>Ajustar Tipografia</h3>
                           </div>
                           
                           <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Conteúdo</label>
                           <textarea 
                             value={selectedElement.content} 
                             onChange={(e) => updateElement(selectedElement.id, { content: e.target.value })} 
                             style={{ 
                               width: '100%', minHeight: '100px', 
                               background: 'rgba(255,255,255,0.04)', 
                               color: '#F9FAFB', 
                               border: '1px solid rgba(255,255,255,0.1)', 
                               padding: '10px', borderRadius: '7px', 
                               fontFamily: "'Unitea Sans', sans-serif", fontSize: '13px', 
                               resize: 'vertical', boxSizing: 'border-box'
                             }}
                           />

                           {/* Tamanho + Cor */}
                           <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '14px' }}>
                               <div>
                                   <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tamanho</label>
                                   <input type="number" value={selectedElement.fontSize || 72} onChange={(e) => updateElement(selectedElement.id, { fontSize: parseInt(e.target.value) })} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', color: '#F9FAFB', border: '1px solid rgba(255,255,255,0.1)', padding: '7px 10px', borderRadius: '7px', boxSizing: 'border-box' }} />
                               </div>
                               <div>
                                   <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Largura</label>
                                   <input type="number" value={selectedElement.width || 900} onChange={(e) => updateElement(selectedElement.id, { width: parseInt(e.target.value) })} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', color: '#F9FAFB', border: '1px solid rgba(255,255,255,0.1)', padding: '7px 10px', borderRadius: '7px', boxSizing: 'border-box' }} />
                               </div>
                           </div>

                           {/* Cor do Texto */}
                           <div style={{ marginTop: '14px' }}>
                               <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cor do Texto</label>
                               <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
                                  {C8_COLORS_FLAT.slice(0, 22).map(c => (
                                      <div key={c} onClick={() => updateElement(selectedElement.id, { color: c })} style={{ width: '18px', height: '18px', borderRadius: '4px', background: c, cursor: 'pointer', border: selectedElement.color === c ? '2px solid #E87722' : '1px solid rgba(255,255,255,0.1)' }} title={c} />
                                  ))}
                               </div>
                               <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '7px', padding: '5px 8px' }}>
                                   <input type="color" value={selectedElement.color || '#FEFEFB'} onChange={(e) => updateElement(selectedElement.id, { color: e.target.value })} style={{ width: '22px', height: '22px', border: 'none', padding: 0, background: 'transparent', cursor: 'pointer' }} />
                                   <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>{selectedElement.color}</span>
                               </div>
                           </div>

                           {/* Alinhamento */}
                           <div style={{ marginTop: '14px' }}>
                               <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Alinhamento</label>
                               <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.05)', padding: '3px', borderRadius: '7px' }}>
                                   {[
                                      { value: 'left',   label: '⬅' },
                                      { value: 'center', label: '↔' },
                                      { value: 'right',  label: '➡' }
                                   ].map(align => (
                                       <button key={align.value} onClick={() => updateElement(selectedElement.id, { textAlign: align.value as any })} style={{ flex: 1, padding: '6px', background: selectedElement.textAlign === align.value ? '#E87722' : 'transparent', color: selectedElement.textAlign === align.value ? '#FFF' : 'rgba(255,255,255,0.4)', border: 'none', borderRadius: '5px', fontSize: '14px', cursor: 'pointer' }}>{align.label}</button>
                                   ))}
                               </div>
                           </div>

                           {/* Peso */}
                           <div style={{ marginTop: '14px' }}>
                               <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Peso</label>
                               <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.05)', padding: '3px', borderRadius: '7px' }}>
                                   {[
                                     { value: '300', label: 'Light' },
                                     { value: '400', label: 'Normal' },
                                     { value: '600', label: 'Semi' },
                                     { value: '700', label: 'Bold' },
                                     { value: '900', label: 'Black' }
                                   ].map(weight => (
                                       <button key={weight.value} onClick={() => updateElement(selectedElement.id, { fontWeight: weight.value })} style={{ flex: 1, padding: '5px 2px', background: selectedElement.fontWeight === weight.value ? '#E87722' : 'transparent', color: selectedElement.fontWeight === weight.value ? '#FFF' : 'rgba(255,255,255,0.4)', border: 'none', borderRadius: '5px', fontSize: '10px', fontWeight: 700, cursor: 'pointer' }}>{weight.label}</button>
                                   ))}
                               </div>
                           </div>

                           <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)', margin: '16px 0' }} />
                           <button onClick={deleteSelectedElement} style={{ width: '100%', padding: '9px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#F87171', borderRadius: '7px', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}>Apagar Texto</button>
                        </div>
                    )}

                    {/* Módulo Legado */}
                    {selectedElement && selectedElement.type === 'raw-html' && (
                        <div>
                           <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                               <div style={{ width: '3px', height: '14px', background: '#FFCD00', borderRadius: '3px' }}/>
                               <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#F9FAFB' }}>Módulo Legado</h3>
                           </div>
                           
                           <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '12px', lineHeight: 1.5 }}>
                               Slide do editor antigo. Edite o código abaixo ou clique direto no canvas para editar inline.
                           </p>

                           <textarea value={selectedElement.content} onChange={(e) => updateElement(selectedElement.id, { content: e.target.value })} style={{ width: '100%', minHeight: '240px', background: '#0A0B10', color: '#10B981', border: '1px solid rgba(255,255,255,0.05)', padding: '10px', borderRadius: '7px', fontFamily: 'monospace', fontSize: '10px', resize: 'vertical', boxSizing: 'border-box' }} />

                           <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)', margin: '16px 0' }} />
                           <button onClick={deleteSelectedElement} style={{ width: '100%', padding: '9px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#F87171', borderRadius: '7px', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}>Excluir Bloco Legado</button>
                        </div>
                    )}
                </div>
             )}

         </div>

      </div>
    </div>
  );
}
