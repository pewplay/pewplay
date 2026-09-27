#!/usr/bin/env node
// ============================================================
//  Prepara il branch "preview" di tutti i giochi dell'organizzazione
//  con la struttura nuova di PewPlay. Non tocca MAI il branch main.
//
//  node tools/prepare-preview-branches.js            → prova: prepara tutto in .migration/ e mostra il riepilogo
//  node tools/prepare-preview-branches.js --apply    → come sopra + commit e push dei branch preview
//  node tools/prepare-preview-branches.js --only angle,dino   → solo alcuni repo
//
//  Per ogni repo che è un gioco (ha game.json o index.html nella root):
//   1. parte dal branch preview se esiste, altrimenti lo crea da main
//   2. aggiunge .github/workflows/pewplay.yml (aggiornamento automatico del sito)
//   3. aggiorna game.json al formato attuale (vedi migrateGameJson)
//   4. controlla il risultato con le stesse regole della build
//   5. con --apply: commit + push di preview
//
//  Requisiti: git configurato con i permessi di push sull'organizzazione.
//  Per pushare file in .github/workflows serve il permesso "workflow"
//  (con GitHub CLI: gh auth refresh -s workflow).
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import { loadOptions, parseArgs, ROOT } from '../src/config.js';
import { readGameJson, validateGameJson } from '../src/game-config.js';
import { run } from '../src/util.js';
import { BuildError, printFatal } from '../src/report.js';

const SCHEMA_URL = org => `https://raw.githubusercontent.com/${org}/pewplay/main/schema/game.schema.json`;
const WORKFLOW_SRC = path.join(ROOT, 'tools', 'game-workflow.yml');
const WORKFLOW_DST = '.github/workflows/pewplay.yml';
const WORK_DIR = path.join(ROOT, '.migration');
const ALWAYS_SKIP = ['pewplay', '.github', 'pewplay-game-template'];
const COMMIT_MESSAGE = 'Adatta il gioco alla nuova struttura PewPlay';

// Correzioni specifiche per i giochi esistenti (testi in italiano, game.json mancante, cartelle inutili).
const OVERRIDES = {
  'angle': {
    description: 'Test your geometry skills: guess how wide the angle on screen is. A quick, free math puzzle you can play in your browser.',
  },
  'color-guess': {
    description: 'Guess the right color: pick the circle that matches the RGB value shown. A free color puzzle game you can play in your browser.',
  },
  '2048-with-ai': {
    create: {
      title: '2048 AI',
      description: 'Watch an AI play 2048: choose its strategy and speed and see how far it can merge the tiles. Free in your browser.',
      category: 'Puzzle',
      tags: ['2048', 'ai', 'numbers', 'puzzle'],
      author: 'PewPlay',
      playMode: 'SinglePlayer',
    },
  },
  'Pac-Man': {
    // Cartelle di documentazione e strumenti di sviluppo: il gioco non le usa (circa 13 MB in meno online)
    exclude: ['doc', 'promo', 'shots', 'mapgen', 'randturn', 'fruit'],
  },
};

const FIELD_ORDER = ['$schema', 'title', 'description', 'about', 'howToPlay', 'controls', 'tips', 'faq', 'category', 'tags', 'author',
  'playMode', 'orientation', 'cover', 'screenshots', 'featured', 'added', 'draft', 'exclude'];
const PLACEHOLDER_AUTHORS = ['', 'your name', 'il tuo nome', 'il tuo nome o studio'];
const PLAY_MODES = ['SinglePlayer', 'MultiPlayer', 'Both'];

const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
const toText = v => (typeof v === 'string' ? v.trim() : isObj(v) ? String(v.en ?? Object.values(v)[0] ?? '').trim() : '');

