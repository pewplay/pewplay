// Lettura, validazione e normalizzazione di game.json.
// Nessuna dipendenza esterna: usato sia dalla build sia da `npm run check`
// (e dalla GitHub Action dei repo dei giochi).
import fs from 'node:fs';
import path from 'node:path';
import { prettifySlug } from './util.js';
import { CATEGORIES, normalizeCategory, categorySlug } from './strings.js';

export const PLAY_MODES = ['SinglePlayer', 'MultiPlayer', 'Both'];
export const ORIENTATIONS = ['any', 'landscape', 'portrait'];
const KNOWN_KEYS = new Set([
  '$schema', 'title', 'description', 'about', 'howToPlay', 'controls', 'tips', 'faq',
  'category', 'tags', 'author', 'playMode', 'orientation', 'cover', 'screenshots',
  'featured', 'added', 'draft', 'exclude',
]);
export const MAX_SCREENSHOTS = 8;
const IMAGE_EXT = /\.(png|jpe?g|webp)$/i;
const PLACEHOLDER_AUTHORS = ['your name', ''];

const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
const str = v => (typeof v === 'string' ? v.trim() : '');

/** Legge game.json. Ritorna { raw, file, parseError }. */
export function readGameJson(dir) {
  const file = path.join(dir, 'game.json');
  if (!fs.existsSync(file)) return { raw: null, file: null };
  try {
    return { raw: JSON.parse(fs.readFileSync(file, 'utf8')), file: 'game.json' };
  } catch (e) {
    return { raw: null, file: 'game.json', parseError: e.message };
  }
}

/** Controlla game.json. Gli errori bloccano la pubblicazione, i warning no. */
export function validateGameJson(raw) {
  const errors = [];
  const warnings = [];
  if (!isObj(raw)) return { errors: ['game.json deve contenere un oggetto JSON { ... }'], warnings };

  for (const key of Object.keys(raw)) {
    if (!KNOWN_KEYS.has(key)) warnings.push(`campo sconosciuto "${key}" (verrà ignorato)`);
  }
  // Testi in più lingue (formato vecchio { "en": "...", "it": "..." }): il sito è solo in inglese
  const multiLang = v => isObj(v) && typeof v.en === 'string';
  for (const key of ['title', 'description', 'about', 'howToPlay', 'category', 'author', 'cover']) {
    if (raw[key] === undefined || typeof raw[key] === 'string') continue;
    if (multiLang(raw[key])) {
      errors.push(`"${key}" è nel formato vecchio con più lingue: il sito è solo in inglese, scrivi "${key}": ${JSON.stringify(raw[key].en).slice(0, 60)}${raw[key].en.length > 55 ? '…"' : ''}`);
    } else {
      errors.push(`"${key}" deve essere un testo, es. "${key}": "..."`);
    }
  }
  if (raw.title === undefined || raw.title === '') warnings.push('manca "title": verrà usato il nome del repo');
  if (raw.description === undefined || raw.description === '') warnings.push('manca "description": importante per Google e per i link condivisi');
  else if (typeof raw.description === 'string' && (raw.description.length < 50 || raw.description.length > 170)) {
    warnings.push(`"description" dovrebbe essere lunga 50–160 caratteri (ora ${raw.description.length})`);
  }
  if (typeof raw.category === 'string' && raw.category.trim()) {
    const cat = normalizeCategory(raw.category);
    if (!CATEGORIES.includes(cat)) {
      warnings.push(`categoria "${cat}" non standard: la sua pagina /${categorySlug(cat)}/ avrà un testo generico. Usa una standard (${CATEGORIES.join(', ')}) oppure aggiungila in src/strings.js (CATEGORY_INFO) del repo pewplay`);
    } else if (cat !== raw.category) {
      warnings.push(`categoria "${raw.category}" letta come "${cat}": scrivi "category": "${cat}"`);
    }
  }
  for (const key of ['tags', 'exclude']) {
    if (raw[key] !== undefined && !(Array.isArray(raw[key]) && raw[key].every(x => typeof x === 'string'))) {
      errors.push(`"${key}" deve essere una lista di stringhe`);
    }
  }
  if (typeof raw.author === 'string' && PLACEHOLDER_AUTHORS.includes(raw.author.trim().toLowerCase())) {
    warnings.push('"author" sembra ancora il valore del template');
  }
  if (raw.playMode !== undefined && !PLAY_MODES.includes(raw.playMode)) {
    errors.push(`"playMode" deve essere uno tra: ${PLAY_MODES.join(', ')}`);
  }
  if (raw.orientation !== undefined && !ORIENTATIONS.includes(raw.orientation)) {
    errors.push(`"orientation" deve essere uno tra: ${ORIENTATIONS.join(', ')}`);
  }
  for (const key of ['featured', 'draft']) {
    if (raw[key] !== undefined && typeof raw[key] !== 'boolean') errors.push(`"${key}" deve essere true o false`);
  }
  if (raw.added !== undefined && !(typeof raw.added === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.added) && !isNaN(Date.parse(raw.added)))) {
    errors.push('"added" deve essere una data nel formato AAAA-MM-GG');
  }
  if (raw.tips !== undefined && !(Array.isArray(raw.tips) && raw.tips.every(x => typeof x === 'string'))) {
    errors.push('"tips" deve essere una lista di frasi, es. ["Tip one.", "Tip two."]');
  }
  if (raw.faq !== undefined) {
    if (!Array.isArray(raw.faq)) errors.push('"faq" deve essere una lista');
    else raw.faq.forEach((f, i) => {
      if (!isObj(f) || typeof f.question !== 'string' || typeof f.answer !== 'string' || !f.question.trim() || !f.answer.trim()) {
        errors.push(`"faq[${i}]" deve essere { "question": "...", "answer": "..." }`);
      }
    });
  }
  if (typeof raw.cover === 'string' && !IMAGE_EXT.test(raw.cover)) errors.push('"cover" deve essere un file .png, .jpg o .webp');
  if (raw.screenshots !== undefined) {
    if (!(Array.isArray(raw.screenshots) && raw.screenshots.every(x => typeof x === 'string'))) {
      errors.push('"screenshots" deve essere una lista di file, es. ["screenshots/1.png"]');
    } else {
      if (raw.screenshots.some(x => !IMAGE_EXT.test(x))) errors.push('"screenshots" accetta solo file .png, .jpg o .webp');
      if (raw.screenshots.length > MAX_SCREENSHOTS) warnings.push(`"screenshots": vengono usati solo i primi ${MAX_SCREENSHOTS}`);
    }
  }
  if (raw.controls !== undefined) {
    if (!Array.isArray(raw.controls)) errors.push('"controls" deve essere una lista');
    else raw.controls.forEach((c, i) => {
      if (isObj(c) && typeof c.input === 'string' && multiLang(c.action)) {
        errors.push(`"controls[${i}].action" è nel formato vecchio con più lingue: scrivi "action": ${JSON.stringify(c.action.en)}`);
      } else if (!isObj(c) || typeof c.input !== 'string' || typeof c.action !== 'string') {
        errors.push(`"controls[${i}]" deve essere { "input": "Space", "action": "Jump" }`);
      }
    });
  }
  return { errors, warnings };
}

