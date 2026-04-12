const fs = require('fs');

const file = 'c:\\Users\\kalopsia\\Documents\\Projetos_Coolify_EcossistemaC8Club\\raioxcultural-editor\\app\\studio\\StudioEditor.tsx';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `                    <h4 style={{ color: '#9CA3AF', fontSize: '11px', textTransform: 'uppercase', marginBottom: '12px', fontWeight: 700, letterSpacing: '0.5px' }}>Ativos C8 Club</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        {assets.map((src, i) => (
                           <div key={i} onClick={() => addImageElement(src)} style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80px', transition: 'transform 0.1s, box-shadow 0.1s' }} onMouseEnter={(e)=>{e.currentTarget.style.transform='scale(1.02)'; e.currentTarget.style.boxShadow='0 4px 6px -1px rgba(0,0,0,0.05)'}} onMouseLeave={(e)=>{e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='none'}}>
                               <img src={src} style={{ maxWidth: '100%', maxHeight: '60px', objectFit: 'contain' }} />
                           </div>
                        ))}
                    </div>`;

const newAssetsUI = `                    <div style={{ marginBottom: '24px' }}>
                        <h4 style={{ color: '#9CA3AF', fontSize: '11px', textTransform: 'uppercase', marginBottom: '12px', fontWeight: 700, letterSpacing: '0.5px' }}>Fundos & Texturas 3D</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            {c8Assets.backgrounds.map((bg) => (
                               <div key={bg.id} onClick={() => currentSlide && updateSlide({...currentSlide, backgroundColor: \`url('\${bg.url}')\`})} style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '6px', overflow: 'hidden', cursor: 'pointer', height: '60px', transition: 'all 0.2s' }} onMouseEnter={(e)=>e.currentTarget.style.borderColor='#0EA5E9'} onMouseLeave={(e)=>e.currentTarget.style.borderColor='#E5E7EB'}>
                                   <div style={{ width: '100%', height: '100%', backgroundImage: \`url('\${bg.url}')\`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                               </div>
                            ))}
                        </div>
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <h4 style={{ color: '#9CA3AF', fontSize: '11px', textTransform: 'uppercase', marginBottom: '12px', fontWeight: 700, letterSpacing: '0.5px' }}>Grafismos de Apoio</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            {c8Assets.graphics.map((gr) => (
                               <div key={gr.id} onClick={() => addImageElement(gr.url)} style={{ background: gr.id.includes('branco-padrao') ? '#00205B' : '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '6px', padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60px', transition: 'transform 0.1s' }} onMouseEnter={(e)=>e.currentTarget.style.transform='scale(1.05)'} onMouseLeave={(e)=>e.currentTarget.style.transform='none'}>
                                   <img src={gr.url} style={{ maxWidth: '100%', maxHeight: '40px', objectFit: 'contain' }} />
                               </div>
                            ))}
                        </div>
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <h4 style={{ color: '#9CA3AF', fontSize: '11px', textTransform: 'uppercase', marginBottom: '12px', fontWeight: 700, letterSpacing: '0.5px' }}>Topologia e Marcas</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            {c8Assets.logos.map((lg) => (
                               <div key={lg.id} onClick={() => addImageElement(lg.url)} style={{ background: lg.id.includes('branco') ? '#111827' : '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '6px', padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60px', transition: 'transform 0.1s' }} onMouseEnter={(e)=>e.currentTarget.style.transform='scale(1.05)'} onMouseLeave={(e)=>e.currentTarget.style.transform='none'}>
                                   <img src={lg.url} style={{ maxWidth: '100%', maxHeight: '40px', objectFit: 'contain' }} />
                               </div>
                            ))}
                        </div>
                    </div>`;

if (content.includes("Ativos C8 Club")) {
   // CRLF safety
   const safeTarget = targetStr.replace(/\\r\\n/g, '\\n');
   let safeContent = content.replace(/\\r\\n/g, '\\n');
   
   if (safeContent.includes(safeTarget)) {
       safeContent = safeContent.replace(safeTarget, newAssetsUI);
       fs.writeFileSync(file, safeContent);
       console.log("Success: Injected new assets UI.");
   } else {
       console.log("Warning: Target not exactly matched, falling back to regex block replacement...");
       const regex = /<h4[^>]*>Ativos C8 Club<\\/h4>[\\s\\S]*?<\\/div>[\\s\\S]*?<\\/div>/;
       if (regex.test(safeContent)) {
           safeContent = safeContent.replace(regex, newAssetsUI);
           fs.writeFileSync(file, safeContent);
           console.log("Success: Injected via Regex fallback.");
       } else {
           console.log("Error: Could not locate block.");
       }
   }
} else {
   console.log("Error: Could not find 'Ativos C8 Club'");
}