/** Porta un game.json (anche vecchio o assente) al formato attuale. Ritorna { json, changes }. */
function migrateGameJson(raw, slug, org) {
  const changes = [];
  const override = OVERRIDES[slug] || {};
  let src = isObj(raw) ? { ...raw } : null;
  if (!src) {
    src = { ...(override.create || { title: slug }) };
    changes.push('creato game.json');
  }
  const out = { $schema: SCHEMA_URL(org) };
  if (raw && raw.$schema !== out.$schema) changes.push('aggiornato $schema');

  for (const key of ['title', 'description', 'howToPlay']) {
    if (src[key] === undefined) continue;
    const text = toText(src[key]);
    if (isObj(src[key])) changes.push(`"${key}": tenuto solo il testo inglese`);
    if (text) out[key] = text;
  }
  if (Array.isArray(src.controls)) {
    out.controls = src.controls.filter(c => isObj(c) && c.input).map(c => ({ input: String(c.input), action: toText(c.action) }));
    if (src.controls.some(c => isObj(c) && isObj(c.action))) changes.push('"controls": tenuto solo il testo inglese');
  }
  if (typeof src.category === 'string' && src.category) out.category = src.category;

  const tags = [...(Array.isArray(src.tags) ? src.tags : []), ...(Array.isArray(src.keywords) ? src.keywords : [])].map(String);
  if (Array.isArray(src.keywords)) changes.push('"keywords" → "tags"');
  if (tags.length) out.tags = [...new Set(tags)];

  if (typeof src.author === 'string') {
    if (PLACEHOLDER_AUTHORS.includes(src.author.trim().toLowerCase())) changes.push(`rimosso autore segnaposto "${src.author}"`);
    else out.author = src.author.trim();
  }
  if (src.playMode !== undefined) {
    if (PLAY_MODES.includes(src.playMode)) out.playMode = src.playMode;
    else changes.push(`rimosso "playMode" non valido (${src.playMode})`);
  }
  for (const key of ['about', 'tips', 'faq', 'orientation', 'cover', 'screenshots', 'featured', 'added', 'draft', 'exclude']) {
    if (src[key] !== undefined) out[key] = src[key];
  }

  // Correzioni specifiche
  if (override.description && out.description !== override.description) {
    out.description = override.description;
    changes.push('descrizione in inglese');
  }
  if (override.exclude) {
    const merged = [...new Set([...(out.exclude || []), ...override.exclude])];
    if (merged.length !== (out.exclude || []).length) {
      out.exclude = merged;
      changes.push(`"exclude": ${override.exclude.join(', ')}`);
    }
  }

  const known = new Set([...FIELD_ORDER, 'keywords', 'lang']);
  const dropped = Object.keys(src).filter(k => !known.has(k));
  if (dropped.length) changes.push(`rimossi campi sconosciuti: ${dropped.join(', ')}`);
  if (src.lang !== undefined) changes.push('rimosso "lang"');

  const ordered = {};
  for (const key of FIELD_ORDER) if (out[key] !== undefined) ordered[key] = out[key];
  return { json: ordered, changes };
}

async function listRepos(org) {
  const repos = [];
  for (let page = 1; ; page++) {
    const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'pewplay-tools' };
    if (process.env.GH_TOKEN) headers.Authorization = `Bearer ${process.env.GH_TOKEN}`;
    const res = await fetch(`https://api.github.com/orgs/${org}/repos?per_page=100&page=${page}`, { headers });
    if (!res.ok) throw new BuildError(`GitHub ha risposto ${res.status} leggendo i repo di "${org}".`, ['Se è il limite di richieste, imposta GH_TOKEN nel file .env e riprova.']);
    const batch = await res.json();
    repos.push(...batch);
    if (batch.length < 100) return repos;
  }
}

const git = (dir, ...args) => run('git', ['-C', dir, ...args]);