/** Applica i valori predefiniti ai dati di game.json. */
export function normalizeGame(raw, { slug, repoDescription = '' }) {
  const c = isObj(raw) ? raw : {};
  return {
    slug,
    title: str(c.title) || prettifySlug(slug),
    description: str(c.description) || str(repoDescription),
    about: str(c.about),
    howToPlay: str(c.howToPlay),
    tips: Array.isArray(c.tips) ? c.tips.map(str).filter(Boolean) : [],
    faq: Array.isArray(c.faq)
      ? c.faq.filter(f => isObj(f) && str(f.question) && str(f.answer)).map(f => ({ question: str(f.question), answer: str(f.answer) }))
      : [],
    cover: str(c.cover) || null,
    screenshots: Array.isArray(c.screenshots) ? c.screenshots.map(str).filter(Boolean).slice(0, MAX_SCREENSHOTS) : [],
    controls: Array.isArray(c.controls)
      ? c.controls.filter(x => isObj(x) && x.input).map(x => ({ input: String(x.input), action: str(x.action) }))
      : [],
    category: normalizeCategory(c.category),
    tags: [...new Set((Array.isArray(c.tags) ? c.tags : []).map(String))],
    author: PLACEHOLDER_AUTHORS.includes(str(c.author).toLowerCase()) ? '' : str(c.author),
    playMode: PLAY_MODES.includes(c.playMode) ? c.playMode : 'SinglePlayer',
    orientation: ORIENTATIONS.includes(c.orientation) ? c.orientation : 'any',
    featured: c.featured === true,
    added: typeof c.added === 'string' ? c.added : null,
    draft: c.draft === true,
    exclude: Array.isArray(c.exclude) ? c.exclude.map(String) : [],
  };
}

// File che non vengono mai pubblicati (oltre a quelli in "exclude" del gioco).
export const DEFAULT_EXCLUDE = [
  '.git', '.github', '.pewplay', '.gitignore', '.gitattributes', '.gitmodules', '.editorconfig', '.jshintrc',
  '.DS_Store', 'Thumbs.db', 'desktop.ini', '.vscode', '.idea', 'node_modules', '.sass-cache',
  '*.md', '*.scss', '*.sass', 'package.json', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
  'Rakefile', 'Gemfile', 'Gemfile.lock', '*.py',
  '/game.json', '/og.png', '/og.jpg', '/og.jpeg', '/og.webp',
  // immagini per il sito (copertina e screenshot): vengono ottimizzate a parte, non servono al gioco
  '/cover.png', '/cover.jpg', '/cover.jpeg', '/cover.webp', '/screenshots',
];

/** Trova i file di copertina e screenshot di un gioco (campi di game.json o nomi standard). */
export function findSiteImages(dir, game) {
  const exists = rel => rel && fs.existsSync(path.join(dir, rel)) && fs.statSync(path.join(dir, rel)).isFile();
  const cover = game.cover
    ? (exists(game.cover) ? game.cover : null)
    : ['cover.png', 'cover.jpg', 'cover.jpeg', 'cover.webp'].find(exists) || null;
  let screenshots = game.screenshots.filter(exists);
  const missing = [...(game.cover && !cover ? [game.cover] : []), ...game.screenshots.filter(s => !exists(s))];
  if (!game.screenshots.length && fs.existsSync(path.join(dir, 'screenshots'))) {
    screenshots = fs.readdirSync(path.join(dir, 'screenshots'))
      .filter(f => IMAGE_EXT.test(f)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .slice(0, MAX_SCREENSHOTS).map(f => `screenshots/${f}`);
  }
  return { cover, screenshots, missing };
}
