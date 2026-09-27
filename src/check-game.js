#!/usr/bin/env node
// Controlla che la cartella di un gioco sia pronta per PewPlay.
//   npm run check -- ../mio-gioco
// Usato anche dalla GitHub Action dei repo dei giochi. Nessuna dipendenza npm.
import fs from 'node:fs';
import path from 'node:path';
import { readGameJson, validateGameJson, normalizeGame, findSiteImages, DEFAULT_EXCLUDE } from './game-config.js';
import { walkFiles, makeMatcher, formatBytes } from './util.js';

const dir = path.resolve(process.argv[2] || '.');
const errors = [];
const warnings = [];
const ok = [];

if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
  console.error(`\nERRORE: la cartella "${dir}" non esiste.\n        Uso: npm run check -- ../nome-del-gioco\n`);
  process.exit(1);
}

function pngSize(file) {
  const b = fs.readFileSync(file);
  if (b.length > 24 && b.toString('ascii', 1, 4) === 'PNG') return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
  return null;
}

// game.json
let game = null;
const { raw, file, parseError } = readGameJson(dir);
if (parseError) errors.push(`${file} non è JSON valido: ${parseError}`);
else if (!raw) errors.push('manca game.json nella root del repo');
else {
  const v = validateGameJson(raw);
  errors.push(...v.errors);
  warnings.push(...v.warnings);
  const g = normalizeGame(raw, { slug: path.basename(dir) });
  ok.push(`game.json: "${g.title}" · ${g.category}${g.draft ? ' · bozza' : ''}`);
  if (g.draft) warnings.push('"draft": true → il gioco NON va sul sito pubblico anche se è su main');
  // Contenuti consigliati: più testo utile = pagina migliore per Google e per i giocatori
  const missingContent = [
    !g.about && '"about"', !g.howToPlay && '"howToPlay"', !g.controls.length && '"controls"', !g.tips.length && '"tips"', !g.faq.length && '"faq"',
  ].filter(Boolean);
  if (missingContent.length) warnings.push(`contenuti consigliati mancanti: ${missingContent.join(', ')} (vedi il template)`);
  else ok.push('contenuti: about, howToPlay, controls, tips, faq');
  game = g;
}

// index.html
const indexFile = path.join(dir, 'index.html');
if (!fs.existsSync(indexFile)) errors.push('manca index.html nella root del repo');
else {
  const html = fs.readFileSync(indexFile, 'utf8');
  ok.push('index.html presente');
  if (!/<meta[^>]+name=["']viewport["']/i.test(html)) warnings.push('index.html: manca <meta name="viewport"> (serve per il mobile)');
  const abs = html.match(/(?:src|href)=["']\/(?!\/)[^"']*/gi);
  if (abs) warnings.push(`index.html usa percorsi assoluti (${abs.slice(0, 3).join(', ')}…): usa percorsi relativi, il gioco sta in /<nome-repo>/play/`);
}

// immagini
const preview = ['png', 'jpg', 'jpeg', 'webp'].map(e => path.join(dir, `preview.${e}`)).find(f => fs.existsSync(f));
if (!preview) warnings.push('manca preview.png (512×512): verrà creato un segnaposto');
else {
  const s = preview.endsWith('.png') ? pngSize(preview) : null;
  if (s && s.w !== s.h) warnings.push(`preview.png non è quadrata (${s.w}×${s.h})`);
  else if (s && s.w < 512) warnings.push(`preview.png è piccola (${s.w}×${s.h}), consigliato 512×512`);
  else ok.push(`preview: ${path.basename(preview)}${s ? ` ${s.w}×${s.h}` : ''}`);
}
const og = ['png', 'jpg', 'jpeg', 'webp'].map(e => path.join(dir, `og.${e}`)).find(f => fs.existsSync(f));
ok.push(og ? `immagine social: ${path.basename(og)}` : 'immagine social: verrà generata automaticamente');
if (game) {
  const imgs = findSiteImages(dir, game);
  for (const m of imgs.missing) errors.push(`il file "${m}" indicato in game.json non esiste`);
  if (imgs.cover) {
    const s = imgs.cover.endsWith('.png') ? pngSize(path.join(dir, imgs.cover)) : null;
    if (s && Math.abs(s.w / s.h - 16 / 9) > 0.05) warnings.push(`copertina ${imgs.cover} non è 16:9 (${s.w}×${s.h}): verrà ritagliata`);
    else if (s && s.w < 1280) warnings.push(`copertina ${imgs.cover} è piccola (${s.w}×${s.h}), consigliato 1280×720`);
    else ok.push(`copertina: ${imgs.cover}${s ? ` ${s.w}×${s.h}` : ''}`);
  } else if (!imgs.missing.length) {
    warnings.push('manca la copertina (cover.png 1280×720): verrà generata dalla preview');
  }
  if (imgs.screenshots.length) ok.push(`screenshot: ${imgs.screenshots.length}`);
  else warnings.push('nessuno screenshot (cartella screenshots/ o campo "screenshots"): consigliati 2–4');
}

// file pubblicati
if (fs.existsSync(dir)) {
  const excluded = makeMatcher([...DEFAULT_EXCLUDE, ...(Array.isArray(raw?.exclude) ? raw.exclude : [])]);
  const all = walkFiles(dir).filter(f => !f.startsWith('.git/') && !f.startsWith('.pewplay/'));
  const published = all.filter(f => !excluded(f));
  let total = 0;
  for (const f of published) {
    const size = fs.statSync(path.join(dir, f)).size;
    total += size;
    if (size > 25 * 1024 * 1024) errors.push(`${f} pesa ${formatBytes(size)}: Cloudflare Pages accetta file fino a 25 MB`);
  }
  ok.push(`file pubblicati: ${published.length} (${formatBytes(total)}), esclusi: ${all.length - published.length}`);
  if (total > 30 * 1024 * 1024) warnings.push(`il gioco pesa ${formatBytes(total)}: valuta "exclude" per file non necessari`);
}

// output
console.log(`\nControllo gioco: ${dir}\n`);
for (const m of ok) console.log(`  OK      ${m}`);
for (const m of warnings) console.log(`  AVVISO  ${m}`);
for (const m of errors) console.log(`  ERRORE  ${m}`);
if (process.env.GITHUB_ACTIONS) {
  for (const m of warnings) console.log(`::warning title=PewPlay::${m}`);
  for (const m of errors) console.log(`::error title=PewPlay::${m}`);
}
console.log(errors.length ? `\nRisultato: ${errors.length} errori, il gioco NON verrà pubblicato finché non li correggi.\n` : '\nRisultato: pronto per PewPlay.\n');
process.exit(errors.length ? 1 : 0);
