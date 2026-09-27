// Immagini dei giochi, generate con sharp in locale (nessun servizio esterno).
//
// Per ogni gioco, in dist/<slug>/img/:
//   preview-256|512.avif|webp   quadrata  → card, splash, giochi correlati
//   cover-640|1280.avif|webp    16:9      → schermata "Play", giochi in evidenza
//   shot-N-480|1280.webp                  → galleria screenshot
// e in dist/<slug>/og.jpg (1200×630)      → anteprima nei link condivisi
//
// Ogni immagine è gestita da sola: un file mancante o corrotto usa un'alternativa
// (preview → segnaposto, cover → generata dalla preview, og → composta) e lo segnala in `notes`.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { esc } from './util.js';

const IMG_EXT = ['png', 'jpg', 'jpeg', 'webp'];
const FONT = 'DejaVu Sans, Arial, Helvetica, sans-serif';

export function findImage(dir, name) {
  if (!dir) return null;
  for (const ext of IMG_EXT) {
    const f = path.join(dir, `${name}.${ext}`);
    if (fs.existsSync(f)) return f;
  }
  return null;
}

function wrapTitle(title, max) {
  const lines = [''];
  for (const w of title.split(/\s+/)) {
    const cur = lines[lines.length - 1];
    if ((cur + ' ' + w).trim().length > max && cur) lines.push(w);
    else lines[lines.length - 1] = (cur + ' ' + w).trim();
  }
  return lines.slice(0, 3);
}

function placeholderSvg(title, accent) {
  const lines = wrapTitle(title, 12);
  const size = lines.length > 2 ? 58 : 70;
  const startY = 256 - ((lines.length - 1) * size * 1.1) / 2 + size * 0.35;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${accent}"/><stop offset="1" stop-color="#1a1a2e"/></linearGradient></defs>
    <rect width="512" height="512" fill="url(#g)"/>
    ${lines.map((l, i) => `<text x="256" y="${startY + i * size * 1.1}" font-family="${FONT}" font-weight="700" font-size="${size}" fill="#fff" text-anchor="middle">${esc(l)}</text>`).join('')}
  </svg>`;
}

const roundedMask = (w, h, r) => Buffer.from(`<svg width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="${r}" fill="#fff"/></svg>`);

async function roundedCard(buf, size, radius) {
  return sharp(buf).resize(size, size).composite([{ input: roundedMask(size, size, radius), blend: 'dest-in' }]).png().toBuffer();
}

/** Sfondo sfocato e scurito a partire da un'immagine. */
async function blurredBackground(buf, w, h, brightness = 0.6) {
  return sharp(buf).resize(w, h, { fit: 'cover' }).blur(30).modulate({ brightness, saturation: 1.15 }).toBuffer();
}

/** Copertina 16:9 generata: sfondo sfocato + preview al centro (senza testo: il titolo è già nella pagina). */
async function generatedCover(previewBuf) {
  const bg = await blurredBackground(previewBuf, 1280, 720, 0.55);
  const card = await roundedCard(previewBuf, 420, 48);
  const shadow = Buffer.from('<svg width="1280" height="720"><defs><filter id="s" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="28"/></filter></defs><rect x="440" y="170" width="400" height="400" rx="48" fill="#000" opacity=".55" filter="url(#s)"/></svg>');
  return sharp(bg).composite([{ input: shadow }, { input: card, top: 150, left: 430 }]).png().toBuffer();
}

/** Immagine per i link condivisi (1200×630): copertina sfocata, preview, categoria, titolo, marchio del sito. */
async function generatedOg({ coverBuf, previewBuf, title, category, siteName, accent, logoPath }) {
  const bg = await blurredBackground(coverBuf, 1200, 630, 0.45);
  const card = await roundedCard(previewBuf, 400, 44);
  const lines = wrapTitle(title, 14);
  const titleSize = lines.length > 2 ? 58 : 68;
  const titleTop = 300 - ((lines.length - 1) * titleSize * 1.12) / 2;
  const catWidth = Math.max(120, category.length * 17 + 48);
  const overlay = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
    <defs><linearGradient id="s" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#07070c" stop-opacity=".25"/><stop offset=".45" stop-color="#07070c" stop-opacity=".75"/><stop offset="1" stop-color="#07070c" stop-opacity=".9"/></linearGradient></defs>
    <rect width="1200" height="630" fill="url(#s)"/>
    <rect x="560" y="${titleTop - titleSize - 58}" width="${catWidth}" height="44" rx="22" fill="${accent}"/>
    <text x="${560 + catWidth / 2}" y="${titleTop - titleSize - 28}" font-family="${FONT}" font-weight="700" font-size="22" fill="#fff" text-anchor="middle" letter-spacing="1">${esc(category.toUpperCase())}</text>
    ${lines.map((l, i) => `<text x="560" y="${titleTop + i * titleSize * 1.12}" font-family="${FONT}" font-weight="700" font-size="${titleSize}" fill="#fff">${esc(l)}</text>`).join('')}
    <text x="560" y="${titleTop + (lines.length - 1) * titleSize * 1.12 + 56}" font-family="${FONT}" font-size="28" fill="#d6d0ff">Play free online · No download</text>
    <text x="${logoPath ? 624 : 560}" y="568" font-family="${FONT}" font-weight="700" font-size="30" fill="#fff">${esc(siteName)}</text>
  </svg>`);
  const layers = [{ input: overlay }, { input: card, top: 115, left: 90 }];
  if (logoPath && fs.existsSync(logoPath)) {
    layers.push({ input: await sharp(logoPath).resize(48, 48).composite([{ input: roundedMask(48, 48, 12), blend: 'dest-in' }]).png().toBuffer(), top: 530, left: 560 });
  }
  return sharp(bg).composite(layers).jpeg({ quality: 84, mozjpeg: true }).toBuffer();
}