async function prepareRepo(repo, { org, apply, workflow }) {
  const dir = path.join(WORK_DIR, repo.name);
  const r = { name: repo.name, status: '', changes: [], problems: [] };

  // Clone pulito (o aggiornamento se già presente)
  if (fs.existsSync(path.join(dir, '.git'))) {
    await git(dir, 'fetch', '--quiet', '--prune', 'origin');
  } else {
    fs.rmSync(dir, { recursive: true, force: true });
    await run('git', ['clone', '--quiet', repo.clone_url, dir]);
  }
  const remoteBranches = (await git(dir, 'branch', '-r', '--format=%(refname:short)')).split('\n').map(s => s.trim());
  const hasPreview = remoteBranches.includes('origin/preview');
  const base = hasPreview ? 'origin/preview' : `origin/${repo.default_branch}`;
  await git(dir, 'checkout', '--quiet', '-B', 'preview', base);
  await git(dir, 'reset', '--quiet', '--hard', base);
  await git(dir, 'clean', '-fdq');
  r.base = hasPreview ? 'preview esistente' : `nuovo da ${repo.default_branch}`;

  const hasGameJson = fs.existsSync(path.join(dir, 'game.json'));
  const hasIndex = fs.existsSync(path.join(dir, 'index.html'));
  if (!hasGameJson && !hasIndex && !OVERRIDES[repo.name]?.create) {
    r.status = 'IGNORATO';
    r.changes.push('non è un gioco (niente game.json né index.html)');
    return r;
  }

  // 1. Workflow
  const wfPath = path.join(dir, WORKFLOW_DST);
  const wfExisted = fs.existsSync(wfPath);
  if (!wfExisted || fs.readFileSync(wfPath, 'utf8') !== workflow) {
    fs.mkdirSync(path.dirname(wfPath), { recursive: true });
    fs.writeFileSync(wfPath, workflow);
    r.changes.push(wfExisted ? 'workflow PewPlay aggiornato' : 'workflow PewPlay aggiunto');
  }

  // 2. game.json
  const { raw, parseError } = readGameJson(dir);
  if (parseError) {
    r.problems.push(`game.json non è JSON valido (${parseError}): va corretto a mano`);
  } else {
    const { json, changes } = migrateGameJson(raw, repo.name, org);
    const text = `${JSON.stringify(json, null, 2)}\n`;
    const before = hasGameJson ? fs.readFileSync(path.join(dir, 'game.json'), 'utf8') : '';
    if (text !== before) {
      fs.writeFileSync(path.join(dir, 'game.json'), text);
      r.changes.push(...(changes.length ? changes : ['game.json riformattato']));
    }
    // 3. Controllo con le regole della build
    const { errors, warnings } = validateGameJson(json);
    r.problems.push(...errors.map(e => `errore: ${e}`));
    r.warnings = warnings;
  }
  if (!hasIndex) r.problems.push('errore: manca index.html nella root');

  // 4. Commit / push
  const dirty = (await git(dir, 'status', '--porcelain')).trim();
  if (!dirty) {
    r.status = 'GIÀ OK';
    return r;
  }
  await git(dir, 'add', '-A');
  try {
    await git(dir, 'commit', '--quiet', '-m', COMMIT_MESSAGE);
  } catch (e) {
    throw new BuildError(`Commit non riuscito in ${repo.name}: ${e.message.split('\n')[0]}`, [
      'Configura il tuo nome ed email in git:',
      '  git config --global user.name "Il tuo nome"',
      '  git config --global user.email "tu@example.com"',
    ]);
  }
  if (!apply) {
    r.status = 'PRONTO';
    return r;
  }
  try {
    await git(dir, 'push', '--quiet', '-u', 'origin', 'preview');
    r.status = 'PUBBLICATO';
  } catch (e) {
    const msg = e.message;
    r.status = 'PUSH FALLITO';
    if (/workflow/i.test(msg)) r.problems.push('push rifiutato: le tue credenziali git non hanno il permesso "workflow" (con GitHub CLI: gh auth refresh -s workflow, poi rilancia)');
    else if (/403|denied|permission/i.test(msg)) r.problems.push('push rifiutato: il tuo utente non ha permesso di scrittura su questo repo');
    else r.problems.push(`push non riuscito: ${msg.split('\n').filter(Boolean).pop()}`);
  }
  return r;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const apply = !!args.apply;
  const only = args.only ? String(args.only).split(',').map(s => s.trim()) : null;
  const opt = await loadOptions([]);
  const org = opt.org;
  const workflow = fs.readFileSync(WORKFLOW_SRC, 'utf8');

  try {
    await run('git', ['--version']);
  } catch {
    throw new BuildError('git non è installato o non è nel PATH.');
  }

  console.log(`\nPreparazione branch preview dei giochi di "${org}" ${apply ? '(con push)' : '(prova: nessun push)'}`);
  console.log(`Cartella di lavoro: ${path.relative(process.cwd(), WORK_DIR) || WORK_DIR}\n`);
  fs.mkdirSync(WORK_DIR, { recursive: true });

  const repos = (await listRepos(org))
    .filter(r => !r.archived && !r.is_template && !ALWAYS_SKIP.includes(r.name))
    .filter(r => !only || only.includes(r.name))
    .sort((a, b) => a.name.localeCompare(b.name));

  const results = [];
  for (const repo of repos) {
    process.stdout.write(`  ${repo.name} … `);
    try {
      const r = await prepareRepo(repo, { org, apply, workflow });
      results.push(r);
      console.log(r.status);
    } catch (e) {
      if (e instanceof BuildError) throw e;
      results.push({ name: repo.name, status: 'ERRORE', changes: [], problems: [e.message.split('\n').filter(Boolean).pop()] });
      console.log('ERRORE');
    }
  }

  console.log('\nRiepilogo\n');
  for (const r of results) {
    console.log(`  ${r.status.padEnd(12)} ${r.name}${r.base ? `  (${r.base})` : ''}`);
    for (const c of r.changes) console.log(`               - ${c}`);
    for (const w of r.warnings || []) console.log(`               avviso: ${w}`);
    for (const p of r.problems) console.log(`               ${p}`);
  }
  const count = s => results.filter(r => r.status === s).length;
  console.log(`\n${results.length} repo · ${count('PUBBLICATO')} pubblicati · ${count('PRONTO')} pronti · ${count('GIÀ OK')} già a posto · ${count('IGNORATO')} ignorati · ${count('PUSH FALLITO') + count('ERRORE')} con errori`);
  if (!apply && count('PRONTO')) {
    console.log('\nEra una prova: niente è stato pubblicato. Controlla le modifiche in .migration/<repo> (git show) e poi rilancia con --apply.\n');
  } else if (apply) {
    console.log('\nFatto. Ogni push su preview aggiorna il sito di anteprima. Quando un gioco va bene, fai il merge di preview in main nel suo repo.\n');
  }
  if (count('PUSH FALLITO') + count('ERRORE')) process.exitCode = 1;
}

main().catch(e => process.exit(printFatal(e)));
