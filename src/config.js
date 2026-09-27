// Carica site.config.js, gli argomenti da riga di comando e le variabili d'ambiente.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { BuildError } from './report.js';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Carica un file .env locale (se esiste) senza sovrascrivere le variabili già impostate. */
function loadDotEnv() {
  const file = path.join(ROOT, '.env');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

export function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const [key, inline] = a.slice(2).split('=');
    if (inline !== undefined) args[key] = inline;
    else if (argv[i + 1] && !argv[i + 1].startsWith('--')) args[key] = argv[++i];
    else args[key] = true;
  }
  return args;
}

/** Controlla site.config.js e segnala subito i valori sbagliati. */
function validateConfig(c) {
  const problems = [];
  const isUrl = v => typeof v === 'string' && /^https?:\/\/[^/\s]+/.test(v);
  if (!c || typeof c !== 'object') return ['site.config.js deve esportare un oggetto (export default { ... })'];
  if (!c.name) problems.push('"name" è vuoto');
  if (!isUrl(c.url)) problems.push('"url" deve essere un indirizzo completo, es. https://www.pewplay.com');
  if (!isUrl(c.previewUrl)) problems.push('"previewUrl" deve essere un indirizzo completo, es. https://preview.pewplay.pages.dev');
  if (!c.github || !c.github.org) problems.push('"github.org" è vuoto');
  if (!c.github || !c.github.previewBranch) problems.push('"github.previewBranch" è vuoto');
  if (!c.cloudflare || !/^[a-z0-9][a-z0-9-]{0,57}$/.test(c.cloudflare.pagesProject || '')) {
    problems.push('"cloudflare.pagesProject" deve contenere solo lettere minuscole, numeri e trattini');
  }
  if (c.adsensePublisherId && !/^(ca-)?pub-\d{10,20}$/.test(c.adsensePublisherId)) problems.push('"adsensePublisherId" deve essere tipo pub-1234567890123456 (oppure vuoto)');
  if (c.gaMeasurementId && !/^G-[A-Z0-9]+$/.test(c.gaMeasurementId)) problems.push('"gaMeasurementId" deve essere tipo G-XXXXXXXXXX (oppure vuoto)');
  if (!c.privacy || !c.privacy.updated) problems.push('"privacy.updated" è vuoto');
  if (!c.build) problems.push('manca il blocco "build"');
  return problems;
}

export async function loadOptions(argv = process.argv.slice(2)) {
  loadDotEnv();
  const args = parseArgs(argv);
  let config;
  try {
    ({ default: config } = await import(pathToFileURL(path.join(ROOT, 'site.config.js')).href));
  } catch (e) {
    throw new BuildError(`site.config.js non è leggibile: ${e.message}`, ['Controlla virgole, apici e parentesi nel file.']);
  }
  const problems = validateConfig(config);
  if (problems.length) throw new BuildError('site.config.js contiene valori non validi:', problems.map(p => `- ${p}`));

  const target = args.target || process.env.PEWPLAY_TARGET || 'production';
  if (!['production', 'preview'].includes(target)) throw new BuildError(`--target deve essere "production" o "preview" (ricevuto "${target}")`);
  if (args.games && (!fs.existsSync(args.games) || !fs.statSync(args.games).isDirectory())) {
    throw new BuildError(`La cartella dei giochi "${args.games}" non esiste.`, ['Esempio: npm run dev -- --games ..  (la cartella che contiene i repo dei giochi)']);
  }

  return {
    config,
    target,
    isPreview: target === 'preview',
    gamesDir: args.games ? path.resolve(args.games) : null,     // modalità locale
    outDir: path.resolve(ROOT, args.out || 'dist'),
    cacheDir: path.resolve(ROOT, '.cache', target),
    only: args.only ? String(args.only).split(',').map(s => s.trim()) : null,
    org: process.env.PEWPLAY_ORG || config.github.org,
    token: process.env.GH_TOKEN || process.env.GITHUB_TOKEN || '',
    // In locale il sito di anteprima usa URL relativi al server locale
    baseUrl: args['base-url'] || (target === 'preview' ? config.previewUrl : config.url),
  };
}
