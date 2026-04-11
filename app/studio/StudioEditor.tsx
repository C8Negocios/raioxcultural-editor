'use client';

import React, { useEffect, useRef, useState } from 'react';
import { apiGet, apiPut } from '../lib/api';

type ElementType = 'text' | 'image' | 'raw-html';

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

  // ============== 1. Initialization ==============
  useEffect(() => {
    // Carregar Banco de Mídias C8
    fetch('/api/assets').then(r=>r.json()).then(d=>{
        if(d.assets) setAssets(d.assets);
    }).catch(console.error);

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
  const addSlide = () => {
     const nextNum = slides.length + 1;
     const filename = `slide_${nextNum.toString().padStart(2, '0')}.html`;
     const newS: SlideDef = { filename, backgroundColor: '#FEFEFB', elements: [] };
     setSlides([...slides, newS]);
     setSelectedSlideIndex(slides.length);
  };

  const duplicateAsVariant = () => {
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
     const newEl: FrameElement = {
         id: Math.random().toString(36).substr(2,9),
         type: 'image',
         content: url,
         x: 300, y: 300, width: 500, // deafult mid-size
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
             inner += `<img src="${el.content}" style="position:absolute; left:${Math.round(el.x)}px; top:${Math.round(el.y)}px; width:${el.width}px; z-index:${el.zIndex}; pointer-events: none;" />\n`;
         }
      }
   
      return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <style>
    @font-face { font-family: 'Unitea Sans'; src: url('/fonts/Unitea Sans/UniteaSans-Regular.ttf') format('truetype'); font-weight: 400; }
    @font-face { font-family: 'Unitea Sans'; src: url('/fonts/Unitea Sans/UniteaSans-Bold.ttf') format('truetype'); font-weight: 700; }
    body { margin: 0; padding: 0; font-family: 'Unitea Sans', sans-serif; background: ${slide.backgroundColor}; overflow:hidden; }
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

  const handleSaveWorkspace = async () => {
     setSaving(true);
     try {
         const slide = getSelectedSlide();
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

         alert("🔥 Design Gravado com Sucesso! (Sincronizado no Roteiro)");
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
    <div style={{ height: '100vh', width: '100%', display: 'flex', flexDirection: 'column', background: '#111827', color: '#fff', fontFamily: 'Inter', overflow: 'hidden' }}>
      
      {/* HEADER NATIVO C8 */}
      <div style={{ height: '60px', padding: '0 24px', background: '#1f2937', borderBottom: '1px solid #374151', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
         <div>
             <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>
               🎨 C8<span style={{ color: '#0ea5e9'}}>Studio</span> <span style={{ opacity: 0.5, fontSize: '12px' }}>Native</span>
             </h2>
         </div>
         <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', color: '#9ca3af' }}>Arquivo: <b>{currentSlide?.filename || ""}</b></span>
            <button onClick={duplicateAsVariant} style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>
                [ Variante ]
            </button>
            <button onClick={handleSaveWorkspace} style={{ background: '#10b981', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>
                {saving ? "Salvando..." : "Salvar Lâmina"}
            </button>
         </div>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
         
         {/* SIDEBAR ESQUERDA: CENA DE SLIDES */}
         <div style={{ width: '280px', flexShrink: 0, background: '#1f2937', borderRight: '1px solid #374151', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px', borderBottom: '1px solid #374151' }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '12px', textTransform: 'uppercase', color: '#9ca3af' }}>Roteiro (Slides)</h3>
                <button onClick={addSlide} style={{ width: '100%', background: 'transparent', border: '1px dashed #4b5563', color: '#d1d5db', padding: '8px', borderRadius: '4px', cursor: 'pointer' }}>
                   + Novo Slide Branco
                </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
                {slides.map((s, idx) => (
                    <div 
                        key={idx} 
                        onClick={() => { setSelectedSlideIndex(idx); setSelectedElementId(null); }}
                        style={{ padding: '12px', background: selectedSlideIndex === idx ? '#374151' : 'transparent', borderRadius: '6px', marginBottom: '4px', cursor: 'pointer', border: selectedSlideIndex === idx ? '1px solid #0ea5e9' : '1px solid transparent' }}>
                        <span style={{ fontSize: '13px', fontWeight: selectedSlideIndex === idx ? 700 : 400, color: selectedSlideIndex === idx ? '#0ea5e9' : '#fff' }}>
                            {idx + 1}. {s.filename.replace('.html', '')}
                        </span>
                    </div>
                ))}
            </div>
         </div>

         {/* CANVAS WORKSPACE (O MEIO DA TELA) */}
         <div 
             ref={containerRef}
             style={{ flex: 1, minWidth: 0, minHeight: 0, background: '#111827', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
             onMouseMove={handleMouseMove}
             onMouseUp={handleMouseUp}
             onMouseLeave={handleMouseUp}
             onClick={() => setSelectedElementId(null)}
         >
             {!currentSlide && <div style={{ color: '#6b7280' }}>Nenhuma Lâmina. Crie ou Selecione ao Lado.</div>}
             
             {currentSlide && (
                 <div style={{
                     width: 1920 * scale, height: 1080 * scale,
                     position: 'relative',
                     boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                 }}>
                     <div style={{
                         width: '1920px', height: '1080px',
                         background: currentSlide.backgroundColor,
                         transform: `scale(${scale})`,
                         transformOrigin: 'top left',
                         position: 'absolute', top: 0, left: 0
                     }}>
                         {currentSlide.elements.map(el => {
                             const isSelected = el.id === selectedElementId;
                             
                             if (el.type === 'raw-html') {
                                  return (
                                     <iframe 
                                         key={el.id} 
                                         srcDoc={el.content} 
                                         style={{ 
                                             position: 'absolute', top:0, left:0, width: '1920px', height:'1080px', 
                                             zIndex: el.zIndex, opacity: 0.8, pointerEvents: 'none', border: 'none' 
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
                                       border: isSelected ? '4px solid #0ea5e9' : '4px solid transparent',
                                       boxSizing: 'border-box'
                                   }}
                                >
                                    {/* Pega de "content" ou renderiza Image */}
                                    {el.type === 'text' && (
                                       <div style={{
                                           color: el.color, fontSize: el.fontSize, fontWeight: el.fontWeight,
                                           textAlign: el.textAlign, fontFamily: "'Unitea Sans', sans-serif",
                                           lineHeight: 1.2
                                       }}>
                                           {/* Render line breaks safely */}
                                           {el.content.split('\n').map((line, i) => <React.Fragment key={i}>{line}<br/></React.Fragment>)}
                                       </div>
                                    )}
                                    {el.type === 'image' && (
                                       <img src={el.content} style={{ width: '100%', height: '100%', pointerEvents: 'none', display: 'block' }} />
                                    )}
                                </div>
                             );
                         })}
                     </div>
                 </div>
             )}
         </div>

         {/* SIDEBAR DIREITA: BIBLIOTECA & PROPRIEDADES */}
         <div style={{ width: '300px', background: '#1f2937', borderLeft: '1px solid #374151', display: 'flex', flexDirection: 'column' }}>
             
             {/* Navegação entre Inserir e Editar */}
             <div style={{ display: 'flex', borderBottom: '1px solid #374151' }}>
                <button onClick={() => setRightTab('assets')} style={{ flex: 1, padding: '12px', background: rightTab === 'assets' ? '#374151' : 'transparent', color: rightTab === 'assets' ? '#fff' : '#9ca3af', border: 'none', borderBottom: rightTab === 'assets' ? '2px solid #0ea5e9' : '2px solid transparent', cursor: 'pointer', fontWeight: 600 }}>Biblioteca</button>
                <button onClick={() => setRightTab('props')} style={{ flex: 1, padding: '12px', background: rightTab === 'props' ? '#374151' : 'transparent', color: rightTab === 'props' ? '#fff' : '#9ca3af', border: 'none', borderBottom: rightTab === 'props' ? '2px solid #0ea5e9' : '2px solid transparent', cursor: 'pointer', fontWeight: 600 }}>Config</button>
             </div>

             {/* TELA: BIBLIOTECA DE ATIVOS C8 */}
             {rightTab === 'assets' && (
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                    <button onClick={addTextElement} style={{ width: '100%', padding: '12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 700, marginBottom: '24px' }}>
                        + Adicionar Texto Libre
                    </button>

                    <h4 style={{ color: '#9ca3af', fontSize: '11px', textTransform: 'uppercase', marginBottom: '8px' }}>Ativos Oficiais C8</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        {assets.map((src, i) => (
                           <div key={i} onClick={() => addImageElement(src)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', padding: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                               <img src={src} style={{ maxWidth: '100%', maxHeight: '60px', objectFit: 'contain' }} />
                           </div>
                        ))}
                    </div>
                </div>
             )}

             {/* TELA: CONFIGURAÇÕES DE ELEMENTOS/FUNDO */}
             {rightTab === 'props' && (
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                    {!selectedElement && currentSlide && (
                        <div>
                           <h3 style={{ margin: '0 0 16px', fontSize: '14px', color: '#fff' }}>Estilo da Folha (Fundo)</h3>
                           <label style={{ display: 'block', fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>Cor Sólida do Fundo</label>
                           <input type="color" value={currentSlide.backgroundColor} onChange={(e) => updateSlide({...currentSlide, backgroundColor: e.target.value})} style={{ width: '100%', height: '40px', padding: '4px', background: '#374151', border: 'none', borderRadius: '4px', cursor: 'pointer' }} />
                           <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>Dica: Se preferir fundo de Nuvem ou Grafismo, volte na Biblioteca e clique em uma das texturas azuis do C8.</p>
                           
                           {currentSlide.elements.some(x => x.type === 'raw-html') && (
                               <button onClick={() => updateSlide({...currentSlide, elements: currentSlide.elements.filter(x => x.type !== 'raw-html')})} style={{ marginTop: '24px', width: '100%', padding: '8px', background: '#f59e0b', color: '#fff', border:'none', borderRadius:'4px', cursor:'pointer' }}>Liberar Slide Antigo (Limpar HTML Livre)</button>
                           )}

                           <button onClick={deleteCurrentSlide} style={{ marginTop: '40px', width: '100%', padding: '8px', background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', borderRadius:'4px', cursor:'pointer' }}>Excluir Slide Atual</button>
                        </div>
                    )}

                    {selectedElement && selectedElement.type === 'image' && (
                        <div>
                           <h3 style={{ margin: '0 0 16px', fontSize: '14px', color: '#0ea5e9' }}>Formatador de Imagem</h3>
                           <label style={{ display: 'block', fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>Largura da Imagem (Escala)</label>
                           <input type="range" min="100" max="3000" value={selectedElement.width || 300} onChange={(e) => updateElement(selectedElement.id, { width: parseInt(e.target.value) })} style={{ width: '100%' }} />
                           <button onClick={deleteSelectedElement} style={{ marginTop: '24px', width: '100%', padding: '8px', background: '#ef4444', color: '#fff', border: 'none', borderRadius:'4px', cursor:'pointer' }}>Apagar Elemento (Del)</button>
                        </div>
                    )}

                    {selectedElement && selectedElement.type === 'text' && (
                        <div>
                           <h3 style={{ margin: '0 0 16px', fontSize: '14px', color: '#0ea5e9' }}>Formatador de Texto</h3>
                           
                           <label style={{ display: 'block', fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>Texto Escrito (Aceita Jinja/Var)</label>
                           <textarea value={selectedElement.content} onChange={(e) => updateElement(selectedElement.id, { content: e.target.value })} style={{ width: '100%', minHeight: '100px', background: '#111827', color: '#fff', border: '1px solid #374151', padding: '8px', borderRadius: '4px', fontFamily: '"Unitea Sans", sans-serif' }}></textarea>

                           <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '16px' }}>
                               <div>
                                   <label style={{ display: 'block', fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>Tamanho</label>
                                   <input type="number" value={selectedElement.fontSize || 64} onChange={(e) => updateElement(selectedElement.id, { fontSize: parseInt(e.target.value) })} style={{ width: '100%', background: '#111827', color: '#fff', border: '1px solid #374151', padding: '8px', borderRadius: '4px' }} />
                               </div>
                               <div>
                                   <label style={{ display: 'block', fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>Cor</label>
                                   <input type="color" value={selectedElement.color || '#00205B'} onChange={(e) => updateElement(selectedElement.id, { color: e.target.value })} style={{ width: '100%', height:'34px', background: 'transparent', border:'none' }} />
                               </div>
                           </div>

                           <div style={{ marginTop: '16px' }}>
                               <label style={{ display: 'block', fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>Largura da Caixa</label>
                               <input type="range" min="100" max="2500" value={selectedElement.width || 800} onChange={(e) => updateElement(selectedElement.id, { width: parseInt(e.target.value) })} style={{ width: '100%' }} />
                           </div>

                           <div style={{ marginTop: '16px' }}>
                               <label style={{ display: 'block', fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>Alinhamento Horizontal</label>
                               <div style={{ display: 'flex', gap: '4px' }}>
                                   {['left','center','right'].map(align => (
                                       <button key={align} onClick={() => updateElement(selectedElement.id, { textAlign: align as any })} style={{ flex: 1, padding: '4px', background: selectedElement.textAlign === align ? '#0ea5e9' : '#374151', color:'#fff', border:'none', borderRadius:'4px' }}>{align}</button>
                                   ))}
                               </div>
                           </div>
                           
                           <div style={{ marginTop: '16px' }}>
                               <label style={{ display: 'block', fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>Formatação Base</label>
                               <div style={{ display: 'flex', gap: '4px' }}>
                                   {['100','400','600','800'].map(weight => (
                                       <button key={weight} onClick={() => updateElement(selectedElement.id, { fontWeight: weight })} style={{ flex: 1, padding: '4px', background: selectedElement.fontWeight === weight ? '#0ea5e9' : '#374151', color:'#fff', border:'none', borderRadius:'4px' }}>{weight}</button>
                                   ))}
                               </div>
                           </div>

                           <button onClick={deleteSelectedElement} style={{ marginTop: '40px', width: '100%', padding: '8px', background: '#ef4444', color: '#fff', border: 'none', borderRadius:'4px', cursor:'pointer' }}>Apagar Elemento (Del)</button>
                        </div>
                    )}
                </div>
             )}

         </div>

      </div>
    </div>
  );
}
