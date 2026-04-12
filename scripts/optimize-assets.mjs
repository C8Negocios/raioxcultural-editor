/**
 * C8 Studio — Script de Otimização Profissional de Ativos
 *
 * Tratamento por tipo:
 *   - Fundos JPG/PNG  → Redimensiona para 1920x1080, converte para WebP q85 (6MB → ~200KB)
 *   - Elementos PNG   → Redimensiona max 1920px, comprime PNG mantendo transparência
 *   - SVGs            → Mantidos como estão (já vetorizados, leves)
 *
 * Uso: node scripts/optimize-assets.mjs
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BRAND_DIR = path.join(__dirname, '..', 'public', 'assets', 'brand');

const BACKGROUNDS_DIR = path.join(BRAND_DIR, 'backgrounds');
const GRAPHICS_DIR    = path.join(BRAND_DIR, 'graphics');
const LOGOS_DIR       = path.join(BRAND_DIR, 'logos');

// --- Helpers ---
const formatBytes = (bytes) => {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)}MB`;
};

const getFilesInDir = (dir, exts) => {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => exts.includes(path.extname(f).toLowerCase()))
    .map(f => path.join(dir, f));
};

// --- Processadores ---

/**
 * Fundos: 1920x1080, WebP q85 — modo "cover" (recorta para preencher sem distorcer)
 * Ideal para o pipeline do Python (Pillow suporta WebP nativo).
 */
async function processBackground(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const base = path.basename(filePath, ext);
  const outPath = path.join(BACKGROUNDS_DIR, `${base}.webp`);

  const before = fs.statSync(filePath).size;

  await sharp(filePath)
    .resize(1920, 1080, { fit: 'cover', position: 'center' })
    .webp({ quality: 85, effort: 6 })
    .toFile(outPath);

  const after = fs.statSync(outPath).size;

  // Remove original se gerou arquivo diferente
  if (outPath !== filePath) fs.unlinkSync(filePath);

  return { file: path.basename(outPath), before, after };
}

/**
 * Elementos PNG com transparência: max 3840px width, compressão PNG otimizada
 * Mantemos PNG para preservar o canal Alpha (transparência) que os grafismos precisam
 */
async function processElement(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const base = path.basename(filePath, ext);
  const tmpPath = filePath + '.tmp.png';

  const before = fs.statSync(filePath).size;

  // Verifica se a imagem tem canal alpha (transparência)
  const meta = await sharp(filePath).metadata();
  const hasAlpha = meta.channels === 4 || meta.hasAlpha;

  if (hasAlpha) {
    // PNG com alpha: manter PNG, otimizar
    await sharp(filePath)
      .resize(meta.width > 3840 ? 3840 : undefined, undefined, { withoutEnlargement: true })
      .png({ compressionLevel: 9, adaptiveFiltering: true, palette: false })
      .toFile(tmpPath);
  } else {
    // Sem transparência: converter para WebP
    const outPath = path.join(path.dirname(filePath), base + '.webp');
    await sharp(filePath)
      .resize(3840, null, { withoutEnlargement: true })
      .webp({ quality: 88, effort: 6 })
      .toFile(outPath);
    const after = fs.statSync(outPath).size;
    fs.unlinkSync(filePath);
    return { file: path.basename(outPath), before, after };
  }

  fs.unlinkSync(filePath);
  fs.renameSync(tmpPath, filePath);

  const after = fs.statSync(filePath).size;
  return { file: path.basename(filePath), before, after };
}