async function writeVariants(buf, outDir, base, widths, { ratio, avif = true }) {
  const files = { webp: {}, avif: {} };
  for (const w of widths) {
    const h = Math.round(w * ratio);
    const img = sharp(buf).resize(w, h, { fit: 'cover' });
    const webp = `${base}-${w}.webp`;
    await img.clone().webp({ quality: 80 }).toFile(path.join(outDir, webp));
    files.webp[w] = webp;
    if (avif) {
      const av = `${base}-${w}.avif`;
      await img.clone().avif({ quality: 55, effort: 2 }).toFile(path.join(outDir, av));
      files.avif[w] = av;
    }
  }
  return files;
}

/**
 * Crea tutte le immagini di un gioco.
 *   srcDir       cartella con i file del gioco
 *   outDir       dist/<slug>
 *   coverFile    percorso relativo della copertina (o null)
 *   screenshots  percorsi relativi degli screenshot
 * Ritorna i percorsi relativi a outDir e le note (avvisi).
 */
export async function buildGameImages({ srcDir, outDir, title, category, siteName, accent, logoPath, coverFile, screenshots = [] }) {
  const imgDir = path.join(outDir, 'img');
  fs.mkdirSync(imgDir, { recursive: true });
  const notes = [];
  const load = async (file, label) => {
    try {
      return await sharp(file).rotate().toBuffer();
    } catch (e) {
      notes.push(`${label} non è un'immagine valida (${e.message})`);
      return null;
    }
  };

  // Preview quadrata
  const previewSrc = findImage(srcDir, 'preview');
  let previewBuf = previewSrc ? await load(previewSrc, path.basename(previewSrc)) : null;
  if (previewSrc && !previewBuf) notes.push('usato un segnaposto al posto della preview');
  if (!previewSrc) notes.push('manca preview.png: creata un\'immagine segnaposto con il titolo');
  if (!previewBuf) previewBuf = await sharp(Buffer.from(placeholderSvg(title, accent))).png().toBuffer();
  previewBuf = await sharp(previewBuf).resize(512, 512, { fit: 'cover' }).png().toBuffer();
  const preview = await writeVariants(previewBuf, imgDir, 'preview', [256, 512], { ratio: 1 });

  // Copertina 16:9
  let coverBuf = coverFile ? await load(path.join(srcDir, coverFile), coverFile) : null;
  const generatedCoverUsed = !coverBuf;
  if (!coverBuf) coverBuf = await generatedCover(previewBuf);
  const cover = await writeVariants(coverBuf, imgDir, 'cover', [640, 1280], { ratio: 9 / 16 });

  // Screenshot
  const shots = [];
  for (const [i, rel] of screenshots.entries()) {
    const buf = await load(path.join(srcDir, rel), rel);
    if (!buf) continue;
    const meta = await sharp(buf).metadata();
    const ratio = meta.width && meta.height ? meta.height / meta.width : 9 / 16;
    const n = shots.length + 1;
    const full = `shot-${n}-1280.webp`;
    const thumb = `shot-${n}-480.webp`;
    const fullW = Math.min(1280, meta.width || 1280);
    await sharp(buf).resize(fullW, null, { withoutEnlargement: true }).webp({ quality: 82 }).toFile(path.join(imgDir, full));
    await sharp(buf).resize(480, Math.round(480 * 9 / 16), { fit: 'cover' }).webp({ quality: 76 }).toFile(path.join(imgDir, thumb));
    shots.push({ full, thumb, width: fullW, height: Math.round(fullW * ratio), index: i });
  }

  // Immagine social
  const ogSrc = findImage(srcDir, 'og');
  let ogDone = false;
  if (ogSrc) {
    const buf = await load(ogSrc, path.basename(ogSrc));
    if (buf) {
      await sharp(buf).resize(1200, 630, { fit: 'cover' }).jpeg({ quality: 84, mozjpeg: true }).toFile(path.join(outDir, 'og.jpg'));
      ogDone = true;
    } else notes.push('og.png non valida: immagine social generata');
  }
  if (!ogDone) {
    const og = await generatedOg({ coverBuf, previewBuf, title, category, siteName, accent, logoPath });
    fs.writeFileSync(path.join(outDir, 'og.jpg'), og);
  }

  return { preview, cover, generatedCover: generatedCoverUsed, shots, og: 'og.jpg', notes };
}
