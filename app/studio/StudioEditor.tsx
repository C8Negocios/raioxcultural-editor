'use client';

import React, { useEffect, useRef, useState } from 'react';
import { apiGet, apiPut } from '../lib/api';
import c8Assets from './c8-assets.json';

type ElementType = 'text' | 'image' | 'raw-html';

const C8_COLORS = [
  '#FEFEFB', '#EAEAE6', '#C1C1BB', '#7E7E7A', '#51514E',
  '#101010', '#1B1B1A', '#292927', '#363634', '#444441',
  '#00205B', 'transparent'
];

interface FrameElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width?: number; // optionally bound text or images
  height?: number; // for images
  content: string; // text or url or html
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
  const [assets, setAssets] = useState<string[]>([]);
  const [scale, setScale] = useState(0.5);
  const [saving, setSaving] = useState(false);
  
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x:0, y:0, ex:0, ey:0 });

  // Sidebar Tabs
  const [rightTab, setRightTab] = useState<'assets' | 'props'>('assets');
  const [visibleAssets, setVisibleAssets] = useState({ bg: 4, gr: 6, lg: 6 });

  // ============== 1. Initialization ==============
  useEffect(() => {

    // Carregar Lâminas (Slides HTML) do diretório
    apiGet(`/api/config/funnels/${funnelId}/templates`).then((res: any[]) => {
      if (res.length > 0) {
        const loadedSlides: SlideDef[] = res.map(t => {
            // Tentamos extrair o JSON state oculto
            const match = t.content.match(/<script type="application\/json" id="c8-state">([\s\S]*?)<\/script>/);
            if (match) {
                try {
                    // base64 decode (Buffer or atob on browser)
                    const jsonStr = decodeURIComponent(atob(match[1]));
                    return JSON.parse(jsonStr) as SlideDef;
                } catch(e) { console.error("Falha ao parsear canvas block", e); }
            }
            // Se falhar ou for legado (GrapesJS ou cru), converte tudo para bloco estático de fundo.
            return {
                filename: t.filename,
                backgroundColor: "#FEFEFB",
                elements: [{
                    id: Math.random().toString(36).substr(2,9),
                    type: "raw-html", content: t.content,
                    x: 0, y: 0, width: 1920, height: 1080, zIndex: -1
                }]
            };
        });

        // Ordenar os slides por filename alfabeticamente para seguir o roteiro
        loadedSlides.sort((a,b) => a.filename.localeCompare(b.filename));
        setSlides(loadedSlides);
      } else {
        // Se vazio, cria um slide de Capa Inicial
        setSlides([{ filename: 'slide_01_cover.html', backgroundColor: '#FEFEFB', elements: [] }]);
      }
    }).catch(console.error);
  }, [funnelId]);

  // Fit Screen Scale Resize Observer
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      const padding = 80;
      const scaleX = (clientWidth - padding) / 1920;
      const scaleY = (clientHeight - padding) / 1080;
      setScale(Math.min(scaleX, scaleY));
    };
    // small delay to let flex layout settle with minWidth:0 before measuring
    setTimeout(handleResize, 50);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);


  // ============== 2. Ações do Sistema de Slides ==============
  const addSlide = async () => {
     const nextNum = slides.length + 1;
     const filename = `slide_${nextNum.toString().padStart(2, '0')}.html`;
     const newS: SlideDef = { filename, backgroundColor: '#FEFEFB', elements: [] };
     setSlides([...slides, newS]);
     setSelectedSlideIndex(slides.length);
     await handleSaveWorkspace(newS, true);
  };

  const duplicateAsVariant = async () => {
     const current = slides[selectedSlideIndex];
     const suffix = prompt("Nome da Variação Lógica (ex: score_0_20, error, null):");
     if (!suffix) return;
     // remove .html and append _suffix.html
     const baseName = current.filename.replace('.html', '');
     const filename = `${baseName}_${suffix}.html`;
     // deep copy elements
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
     if(confirm("Deseja realmente excluir irreversivelmente este slide? Todas as conexões do roteiro quebrarão!")) {
        const idToDelete = selectedSlideIndex;
        // The file delete on disk isn't instant in UI unless we call an endpoint! 
        // For now, we remove it from UI state and when saving, it ONLY overwrites those modified. 
        // Real deletion requires calling a specific endpoint. Assuming saving only overwrites, the old file will linger. 
        // We will just remove from UI for visual sanity.
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
         x: 200, y: 200, width: 800,
         fontSize: 64, color: '#00205B', fontWeight: '800', textAlign: 'left',
         zIndex: s.elements.length + 1
     };
     updateSlide({ ...s, elements: [...s.elements, newEl] });
     setSelectedElementId(newEl.id);
     setRightTab('props');
  };

  const addImageElement = (url: string) => {
     const s = getSelectedSlide();
     if(!s) return;
     let defaultWidth = 500;
     if (url.includes('/logos/')) defaultWidth = 250;
     else if (url.includes('/graphics/')) defaultWidth = 350;

     const newEl: FrameElement = {
         id: Math.random().toString(36).substr(2,9),
         type: 'image',
         content: url,
         x: 300, y: 300, width: defaultWidth,
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

  // Listen for Del key
  useEffect(() => {
     const handleKeyDown = (e: KeyboardEvent) => {
         // only fire if not inside input
         if (e.key === 'Delete' && selectedElementId && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
            deleteSelectedElement();
         }
     };
     window.addEventListener('keydown', handleKeyDown);
     return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElementId, slides, selectedSlideIndex]);

  
  // Dragging Handlers
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
      for (const el of slide.elements) {
         if (el.type === 'raw-html') {
             // Embed the legacy code in a full bleed wrapper
             inner += `<div style="position:absolute; width:1920px; height:1080px; top:0; left:0; z-index:${el.zIndex}">${el.content}</div>\n`;
         } else if (el.type === 'text') {
             const safeText = el.content.replace(/\n/g, '<br/>');
             inner += `<div style="position:absolute; left:${Math.round(el.x)}px; top:${Math.round(el.y)}px; width:${el.width}px; font-size:${el.fontSize}px; color:${el.color}; font-weight:${el.fontWeight}; text-align:${el.textAlign}; font-family:'Unitea Sans', sans-serif; z-index:${el.zIndex}">${safeText}</div>\n`;
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
   
      return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <style>
    @font-face { font-family: 'Unitea Sans'; src: url('/fonts/Unitea Sans/UniteaSans-Regular.ttf') format('truetype'); font-weight: 400; }
    @font-face { font-family: 'Unitea Sans'; src: url('/fonts/Unitea Sans/UniteaSans-Bold.ttf') format('truetype'); font-weight: 700; }
    body { margin: 0; padding: 0; font-family: 'Unitea Sans', sans-serif; background: ${slide.backgroundColor.includes('url') ? slide.backgroundColor + ' center/cover no-repeat' : slide.backgroundColor}; overflow:hidden; }
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
         
         // 1. Salvar o template no Backend
         await apiPut(`/api/config/funnels/${funnelId}/templates/${slide.filename}`, payload);

         // 2. Extrair o Número do Slide e sincronizar com o Roteiro
         try {
             // Aceita "slide_01.html" ou "slide_1.html" ou "slide_01_var.html"
             const baseNumMatch = slide.filename.match(/slide_0*(\d+)/);
             if (baseNumMatch) {
                 const num = parseInt(baseNumMatch[1], 10);
                 const configRes = await apiGet(`/api/config/funnels/${funnelId}/slides`);
                 
                 if (configRes && configRes.order) {
                     const currentOrder: number[] = configRes.order;
                     const alreadyExists = currentOrder.includes(num);
                     
                     if (!alreadyExists) {
                         // Adiciona nativamente ao Roteiro Pipeline!
                         const newOrder = [...currentOrder, num];
                         
                         // Manter os hooks duracionais
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
                         console.log(`Slide ${num} sincronizado ao roteiro com sucesso!`);
                     }
                 }
             }
         } catch (e) {
             console.error("Falha ao injetar slide automaticamente na timeline", e);
         }

         if(!hideAlert) alert("🔥 Design Gravado com Sucesso! (Sincronizado no Roteiro)");
     } catch (e) {
         console.error(e);
         alert("Falha de gravação.");
     }
     setSaving(false);
  };


  // ============== VIEW RENDER ==============
  const currentSlide = getSelectedSlide();
  const selectedElement = currentSlide?.elements.find(x => x.id === selectedElementId);

  return (
    <div style={{ height: '100vh', width: '100%', display: 'flex', flexDirection: 'column', background: '#F9FAFB', color: '#111827', fontFamily: 'Inter', overflow: 'hidden' }}>
      
      {/* HEADER PREMIUM */}
      <div style={{ height: '64px', padding: '0 24px', background: '#FFFFFF', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
         <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
             <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, #0ea5e9, #3b82f6)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold' }}>
                C8
             </div>
             <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, letterSpacing: '-0.5px' }}>
               Studio <span style={{ fontWeight: 400, color: '#6B7280', fontSize: '14px' }}>Canvas</span>
             </h2>
         </div>
         <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#6B7280', marginRight: '16px' }}>Arquivo: <b style={{ color: '#111827' }}>{currentSlide?.filename || "Nenhum"}</b></span>
            
            <button onClick={duplicateAsVariant} style={{ background: '#F3F4F6', color: '#374151', border: '1px solid #E5E7EB', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', transition: 'all 0.2s' }}>
                Duplicar Variável
            </button>
            <button onClick={() => handleSaveWorkspace()} style={{ background: '#0EA5E9', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s', boxShadow: '0 4px 6px -1px rgba(14, 165, 233, 0.2)' }}>
                {saving ? (
                   <><span style={{ animation: 'pulse 1.5s infinite' }}>Salvando...</span></>
                ) : (
                   <>Salvar Lâmina</>
                )}
            </button>
         </div>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
         
         {/* SIDEBAR ESQUERDA: CENA DE SLIDES */}
         <div style={{ width: '260px', flexShrink: 0, background: '#FFFFFF', borderRight: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', zIndex: 5, boxShadow: '1px 0 2px rgba(0,0,0,0.02)' }}>
            <div style={{ padding: '20px 16px', borderBottom: '1px solid #F3F4F6' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '12px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: '#9CA3AF' }}>Roteiro Visual</h3>
                <button 
                  onClick={addSlide} 
                  style={{ width: '100%', background: '#F9FAFB', border: '1px dashed #D1D5DB', color: '#4B5563', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 500, fontSize: '13px', transition: 'all 0.2s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#0EA5E9'; e.currentTarget.style.color = '#0EA5E9'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#D1D5DB'; e.currentTarget.style.color = '#4B5563'; }}
                >
                   + Nova Lâmina
                </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
                {slides.map((s, idx) => {
                    const isGlobalActive = selectedSlideIndex === idx;
                    return (
                    <div 
                        key={idx} 
                        onClick={() => { setSelectedSlideIndex(idx); setSelectedElementId(null); }}
                        style={{ 
                            padding: '12px', 
                            background: isGlobalActive ? '#F0F9FF' : '#FFFFFF', 
                            borderRadius: '8px', 
                            marginBottom: '8px', 
                            cursor: 'pointer', 
                            border: isGlobalActive ? '1px solid #7DD3FC' : '1px solid #E5E7EB',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px'
                        }}
                    >
                        <div style={{ width: '24px', height: '24px', borderRadius: '4px', background: isGlobalActive ? '#0EA5E9' : '#F3F4F6', color: isGlobalActive ? '#FFF' : '#6B7280', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700 }}>
                            {idx + 1}
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: isGlobalActive ? 600 : 500, color: isGlobalActive ? '#0369A1' : '#4B5563', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {s.filename.replace('.html', '')}
                        </span>
                    </div>
                )})}
            </div>
         </div>

         {/* CANVAS WORKSPACE (O MEIO DA TELA) */}
         <div 
             ref={containerRef}
             style={{ 
                 flex: 1, minWidth: 0, minHeight: 0, 
                 backgroundColor: '#F3F4F6', 
                 backgroundImage: 'radial-gradient(#D1D5DB 1px, transparent 1px)', 
                 backgroundSize: '24px 24px',
                 position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' 
             }}
             onMouseMove={handleMouseMove}
             onMouseUp={handleMouseUp}
             onMouseLeave={handleMouseUp}
             onMouseDown={() => setSelectedElementId(null)}
         >
             {!currentSlide && <div style={{ color: '#9CA3AF', fontWeight: 500 }}>Crie ou selecione uma lâmina para começar.</div>}
             
             {currentSlide && (
                 <div style={{
                     width: 1920 * scale, height: 1080 * scale,
                     position: 'relative',
                     transition: 'all 0.1s ease-out'
                 }}>
                     {/* Borda Estética do Canvas e Sombra */}
                     <div style={{ 
                         position: 'absolute', inset: 0, 
                         boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15), 0 0 15px rgba(0,0,0,0.05)', 
                         border: '1px solid #E5E7EB',
                         pointerEvents: 'none', zIndex: 1 
                     }}></div>

                     {/* Área Real do Slide */}
                     <div style={{
                         width: '1920px', height: '1080px',
                         background: currentSlide.backgroundColor,
                         transform: `scale(${scale})`,
                         transformOrigin: 'top left',
                         position: 'absolute', top: 0, left: 0,
                         overflow: 'hidden'
                     }}>
                         {currentSlide.elements.map(el => {
                             const isSelected = el.id === selectedElementId;
                             
                             if (el.type === 'raw-html') {
                                  return (
                                     <div 
                                         key={el.id} 
                                         onMouseDown={(e) => {
                                             // Selecionamos o Legacy Block, mas não paramos a propagação
                                             // para permitir que o contentEditable funcione perfeitamente.
                                             setSelectedElementId(el.id);
                                         }}
                                         contentEditable={true}
                                         suppressContentEditableWarning={true}
                                         onBlur={(e) => {
                                             updateElement(el.id, { content: e.currentTarget.innerHTML });
                                         }}
                                         dangerouslySetInnerHTML={{ __html: el.content }}
                                         style={{ 
                                             position: 'absolute', top:0, left:0, width: '1920px', height:'1080px', 
                                             zIndex: el.zIndex, opacity: 0.95,
                                             border: isSelected ? '3px dashed #F59E0B' : 'none',
                                             outline: 'none',
                                             cursor: 'text' // Permite clicar e editar livremente
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
                                       border: isSelected ? '2px dashed #0EA5E9' : '2px solid transparent',
                                       boxSizing: 'border-box',
                                       transition: isDragging ? 'none' : 'border 0.2s ease',
                                   }}
                                >
                                    {/* Indicadores de Seleção Premium */}
                                    {isSelected && (
                                        <>
                                            <div style={{ position: 'absolute', top: '-5px', left: '-5px', width: '10px', height: '10px', background: '#FFF', border: '2px solid #0EA5E9', borderRadius: '50%' }}></div>
                                            <div style={{ position: 'absolute', top: '-5px', right: '-5px', width: '10px', height: '10px', background: '#FFF', border: '2px solid #0EA5E9', borderRadius: '50%' }}></div>
                                            <div style={{ position: 'absolute', bottom: '-5px', left: '-5px', width: '10px', height: '10px', background: '#FFF', border: '2px solid #0EA5E9', borderRadius: '50%' }}></div>
                                            <div style={{ position: 'absolute', bottom: '-5px', right: '-5px', width: '10px', height: '10px', background: '#FFF', border: '2px solid #0EA5E9', borderRadius: '50%' }}></div>
                                        </>
                                    )}

                                    {el.type === 'text' && (
                                       <div style={{
                                           color: el.color, fontSize: el.fontSize, fontWeight: el.fontWeight,
                                           textAlign: el.textAlign, fontFamily: "'Unitea Sans', sans-serif",
                                           lineHeight: 1.2, width: '100%', height: '100%',
                                           userSelect: 'none'
                                       }}>
                                           {el.content.split('\n').map((line, i) => <React.Fragment key={i}>{line}<br/></React.Fragment>)}
                                       </div>
                                    )}
                                    {el.type === 'image' && (
                                       <div style={{ position: 'relative', width: '100%', display: 'flex' }}>
                                           {/* Imagem Transparente dita os limites (Aspect Ratio Native) */}
                                           <img src={el.content} draggable={false} style={{ width: '100%', height: 'auto', display: 'block', pointerEvents: 'none', opacity: (el.content.endsWith('.svg') && el.color) ? 0 : 1, objectFit: 'contain' }} />
                                           
                                           {/* Mascara de SVG injetando cor (Se habilitada) */}
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
                 </div>
             )}
         </div>

         {/* SIDEBAR DIREITA: BIBLIOTECA & PROPRIEDADES */}
         <div style={{ width: '320px', background: '#FFFFFF', borderLeft: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', zIndex: 5, boxShadow: '-1px 0 2px rgba(0,0,0,0.02)' }}>
             
             {/* Navegação entre Inserir e Editar (Design Segmentado Estilo Apple) */}
             <div style={{ padding: '16px', borderBottom: '1px solid #F3F4F6' }}>
                 <div style={{ background: '#F3F4F6', borderRadius: '8px', padding: '4px', display: 'flex' }}>
                    <button onClick={() => setRightTab('assets')} style={{ flex: 1, padding: '8px', background: rightTab === 'assets' ? '#FFFFFF' : 'transparent', color: rightTab === 'assets' ? '#111827' : '#6B7280', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', boxShadow: rightTab === 'assets' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.2s' }}>🎨 Ativos C8</button>
                    <button onClick={() => setRightTab('props')} style={{ flex: 1, padding: '8px', background: rightTab === 'props' ? '#FFFFFF' : 'transparent', color: rightTab === 'props' ? '#111827' : '#6B7280', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', boxShadow: rightTab === 'props' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.2s' }}>⚙️ Ajustes</button>
                 </div>
             </div>

             {/* TELA: BIBLIOTECA DE ATIVOS C8 */}
             {rightTab === 'assets' && (
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                    <button onClick={addTextElement} style={{ width: '100%', padding: '12px', background: '#F8FAFC', color: '#0EA5E9', border: '1px solid #E0F2FE', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, marginBottom: '24px', transition: 'all 0.2s', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        + Adicionar Texto Livre
                    </button>

                    <div style={{ marginBottom: '24px' }}>
                        <h4 style={{ color: '#9CA3AF', fontSize: '11px', textTransform: 'uppercase', marginBottom: '12px', fontWeight: 700, letterSpacing: '0.5px' }}>Fundos & Texturas 3D</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            {c8Assets.backgrounds.slice(0, visibleAssets.bg).map((bg) => (
                               <div key={bg.id} onClick={() => currentSlide && updateSlide({...currentSlide, backgroundColor: `url('${bg.url}')`})} style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '6px', overflow: 'hidden', cursor: 'pointer', height: '60px', transition: 'all 0.2s', position: 'relative' }} onMouseEnter={(e)=>e.currentTarget.style.borderColor='#0EA5E9'} onMouseLeave={(e)=>e.currentTarget.style.borderColor='#E5E7EB'}>
                                   <img src={bg.url} loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                               </div>
                            ))}
                        </div>
                        {visibleAssets.bg < c8Assets.backgrounds.length && (
                            <button onClick={() => setVisibleAssets(v => ({...v, bg: v.bg + 6}))} style={{ width: '100%', padding: '6px', marginTop: '8px', background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#64748B', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}>Carregar Mais (+6)</button>
                        )}
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <h4 style={{ color: '#9CA3AF', fontSize: '11px', textTransform: 'uppercase', marginBottom: '12px', fontWeight: 700, letterSpacing: '0.5px' }}>Grafismos de Apoio</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            {c8Assets.graphics.slice(0, visibleAssets.gr).map((gr) => (
                               <div key={gr.id} onClick={() => addImageElement(gr.url)} style={{ background: gr.id.includes('branco-padrao') ? '#00205B' : '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '6px', padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60px', transition: 'transform 0.1s' }} onMouseEnter={(e)=>e.currentTarget.style.transform='scale(1.05)'} onMouseLeave={(e)=>e.currentTarget.style.transform='none'}>
                                   <img src={gr.url} loading="lazy" decoding="async" style={{ maxWidth: '100%', maxHeight: '40px', objectFit: 'contain', display: 'block' }} />
                               </div>
                            ))}
                        </div>
                        {visibleAssets.gr < c8Assets.graphics.length && (
                            <button onClick={() => setVisibleAssets(v => ({...v, gr: v.gr + 10}))} style={{ width: '100%', padding: '6px', marginTop: '8px', background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#64748B', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}>Carregar Mais (+10)</button>
                        )}
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <h4 style={{ color: '#9CA3AF', fontSize: '11px', textTransform: 'uppercase', marginBottom: '12px', fontWeight: 700, letterSpacing: '0.5px' }}>Topologia e Marcas</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            {c8Assets.logos.slice(0, visibleAssets.lg).map((lg) => (
                               <div key={lg.id} onClick={() => addImageElement(lg.url)} style={{ background: lg.id.includes('branco') ? '#111827' : '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '6px', padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60px', transition: 'transform 0.1s' }} onMouseEnter={(e)=>e.currentTarget.style.transform='scale(1.05)'} onMouseLeave={(e)=>e.currentTarget.style.transform='none'}>
                                   <img src={lg.url} loading="lazy" decoding="async" style={{ maxWidth: '100%', maxHeight: '40px', objectFit: 'contain', display: 'block' }} />
                               </div>
                            ))}
                        </div>
                        {visibleAssets.lg < c8Assets.logos.length && (
                            <button onClick={() => setVisibleAssets(v => ({...v, lg: v.lg + 10}))} style={{ width: '100%', padding: '6px', marginTop: '8px', background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#64748B', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}>Carregar Mais (+10)</button>
                        )}
                    </div>
                </div>
             )}

             {/* TELA: CONFIGURAÇÕES DE ELEMENTOS/FUNDO */}
             {rightTab === 'props' && (
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                    {!selectedElement && currentSlide && (
                        <div>
                           <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                               <div style={{ width: '4px', height: '16px', background: '#0EA5E9', borderRadius: '4px' }}></div>
                               <h3 style={{ margin: '0', fontSize: '15px', fontWeight: 700, color: '#111827' }}>Fundo da Lâmina</h3>
                           </div>
                           
                           <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4B5563', marginBottom: '8px' }}>Cor Oficial / Hex</label>
                           <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                               {C8_COLORS.map(c => (
                                   <div key={c} onClick={() => updateSlide({...currentSlide, backgroundColor: c})} style={{ width: '22px', height: '22px', borderRadius: '4px', background: c === 'transparent' ? 'repeating-conic-gradient(#E5E7EB 0% 25%, transparent 0% 50%) 50% / 8px 8px' : c, cursor: 'pointer', border: currentSlide.backgroundColor === c ? '2px solid #0EA5E9' : '1px solid #E5E7EB', outline: currentSlide.backgroundColor === c ? '2px solid #fff' : 'none', outlineOffset: '-2px' }} title={c} />
                               ))}
                           </div>
                           <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#F9FAFB', padding: '8px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                               <input type="color" value={currentSlide.backgroundColor.includes('url') ? '#ffffff' : currentSlide.backgroundColor} onChange={(e) => updateSlide({...currentSlide, backgroundColor: e.target.value})} style={{ width: '30px', height: '30px', cursor: 'pointer', border: 'none', padding: 0, background: 'transparent' }} />
                               <span style={{ fontSize: '13px', color: '#4B5563', fontFamily: 'monospace' }}>{currentSlide.backgroundColor.includes('url') ? 'Imagem (Bg)' : currentSlide.backgroundColor.toUpperCase()}</span>
                           </div>
                           <p style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '12px', lineHeight: 1.4 }}>Dica: Se preferir texturas como Nuvem Azul ou Grafismos, adicione as imagens pela aba <b>Elementos</b>.</p>
                           
                           <hr style={{ border: 'none', borderTop: '1px solid #E5E7EB', margin: '24px 0' }} />

                           <h3 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 700, color: '#EF4444', textTransform: 'uppercase' }}>Zona de Perigo</h3>

                           {currentSlide.elements.some(x => x.type === 'raw-html') && (
                               <button onClick={() => updateSlide({...currentSlide, elements: currentSlide.elements.filter(x => x.type !== 'raw-html')})} style={{ marginBottom: '12px', width: '100%', padding: '10px', background: '#FFFBEB', color: '#D97706', border: '1px solid #FDE68A', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>Limpar Fundo Legado (GrapesJS)</button>
                           )}

                           <button onClick={deleteCurrentSlide} style={{ width: '100%', padding: '10px', background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>Excluir Documento Inteiro</button>
                        </div>
                    )}

                    {selectedElement && selectedElement.type === 'image' && (
                        <div>
                           <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                               <div style={{ width: '4px', height: '16px', background: '#0EA5E9', borderRadius: '4px' }}></div>
                               <h3 style={{ margin: '0', fontSize: '15px', fontWeight: 700, color: '#111827' }}>Ajustar Imagem</h3>
                           </div>
                           
                           <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4B5563', marginBottom: '8px' }}>Escala Virtual (Largura)</label>
                           <input type="range" min="100" max="3000" value={selectedElement.width || 300} onChange={(e) => updateElement(selectedElement.id, { width: parseInt(e.target.value) })} style={{ width: '100%', accentColor: '#0EA5E9' }} />
                           
                           <hr style={{ border: 'none', borderTop: '1px solid #E5E7EB', margin: '24px 0' }} />
                           
                           <button onClick={deleteSelectedElement} style={{ width: '100%', padding: '10px', background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>Remover Ferramenta</button>
                        </div>
                    )}

                    {selectedElement && selectedElement.type === 'text' && (
                        <div>
                           <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                               <div style={{ width: '4px', height: '16px', background: '#0EA5E9', borderRadius: '4px' }}></div>
                               <h3 style={{ margin: '0', fontSize: '15px', fontWeight: 700, color: '#111827' }}>Ajustar Tipografia</h3>
                           </div>
                           
                           <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4B5563', marginBottom: '8px' }}>Conteúdo Visual (Jinja Auto)</label>
                           <textarea value={selectedElement.content} onChange={(e) => updateElement(selectedElement.id, { content: e.target.value })} style={{ width: '100%', minHeight: '120px', background: '#F9FAFB', color: '#111827', border: '1px solid #D1D5DB', padding: '12px', borderRadius: '8px', fontFamily: '"Unitea Sans", sans-serif', fontSize: '14px', resize: 'vertical' }}></textarea>

                           <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '20px' }}>
                               <div>
                                   <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4B5563', marginBottom: '8px' }}>Dimensão Font</label>
                                   <input type="number" value={selectedElement.fontSize || 64} onChange={(e) => updateElement(selectedElement.id, { fontSize: parseInt(e.target.value) })} style={{ width: '100%', background: '#F9FAFB', color: '#111827', border: '1px solid #D1D5DB', padding: '8px 12px', borderRadius: '8px' }} />
                               </div>
                               <div>
                                   <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4B5563', marginBottom: '8px' }}>Pigmento</label>
                                   <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
                                      {C8_COLORS.slice(0, 11).map(c => (
                                          <div key={c} onClick={() => updateElement(selectedElement.id, { color: c })} style={{ width: '16px', height: '16px', borderRadius: '4px', background: c, cursor: 'pointer', border: selectedElement.color === c ? '2px solid #0EA5E9' : '1px solid #E5E7EB' }} title={c} />
                                      ))}
                                   </div>
                                   <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#F9FAFB', border: '1px solid #D1D5DB', borderRadius: '8px', padding: '4px 8px' }}>
                                       <input type="color" value={selectedElement.color || '#00205B'} onChange={(e) => updateElement(selectedElement.id, { color: e.target.value })} style={{ width: '24px', height: '24px', border: 'none', padding: 0, background: 'transparent', cursor: 'pointer' }} />
                                       <span style={{ fontSize: '12px', color: '#4B5563', fontFamily: 'monospace' }}>{selectedElement.color}</span>
                                   </div>
                               </div>
                           </div>

                           <div style={{ marginTop: '20px' }}>
                               <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4B5563', marginBottom: '8px' }}>Espaço da Fila (Limites)</label>
                               <input type="range" min="100" max="2500" value={selectedElement.width || 800} onChange={(e) => updateElement(selectedElement.id, { width: parseInt(e.target.value) })} style={{ width: '100%', accentColor: '#0EA5E9' }} />
                           </div>

                           <div style={{ marginTop: '20px' }}>
                               <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4B5563', marginBottom: '8px' }}>Formatação Estrutural</label>
                               <div style={{ display: 'flex', gap: '4px', background: '#F3F4F6', padding: '4px', borderRadius: '8px' }}>
                                   {[
                                      { value: 'left',   label: 'ESQ' },
                                      { value: 'center', label: 'CEN' },
                                      { value: 'right',  label: 'DIR' }
                                   ].map(align => (
                                       <button key={align.value} onClick={() => updateElement(selectedElement.id, { textAlign: align.value as any })} style={{ flex: 1, padding: '6px', background: selectedElement.textAlign === align.value ? '#FFFFFF' : 'transparent', color: selectedElement.textAlign === align.value ? '#0EA5E9' : '#6B7280', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', boxShadow: selectedElement.textAlign === align.value ? '0 1px 2px rgba(0,0,0,0.05)' : 'none' }}>{align.label}</button>
                                   ))}
                               </div>
                           </div>
                           
                           <div style={{ marginTop: '20px' }}>
                               <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4B5563', marginBottom: '8px' }}>Gordura (Peso)</label>
                               <div style={{ display: 'flex', gap: '4px', background: '#F3F4F6', padding: '4px', borderRadius: '8px' }}>
                                   {[
                                     { value: '100', label: 'Light' },
                                     { value: '400', label: 'Normal' },
                                     { value: '600', label: 'Semi' },
                                     { value: '800', label: 'Bold' }
                                   ].map(weight => (
                                       <button key={weight.value} onClick={() => updateElement(selectedElement.id, { fontWeight: weight.value })} style={{ flex: 1, padding: '6px', background: selectedElement.fontWeight === weight.value ? '#FFFFFF' : 'transparent', color: selectedElement.fontWeight === weight.value ? '#0EA5E9' : '#6B7280', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', boxShadow: selectedElement.fontWeight === weight.value ? '0 1px 2px rgba(0,0,0,0.05)' : 'none' }}>{weight.label}</button>
                                   ))}
                               </div>
                           </div>

                           <hr style={{ border: 'none', borderTop: '1px solid #E5E7EB', margin: '24px 0' }} />

                           <button onClick={deleteSelectedElement} style={{ width: '100%', padding: '10px', background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>Apagar Ferramenta Textual</button>
                        </div>
                    )}
                    {selectedElement && selectedElement.type === 'image' && (
                        <div>
                           <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                               <div style={{ width: '4px', height: '16px', background: '#0EA5E9', borderRadius: '4px' }}></div>
                               <h3 style={{ margin: '0', fontSize: '15px', fontWeight: 700, color: '#111827' }}>Configurações da Imagem</h3>
                           </div>
                           
                           {selectedElement.content.endsWith('.svg') && (
                               <div style={{ marginBottom: '20px' }}>
                                   <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4B5563', marginBottom: '8px' }}>Pigmento Vetorial (Para Máscaras)</label>
                                   <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
                                      {C8_COLORS.slice(0, 11).map(c => (
                                          <div key={c} onClick={() => updateElement(selectedElement.id, { color: c })} style={{ width: '16px', height: '16px', borderRadius: '4px', background: c, cursor: 'pointer', border: selectedElement.color === c ? '2px solid #0EA5E9' : '1px solid #E5E7EB' }} title={c} />
                                      ))}
                                   </div>
                                   <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#F9FAFB', border: '1px solid #D1D5DB', borderRadius: '8px', padding: '4px 8px' }}>
                                       <input type="color" value={selectedElement.color || '#FFFFFF'} onChange={(e) => updateElement(selectedElement.id, { color: e.target.value })} style={{ width: '24px', height: '24px', border: 'none', padding: 0, background: 'transparent', cursor: 'pointer' }} />
                                       <span style={{ fontSize: '12px', color: '#4B5563', fontFamily: 'monospace' }}>{selectedElement.color || 'Original'}</span>
                                       {selectedElement.color && (
                                           <button onClick={() => updateElement(selectedElement.id, { color: undefined })} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', fontSize: '11px', fontWeight: 700 }}>Remover Cor</button>
                                       )}
                                   </div>
                               </div>
                           )}

                           <div style={{ marginTop: '20px' }}>
                               <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4B5563', marginBottom: '8px' }}>Espaço Visual (Largura)</label>
                               <input type="range" min="50" max="1500" value={selectedElement.width || 300} onChange={(e) => updateElement(selectedElement.id, { width: parseInt(e.target.value) })} style={{ width: '100%', accentColor: '#0EA5E9' }} />
                           </div>

                           <hr style={{ border: 'none', borderTop: '1px solid #E5E7EB', margin: '24px 0' }} />

                           <button onClick={deleteSelectedElement} style={{ width: '100%', padding: '10px', background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>Apagar Elemento Gráfico</button>
                        </div>
                    )}
                    {selectedElement && selectedElement.type === 'raw-html' && (
                        <div>
                           <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                               <div style={{ width: '4px', height: '16px', background: '#F59E0B', borderRadius: '4px' }}></div>
                               <h3 style={{ margin: '0', fontSize: '15px', fontWeight: 700, color: '#111827' }}>Módulo Legado (GrapesJS)</h3>
                           </div>
                           
                           <p style={{ fontSize: '12px', color: '#6B7280', marginBottom: '16px', lineHeight: 1.4 }}>
                               Este slide veio do construtor antigo. Você pode <b>clicar duas vezes no texto à esquerda</b> para editar livremente.<br/><br/>
                               Ou, se preferir ou precisar de variáveis complexas, altere o código bruto abaixo:
                           </p>

                           <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4B5563', marginBottom: '8px' }}>Código Visual (HTML Original)</label>
                           <textarea value={selectedElement.content} onChange={(e) => updateElement(selectedElement.id, { content: e.target.value })} style={{ width: '100%', minHeight: '300px', background: '#111827', color: '#10B981', border: 'none', padding: '12px', borderRadius: '8px', fontFamily: 'monospace', fontSize: '11px', resize: 'vertical' }}></textarea>

                           <hr style={{ border: 'none', borderTop: '1px solid #E5E7EB', margin: '24px 0' }} />

                           <button onClick={deleteSelectedElement} style={{ width: '100%', padding: '10px', background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>Excluir Bloco Legado Inteiro</button>
                        </div>
                    )}
                </div>
             )}

         </div>

      </div>
    </div>
  );
}

