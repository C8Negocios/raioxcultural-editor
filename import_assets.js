const fs = require('fs');
const path = require('path');

const srcDir = 'c:\\Users\\kalopsia\\Documents\\Projetos_Coolify_EcossistemaC8Club\\administrativo\\C8 _ Acesso Marca_';
const destDir = 'c:\\Users\\kalopsia\\Documents\\Projetos_Coolify_EcossistemaC8Club\\raioxcultural-editor\\public\\assets\\brand';

// Helpers
function normalizeName(name) {
    let lower = name.toLowerCase().replace(/ /g, '-');
    lower = lower.replace(/=/g, '-');
    lower = lower.replace(/,/g, '');
    lower = lower.normalize('NFD').replace(/[\u0300-\u036f]/g, ""); // remove acentos
    return lower;
}

function copyFiles(srcPath, destPath, config) {
    if (!fs.existsSync(destPath)) {
        fs.mkdirSync(destPath, { recursive: true });
    }
    
    const files = fs.readdirSync(srcPath);
    let assetList = [];

    for (const file of files) {
        const ext = path.extname(file).toLowerCase();
        if (['.jpg', '.png', '.svg'].includes(ext)) {
            const safeName = normalizeName(config.namePrefix ? `${config.namePrefix}-${file}` : file);
            const srcFile = path.join(srcPath, file);
            const destFile = path.join(destPath, safeName);
            fs.copyFileSync(srcFile, destFile);
            assetList.push({
               id: safeName,
               url: `/assets/brand/${config.subFolder}/${safeName}`,
               type: config.type,
               name: file.replace(ext, '')
            });
        }
    }
    return assetList;
}

const allAssets = { backgrounds: [], graphics: [], logos: [] };

// 1. Logos
const logosDir = path.join(destDir, 'logos');
allAssets.logos.push(...copyFiles(path.join(srcDir, '1. Logotipo e Variações_', 'Vetorizados', 'BRANCO'), logosDir, { type: 'logo', subFolder: 'logos', namePrefix: 'branco' }));
allAssets.logos.push(...copyFiles(path.join(srcDir, '1. Logotipo e Variações_', 'Vetorizados', 'PRETO'), logosDir, { type: 'logo', subFolder: 'logos', namePrefix: 'preto' }));
allAssets.logos.push(...copyFiles(path.join(srcDir, '1. Logotipo e Variações_', 'Vetorizados', 'COR - RGB', 'AZUL CLARO'), logosDir, { type: 'logo', subFolder: 'logos', namePrefix: 'azul-claro' }));
allAssets.logos.push(...copyFiles(path.join(srcDir, '1. Logotipo e Variações_', 'Vetorizados', 'COR - RGB', 'AZUL ESCURO'), logosDir, { type: 'logo', subFolder: 'logos', namePrefix: 'azul-escuro' }));

// 2. Fundos Degradê 3D
const bgDir = path.join(destDir, 'backgrounds');
allAssets.backgrounds.push(...copyFiles(path.join(srcDir, '4. Elementos de Apoio', 'Fundos - Efeito degradê'), bgDir, { type: 'background', subFolder: 'backgrounds' }));

// 3. Grafismos
const graphicsDir = path.join(destDir, 'graphics');
allAssets.graphics.push(...copyFiles(path.join(srcDir, '4. Elementos de Apoio', 'Grafismos'), graphicsDir, { type: 'graphic', subFolder: 'graphics' }));
allAssets.graphics.push(...copyFiles(path.join(srcDir, '4. Elementos de Apoio', 'Grafismos', 'AZUL ESCURO'), graphicsDir, { type: 'graphic', subFolder: 'graphics', namePrefix: 'azul-escuro' }));
allAssets.graphics.push(...copyFiles(path.join(srcDir, '4. Elementos de Apoio', 'Grafismos', 'BRANCO'), graphicsDir, { type: 'graphic', subFolder: 'graphics', namePrefix: 'branco' }));
allAssets.graphics.push(...copyFiles(path.join(srcDir, '4. Elementos de Apoio', 'Grafismos', 'PRETO'), graphicsDir, { type: 'graphic', subFolder: 'graphics', namePrefix: 'preto' }));

const jsonPath = path.join('c:\\Users\\kalopsia\\Documents\\Projetos_Coolify_EcossistemaC8Club\\raioxcultural-editor\\app\\studio', 'c8-assets.json');
fs.writeFileSync(jsonPath, JSON.stringify(allAssets, null, 2));

console.log('Assets copiados com sucesso para public/assets/brand!');
console.log('Metadados exportados para app/studio/c8-assets.json');
