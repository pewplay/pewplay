// Immagini dei giochi, generate con sharp in locale (nessun servizio esterno):
//   preview.webp  512×512   → card in home, splash, giochi correlati
//   og.jpg        1200×630  → anteprima nei link condivisi (WhatsApp, Discord, social…)
// Se il gioco non ha og.*, viene composta partendo da preview + titolo.
// Se non ha nemmeno preview.*, viene creato un segnaposto con il titolo.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { esc } from './util.js';

const IMG_EXT = ['png', 'jpg', 'jpeg', 'webp'];

export function findImage(dir, name) {
  if (!dir) return null;
  for (const ext of IMG_EXT) {
    const f = path.join(dir, `${name}.${ext}`);
    if (fs.existsSync(f)) return f;
  }
  return null;
}

function wrapTitle(title, max = 18) {
  const words = title.split(/\s+/);
  const lines = [''];
  for (const w of words) {
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
    ${lines.map((l, i) => `<text x="256" y="${startY + i * size * 1.1}" font-family="DejaVu Sans, Arial, sans-serif" font-weight="700" font-size="${size}" fill="#fff" text-anchor="middle">${esc(l)}</text>`).join('')}
  </svg>`;
}

function ogOverlaySvg(title, siteName, accent) {
  const lines = wrapTitle(title, 15);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
    <defs><linearGradient id="s" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#0a0a0f" stop-opacity=".92"/><stop offset="1" stop-color="#0a0a0f" stop-opacity=".55"/></linearGradient></defs>
    <rect width="1200" height="630" fill="url(#s)"/>
    <rect x="620" y="585" width="520" height="6" rx="3" fill="${accent}"/>
    ${lines.map((l, i) => `<text x="620" y="${250 + i * 78}" font-family="DejaVu Sans, Arial, sans-serif" font-weight="700" font-size="58" fill="#fff">${esc(l)}</text>`).join('')}
    <text x="620" y="${250 + lines.length * 78 + 20}" font-family="DejaVu Sans, Arial, sans-serif" font-size="30" fill="#c9c3ff">Play free on ${esc(siteName)}</text>
  </svg>`;
}

/**
 * Crea preview.webp e og.jpg in `outDir` partendo dai file del gioco in `srcDir`.
 * Ogni immagine è gestita da sola: se un file è corrotto si usa l'alternativa
 * (preview → segnaposto col titolo, og → composta da preview + titolo) e lo si segnala in `notes`.
 */
export async function buildGameImages({ srcDir, outDir, title, siteName, accent }) {
  fs.mkdirSync(outDir, { recursive: true });
  const notes = [];
  const previewSrc = findImage(srcDir, 'preview');
  const ogSrc = findImage(srcDir, 'og');

  // Preview quadrata
  let previewBuf = null;
  if (previewSrc) {
    try {
      previewBuf = await sharp(previewSrc).resize(512, 512, { fit: 'cover' }).toBuffer();
    } catch (e) {
      notes.push(`${path.basename(previewSrc)} non è un'immagine valida (${e.message}): usato un segnaposto`);
    }
  } else {
    notes.push('manca preview.png: creata un\'immagine segnaposto con il titolo');
  }
  if (!previewBuf) previewBuf = await sharp(Buffer.from(placeholderSvg(title, accent))).resize(512, 512).toBuffer();
  await sharp(previewBuf).webp({ quality: 82 }).toFile(path.join(outDir, 'preview.webp'));

  // Immagine per i link condivisi
  let ogDone = false;
  if (ogSrc) {
    try {
      await sharp(ogSrc).resize(1200, 630, { fit: 'cover' }).jpeg({ quality: 84, mozjpeg: true }).toFile(path.join(outDir, 'og.jpg'));
      ogDone = true;
    } catch (e) {
      notes.push(`${path.basename(ogSrc)} non è un'immagine valida (${e.message}): generata da preview + titolo`);
    }
  }
  if (!ogDone) {
    const bg = await sharp(previewBuf).resize(1200, 630, { fit: 'cover' }).blur(28).modulate({ brightness: 0.7 }).toBuffer();
    const card = await sharp(previewBuf).resize(460, 460)
      .composite([{ input: Buffer.from('<svg width="460" height="460"><rect width="460" height="460" rx="44" fill="#fff"/></svg>'), blend: 'dest-in' }])
      .png().toBuffer();
    await sharp(bg)
      .composite([
        { input: Buffer.from(ogOverlaySvg(title, siteName, accent)), top: 0, left: 0 },
        { input: card, top: 85, left: 85 },
      ])
      .jpeg({ quality: 84, mozjpeg: true })
      .toFile(path.join(outDir, 'og.jpg'));
  }
  return { preview: 'preview.webp', og: 'og.jpg', notes };
}