// --- Runner ---
async function run() {
  let totalBefore = 0;
  let totalAfter = 0;
  const report = [];

  console.log('\n🎨 C8 Studio — Tratamento Profissional de Ativos\n');
  console.log('━'.repeat(60));

  // 1. FUNDOS (JPG e PNG → WebP 1920x1080)
  console.log('\n📸 Fundos & Texturas 3D (→ WebP 1920x1080 @ q85):');
  const bgFiles = getFilesInDir(BACKGROUNDS_DIR, ['.jpg', '.jpeg', '.png']);
  for (const f of bgFiles) {
    try {
      const result = await processBackground(f);
      const gain = (((result.before - result.after) / result.before) * 100).toFixed(1);
      const status = result.after < result.before ? '✅' : '⚠️';
      console.log(`  ${status} ${result.file}`);
      console.log(`     ${formatBytes(result.before)} → ${formatBytes(result.after)} (${gain}% menor)`);
      totalBefore += result.before;
      totalAfter += result.after;
      report.push(result);
    } catch (e) {
      console.log(`  ❌ ERRO em ${path.basename(f)}: ${e.message}`);
    }
  }

  // 2. ELEMENTOS/GRAFISMOS (PNG com alpha)
  console.log('\n🎭 Elementos & Grafismos (PNG Alpha otimizado):');
  const graphicFiles = getFilesInDir(GRAPHICS_DIR, ['.png', '.jpg', '.jpeg']);
  for (const f of graphicFiles) {
    try {
      const result = await processElement(f);
      const gain = (((result.before - result.after) / result.before) * 100).toFixed(1);
      const status = result.after < result.before ? '✅' : '⚠️';
      console.log(`  ${status} ${result.file}: ${formatBytes(result.before)} → ${formatBytes(result.after)} (${gain}% menor)`);
      totalBefore += result.before;
      totalAfter += result.after;
      report.push(result);
    } catch (e) {
      console.log(`  ❌ ERRO em ${path.basename(f)}: ${e.message}`);
    }
  }

  // 3. LOGOS (PNG com alpha)
  console.log('\n🏷️  Logos & Topologia (PNG Alpha otimizado):');
  const logoFiles = getFilesInDir(LOGOS_DIR, ['.png', '.jpg', '.jpeg']);
  for (const f of logoFiles) {
    try {
      const result = await processElement(f);
      const gain = (((result.before - result.after) / result.before) * 100).toFixed(1);
      const status = result.after < result.before ? '✅' : '⚠️';
      console.log(`  ${status} ${result.file}: ${formatBytes(result.before)} → ${formatBytes(result.after)} (${gain}% menor)`);
      totalBefore += result.before;
      totalAfter += result.after;
      report.push(result);
    } catch (e) {
      console.log(`  ❌ ERRO em ${path.basename(f)}: ${e.message}`);
    }
  }

  console.log('\n' + '━'.repeat(60));
  const totalGain = (((totalBefore - totalAfter) / totalBefore) * 100).toFixed(1);
  console.log(`\n📊 RESULTADO FINAL`);
  console.log(`   Total antes:  ${formatBytes(totalBefore)}`);
  console.log(`   Total depois: ${formatBytes(totalAfter)}`);
  console.log(`   💾 Economia:  ${formatBytes(totalBefore - totalAfter)} (${totalGain}% menor)\n`);

  // 4. Atualizar c8-assets.json para referenciar os novos arquivos .webp
  console.log('📝 Atualizando c8-assets.json para referenciar arquivos WebP...');
  const assetsJsonPath = path.join(__dirname, '..', 'app', 'studio', 'c8-assets.json');
  let assetsRaw = fs.readFileSync(assetsJsonPath, 'utf-8');
  // Substitui .jpg e .jpeg por .webp nas URLs de background
  assetsRaw = assetsRaw.replace(/\.jpg"/g, '.webp"').replace(/\.jpeg"/g, '.webp"');
  // Substitui .png por .webp nas URLs de backgrounds (não logos/graphics que têm alpha)
  // Só para a seção backgrounds
  const assetsJson = JSON.parse(assetsRaw);
  assetsJson.backgrounds = assetsJson.backgrounds.map(bg => ({
    ...bg,
    url: bg.url.replace(/\.(jpg|jpeg|png)$/, '.webp')
  }));
  fs.writeFileSync(assetsJsonPath, JSON.stringify(assetsJson, null, 2));
  console.log('   ✅ c8-assets.json atualizado!\n');
}

run().catch(console.error);
