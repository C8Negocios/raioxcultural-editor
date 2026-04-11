import React, { useEffect, useRef, useState } from 'react';
import grapesjs from 'grapesjs';
import 'grapesjs/dist/css/grapes.min.css';
import presetWebpage from 'grapesjs-preset-webpage';
// locale pt removed — no type declarations available in this grapesjs version
import { apiGet, apiPut } from '../lib/api';

export default function StudioEditor({ funnelId = "raiox-cultural" }: { funnelId?: string }) {
  const domRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);
  const [templates, setTemplates] = useState<{filename: string, content: string}[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");

  useEffect(() => {
    apiGet(`/api/config/funnels/${funnelId}/templates`).then(res => {
      setTemplates(res);
      if (res.length > 0) {
        setSelectedTemplate(res[0].filename);
      }
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (!editorRef.current && domRef.current) {
        const editor = grapesjs.init({
          container: domRef.current,
          height: '100%',
          width: 'auto',
          storageManager: false, 
          plugins: [presetWebpage],
          pluginsOpts: {
            [presetWebpage as any]: {
               blocksBasicOpts: { flexGrid: true }
            }
          },
          i18n: {
             locale: 'en',
          },
          colorPicker: {
             appendTo: 'parent',
             offset: { top: 26, left: -200 }
          },
          deviceManager: {
            devices: [
              {
                id: 'desktop',
                name: 'Slide Vídeo (16:9 HD)',
                width: '1920px',
                height: '1080px',
                widthMedia: '1925px', // Força GrapesJS a tratar como fixed container
              },
              {
                id: 'insta',
                name: 'Instagram (Quadrado)',
                width: '1080px',
                height: '1080px',
                widthMedia: '1085px',
              },
              {
                id: 'stories',
                name: 'Stories (9:16)',
                width: '1080px',
                height: '1920px',
                widthMedia: '1085px',
              }
            ]
          },
          canvas: {
            styles: [
              "https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap"
            ]
          },
          assetManager: {
             upload: false, // Upload disabled via grapesjs drag&drop to avoid base64 bloat. The user should use our standard image assets or host externally.
          }
        });
        
        // Inject C8 Brand Assets
        fetch('/api/assets').then(r => r.json()).then(data => {
            if (data.assets) {
                editor.AssetManager.add(data.assets.map((a: string) => ({ src: a })));
            }
        });
        
        // Aplica a regra de visual no próprio css do projeto do canvas
        editor.on('load', () => {
          editor.setDevice('desktop');
          editor.Css.addRules(`
            @font-face { font-family: 'Unitea Sans'; src: url('/fonts/Unitea Sans/UniteaSans-Regular.ttf') format('truetype'); font-weight: 400; }
            @font-face { font-family: 'Unitea Sans'; src: url('/fonts/Unitea Sans/UniteaSans-Bold.ttf') format('truetype'); font-weight: 700; }
            body { min-height: 1080px; background-color: #FEFEFB; font-family: 'Unitea Sans', 'Inter', sans-serif; box-sizing: border-box; color: #101010; }
          `);
          
          // Injecting C8 Fonts to Style Manager
          try {
              const sm = editor.StyleManager;
              const fontProp = sm.getProperty('typography', 'font-family');
              if (fontProp) {
                  const opts = fontProp.get('options') || [];
                  fontProp.set('options', [
                      { id: '"Unitea Sans", sans-serif', label: 'Unitea Sans (C8)' },
                      { id: 'Inter, sans-serif', label: 'Inter' },
                      ...opts
                  ]);
              }
          } catch(e) { console.error("Estilo typography falhou", e) }
          
          editor.on('load', () => {
              setTimeout(() => {
                  if (editorRef.current) handleFitScreen(editorRef.current);
                  else handleFitScreen(editor);
              }, 250);
          });
        });

        editorRef.current = editor;
    }
  }, []);

  const loadTemplate = (filename: string) => {
    setSelectedTemplate(filename);
    const t = templates.find(x => x.filename === filename);
    if (t && editorRef.current) {
      // O GrapesJS é esperto o suficiente para parsear estruturas HTML completas que nós mandamos
      editorRef.current.setComponents(t.content);
      setTimeout(() => handleFitScreen(editorRef.current), 250);
    }
  };

  const handleSave = async () => {
    if (!editorRef.current || !selectedTemplate) return;
    const html = editorRef.current.getHtml();
    const css = editorRef.current.getCss();
    
    // Gerar um boilerplate limpo com a fonte do projeto para a exportação final da engine do Python
    const fullHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <style>
    @font-face { font-family: 'Unitea Sans'; src: url('/fonts/Unitea Sans/UniteaSans-Regular.ttf') format('truetype'); font-weight: 400; }
    @font-face { font-family: 'Unitea Sans'; src: url('/fonts/Unitea Sans/UniteaSans-Bold.ttf') format('truetype'); font-weight: 700; }
    body { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Unitea Sans', sans-serif; background: #FEFEFB; color: #101010; }
    * { box-sizing: border-box; }
    ${css}
  </style>
</head>
<body>
  ${html}
</body>
</html>`;

    try {
      await apiPut(`/api/config/funnels/${funnelId}/templates/${selectedTemplate}`, { text: fullHtml });
      // Atualizar no cache state local
      setTemplates(prev => prev.map(t => t.filename === selectedTemplate ? { ...t, content: fullHtml } : t));
      alert("Design salvo com sucesso no C8 Studio!");
    } catch(e: any) {
       alert("Erro ao salvar o HTML final: " + e.message);
    }
  };

  const handleNewDesign = async () => {
      const name = prompt("Digite o número do novo Slide (Ex: 16):");
      if (!name) return;
      const fileName = `slide_${name.padStart(2, '0')}.html`;
      const emptyHtml = `<div data-gjs-type="wrapper"></div>`;
      
      try {
          await apiPut(`/api/config/funnels/${funnelId}/templates/${fileName}`, { text: emptyHtml });
          setTemplates(prev => [...prev, { filename: fileName, content: emptyHtml }]);
          setSelectedTemplate(fileName);
          if (editorRef.current) {
              editorRef.current.setComponents(emptyHtml);
          }
      } catch(e: any) {
          alert("Erro ao criar novo design: " + e.message);
      }
  };

  const handleDuplicateVariant = async () => {
      if (!selectedTemplate) return alert("Selecione um slide modelo primeiro.");
      const baseNum = selectedTemplate.replace("slide_", "").split("_")[0].replace(".html", "");
      const variantKey = prompt(`Criar variação lógica do Slide ${baseNum}.\nQual o critério do pipeline? (ex: score_0_20, score_21_40, etc)`);
      if (!variantKey) return;
      
      const fileName = `slide_${baseNum}_${variantKey}.html`;
      const currentHtml = editorRef.current.getHtml();
      const currentCss = editorRef.current.getCss();
      
      const fullCopy = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <style>
    @font-face { font-family: 'Unitea Sans'; src: url('/fonts/Unitea Sans/UniteaSans-Regular.ttf') format('truetype'); font-weight: 400; }
    @font-face { font-family: 'Unitea Sans'; src: url('/fonts/Unitea Sans/UniteaSans-Bold.ttf') format('truetype'); font-weight: 700; }
    body { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Unitea Sans', sans-serif; background: #FEFEFB; color: #101010; }
    * { box-sizing: border-box; }
    ${currentCss}
  </style>
</head>
<body>
  ${currentHtml}
</body>
</html>`;

      try {
          await apiPut(`/api/config/funnels/${funnelId}/templates/${fileName}`, { text: fullCopy });
          setTemplates(prev => [...prev, { filename: fileName, content: fullCopy }]);
          setSelectedTemplate(fileName);
          alert(`Variação ${fileName} criada e salva com sucesso! O motor agora vai usar este layout se o script for ${variantKey}.`);
      } catch(e: any) {
          alert("Erro ao clonar variação: " + e.message);
      }
  };

  // Carregar os dados primários quando o selectedTemplate initial bate
  useEffect(() => {
    if (editorRef.current && selectedTemplate) {
      const t = templates.find(x => x.filename === selectedTemplate);
      if (t) {
        // Não apagar tudo no re-mount se já tem coisas, mas vamos tentar colocar
        editorRef.current.setComponents(t.content);
        setTimeout(() => handleFitScreen(editorRef.current), 250);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTemplate]); // removemos editorRef.current da dependencia para n loopar

  const handleFitScreen = (instance?: any) => {
    const editor = instance || editorRef.current;
    if (!editor) return;
    try {
        const cw = (editor.Canvas as any).getElement().clientWidth || (window.innerWidth - 300);
        const ch = (editor.Canvas as any).getElement().clientHeight || (window.innerHeight - 100);
        
        // Em 1920x1080 o ratio é 1.777. Vamos achar a melhor escala para caber na tela.
        // Tentamos o Width primeiro
        let scaleW = (cw - 40) / 1920; 
        let scaleH = (ch - 40) / 1080;
        
        // A escala real que garante que não vaze pras bordas
        let finalScale = Math.min(scaleW, scaleH);
        let finalZoom = Math.max(30, Math.min(100, Math.round(finalScale * 100)));
        
        if (typeof editor.Canvas.setZoom === "function") {
            editor.Canvas.setZoom(finalZoom);
            
            // Math absoluto para o centro do Canvas.
            // Quando a origem é 0,0, a largura visual é 1920*escala
            const scaledW = 1920 * (finalZoom / 100);
            const scaledH = 1080 * (finalZoom / 100);
            
            // X é a metade do espaço sobrando
            const x = (cw - scaledW) / 2;
            const y = Math.max(0, (ch - scaledH) / 2); 
            
            if (typeof (editor.Canvas as any).setCoords === "function") {
                (editor.Canvas as any).setCoords(x, y);
            }
        }
    } catch(e: any) {
        console.error(e);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%', overflow: 'hidden' }}>

      <div style={{ 
        height: "56px", 
        background: "#0d0f16", 
        color: "#fff", 
        display: "flex", 
        alignItems: "center", 
        padding: "0 24px", 
        gap: "24px",
        borderBottom: "1px solid #1f2937",
        flexShrink: 0
      }}>
        <h2 style={{ fontSize: "18px", margin: 0, fontWeight: 800 }}>🎨 C8 Studio</h2>
        <select 
          value={selectedTemplate} 
          onChange={e => loadTemplate(e.target.value)} 
          className="input"
          style={{ width: "300px", background: "#1f2937", border: "1px solid #374151", color: "#fff" }}
        >
           <option value="">-- Selecione o Design Vazio --</option>
           {templates.map(t => <option key={t.filename} value={t.filename}>{t.filename}</option>)}
        </select>
        
        <button 
          onClick={handleNewDesign} 
          style={{ 
             background: "#00205B", color: "#fff", border: "none", 
             padding: "8px 16px", borderRadius: "4px", fontSize: "14px",
             cursor: "pointer", fontWeight: 600, transition: "background 0.2s"
          }}
          onMouseOver={e => e.currentTarget.style.background = "#00153D"}
          onMouseOut={e => e.currentTarget.style.background = "#00205B"}
        >
          [Novo Slide]
        </button>

        <button 
          onClick={handleDuplicateVariant} 
          style={{ 
             background: "var(--teal)", color: "#101010", border: "none", 
             padding: "8px 16px", borderRadius: "4px", fontSize: "14px",
             cursor: "pointer", fontWeight: 600, transition: "background 0.2s"
          }}
        >
          [Clonar como Variante]
        </button>
        
        <div style={{ marginLeft: "auto", display: "flex", gap: "10px", alignItems: "center" }}>
            <span style={{ fontSize: "12px", color: "#8ca4c4", marginRight: "10px" }}>
                💡 Dica: Segure <b>Espaço</b> para arrastar a tela.
            </span>
            <button 
              onClick={handleFitScreen} 
              style={{ 
                 background: "#374151", color: "#fff", border: "none", 
                 padding: "8px 16px", borderRadius: "4px", fontSize: "14px",
                 cursor: "pointer", fontWeight: 600
              }}
            >
               🔍 Enquadrar
            </button>
        </div>

        <button 
          onClick={handleSave} 
          className="btn btn-primary"
          style={{ marginLeft: "auto", padding: "8px 24px" }}
        >
           Salvar Design Oficial
        </button>
      </div>
      
      {/* Container onde o Grapes insere a UI de Drag and Drop! */}
      <div style={{ flex: 1, width: "100%", position: 'relative', overflow: 'hidden' }}>
         <div ref={domRef} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}></div>
      </div>
    </div>
  );
}
