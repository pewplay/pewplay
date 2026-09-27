#!/usr/bin/env node
// ============================================================
//  PEWPLAY — BUILD DEL SITO
//
//  npm run build                    → sito pubblico (branch main dei giochi)
//  npm run build:preview            → sito di anteprima (solo branch preview dei giochi + bozze)
//  npm run build -- --games ../     → usa cartelle locali invece di GitHub
//
//  Passi:
//   1. trova i giochi (GitHub o cartella locale)
//   2. controlla e prepara ogni gioco (game.json, file, immagini)
//   3. genera le pagine (home, giochi, privacy, 404)
//   4. genera sitemap, robots, manifest, _headers
//   5. riepilogo (console + GitHub Actions)
//
//  Come vengono gestiti i problemi:
//   - Nessun gioco, gioco in bozza, repo senza branch preview
//       → normale: AVVISO, il sito viene generato comunque.
//   - Un gioco con un problema suo (game.json non valido, manca index.html, file > 25 MB…)
//       → quel gioco viene SALTATO con un AVVISO; gli altri vengono pubblicati.
//   - Problemi di infrastruttura (GitHub non raggiungibile, token non valido, download
//     fallito sul sito pubblico, configurazione sbagliata, limiti di Cloudflare superati)
//       → ERRORE: la build si ferma e online resta la versione precedente.
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import { loadOptions, ROOT } from './config.js';
import { localGames, githubGames } from './sources.js';
import { readGameJson, validateGameJson, normalizeGame, DEFAULT_EXCLUDE } from './game-config.js';
import { buildGameImages } from './images.js';
import { renderHome } from './render/home.js';
import { renderGame } from './render/game.js';
import { renderPrivacy, renderNotFound } from './render/privacy.js';
import * as files from './static-files.js';
import { BuildError, info, warn, collectedWarnings, printFatal, summary } from './report.js';
import { copyFiltered, makeMatcher, writeFile, formatBytes, shortHash, stableRandom, mapLimit, walkFiles, run } from './util.js';

const PAGES_MAX_FILES = 20000;             // limite Cloudflare Pages (piano gratuito)
const PAGES_MAX_FILE_SIZE = 25 * 1024 * 1024;
const RESERVED_SLUGS = new Set(['assets', 'privacy-policy', 'play', '404.html']);

/** Problema di un singolo gioco: il gioco viene saltato, la build continua. */
class GameProblem extends Error {}

async function main() {
  const started = Date.now();
  const opt = await loadOptions();
  const { config } = opt;
  const site = {
    config,
    target: opt.target,
    isPreview: opt.isPreview,
    baseUrl: opt.baseUrl.replace(/\/$/, ''),
    buildId: `${new Date().toISOString().replace(/\D/g, '').slice(0, 12)}-${shortHash(String(Math.random()), 4)}`,
    homeOg: { url: '/og-image.png', w: 1200, h: 630, type: 'image/png' },
  };
  const branchLabel = opt.isPreview ? config.github.previewBranch : 'main';

  info(`\n${config.name} · build ${opt.target.toUpperCase()} → ${site.baseUrl}`);

  // ── 1. Trova i giochi ─────────────────────────────────────
  let sources;
  let failures = [];
  let stats = null;
  if (opt.gamesDir) {
    info(`\n[1/5] Giochi dalla cartella locale ${opt.gamesDir}`);
    sources = localGames(opt.gamesDir, { skipRepos: config.github.skipRepos });
  } else {
    info(`\n[1/5] Giochi dall'organizzazione GitHub "${opt.org}" (branch ${branchLabel})${opt.token ? '' : ' — senza token: solo repo pubblici'}`);
    const res = await githubGames({
      org: opt.org,
      token: opt.token,
      target: opt.target,
      previewBranch: config.github.previewBranch,
      skipRepos: config.github.skipRepos,
      cacheDir: opt.cacheDir,
      concurrency: config.build.concurrency,
      log: info,
    });
    ({ games: sources, failures, stats } = res);
    if (stats.notGames.length) info(`   ${stats.notGames.length} repo senza game.json (non sono giochi): ${stats.notGames.join(', ')}`);
    if (opt.isPreview && stats.noBranch.length) info(`   ${stats.noBranch.length} repo senza branch "${branchLabel}" (non compaiono in anteprima)`);
  }

  // Download falliti: sul sito pubblico non si rischia di togliere giochi per un problema temporaneo.
  if (failures.length) {
    const list = failures.map(f => `- ${f.slug}: ${f.message}`);
    if (!opt.isPreview) {
      throw new BuildError(`Non è stato possibile scaricare ${failures.length} gioc${failures.length === 1 ? 'o' : 'hi'} da GitHub:`, [
        ...list,
        'Il sito pubblico NON viene aggiornato, così nessun gioco sparisce per un problema temporaneo.',
        'Di solito basta rilanciare la build (Actions → Deploy → Run workflow).',
      ]);
    }
    for (const f of failures) warn(`${f.slug} non scaricato`, `${f.message}. Non compare in questa anteprima; rilancia la build.`);
  }

  if (opt.only) {
    const missing = opt.only.filter(slug => !sources.some(s => s.slug === slug));
    for (const slug of missing) warn(`--only ${slug}`, 'nessun gioco con questo nome');
    sources = sources.filter(s => opt.only.includes(s.slug));
  }
  info(`   ${sources.length} gioc${sources.length === 1 ? 'o' : 'hi'} da preparare`);

  // ── 2. Prepara ogni gioco ─────────────────────────────────
  info('\n[2/5] Preparazione giochi');
  fs.rmSync(opt.outDir, { recursive: true, force: true });
  fs.mkdirSync(opt.outDir, { recursive: true });

  const report = []; // una riga per gioco nel riepilogo
  const prepared = await mapLimit(sources, 4, async src => {
    const row = { slug: src.slug, ref: src.ref, sha: src.sha, status: 'ok', notes: [] };
    report.push(row);
    try {
      return await prepareGame(src, row, site, opt);
    } catch (e) {
      fs.rmSync(path.join(opt.outDir, src.slug), { recursive: true, force: true });
      if (!(e instanceof GameProblem)) {
        // Errore inatteso su un gioco (es. immagine corrotta): lo trattiamo come problema del gioco,
        // ma con il dettaglio tecnico, così non blocca tutti gli altri.
        e = new GameProblem(`errore durante la preparazione: ${e.message}`);
      }
      row.status = 'skipped';
      row.notes.unshift(e.message);
      return null;
    }
  });

  // Ordine: in evidenza → più recenti (added) → alfabetico
  const games = prepared.filter(Boolean).sort((a, b) =>
    (b.featured - a.featured)
    || (b.added || '').localeCompare(a.added || '')
    || a.title.localeCompare(b.title));

  for (const r of report.filter(x => x.status === 'skipped')) {
    warn(`${r.slug} non pubblicato`, `${r.notes[0]}. Correggi il repo del gioco: gli altri giochi vengono pubblicati normalmente.`);
  }
  if (!games.length) {
    let why;
    if (sources.length) why = 'tutti i giochi trovati sono in bozza o sono stati saltati';
    else if (failures.length) why = 'nessun gioco è stato scaricato correttamente';
    else if (opt.only) why = `nessun gioco corrisponde a --only ${opt.only.join(',')}`;
    else if (opt.gamesDir) why = `nessuna cartella con game.json in ${opt.gamesDir}`;
    else if (opt.isPreview) why = `nessun repo ha il branch "${branchLabel}" con un game.json`;
    else why = 'nessun repo dell\'organizzazione ha un game.json sul branch main';
    warn('Nessun gioco da pubblicare', `${why}. Il sito viene generato comunque, con la home vuota.`);
  }

  // ── 3. Pagine ─────────────────────────────────────────────
  info('\n[3/5] Pagine');
  // CSS/JS con hash nel nome → cache "per sempre" nel browser
  for (const [kind, file] of [['css', 'site.css'], ['js', 'site.js']]) {
    const content = fs.readFileSync(path.join(ROOT, 'src/assets', file), 'utf8');
    const name = `/assets/site.${shortHash(content)}.${kind}`;
    writeFile(path.join(opt.outDir, name), content);
    (site.assets ||= {})[kind] = name;
  }
  const publicDir = path.join(ROOT, 'public');
  if (fs.existsSync(publicDir)) {
    for (const f of fs.readdirSync(publicDir)) fs.cpSync(path.join(publicDir, f), path.join(opt.outDir, f), { recursive: true });
  }
  for (const needed of ['favicon.ico', 'favicon-32x32.png', 'og-image.png']) {
    if (!fs.existsSync(path.join(opt.outDir, needed))) warn(`public/${needed} mancante`, 'il sito funziona, ma l\'icona o l\'immagine social non verrà mostrata');
  }

  writeFile(path.join(opt.outDir, 'index.html'), renderHome(site, games));
  writeFile(path.join(opt.outDir, 'privacy-policy', 'index.html'), renderPrivacy(site));
  for (const game of games) {
    writeFile(path.join(opt.outDir, game.slug, 'index.html'), renderGame(site, game, relatedFor(game, games, config.build.relatedGames)));
  }
  writeFile(path.join(opt.outDir, '404.html'), renderNotFound(site));
  info(`   home, privacy, 404 + ${games.length} pagin${games.length === 1 ? 'a' : 'e'} gioco`);

  // ── 4. File di servizio ──────────────────────────────────
  info('\n[4/5] Sitemap, robots, manifest, header Cloudflare');
  writeFile(path.join(opt.outDir, 'robots.txt'), files.robotsTxt(site));
  writeFile(path.join(opt.outDir, 'manifest.json'), files.manifestJson(site));
  writeFile(path.join(opt.outDir, '_headers'), files.headersFile(site));
  if (!site.isPreview) {
    writeFile(path.join(opt.outDir, 'sitemap.xml'), files.sitemapXml(site, games));
    writeFile(path.join(opt.outDir, 'service-worker.js'), files.serviceWorkerRemovalJs());
    const ads = files.adsTxt(site);
    if (ads) writeFile(path.join(opt.outDir, 'ads.txt'), ads);
  }
  // build-info.json: cosa c'è online. "fingerprint" riassume tutto ciò che cambia il sito
  // (commit del codice del sito + commit di ogni gioco + badge): deploy.js lo usa per
  // non ripubblicare un sito identico a quello già online.
  const siteSha = await run('git', ['rev-parse', 'HEAD'], { cwd: ROOT }).then(s => s.trim()).catch(() => null);
  const gamesInfo = games.map(g => ({ slug: g.slug, ref: g.ref, sha: g.sha, draft: g.draft, isNew: g.isNew }));
  writeFile(path.join(opt.outDir, 'build-info.json'), JSON.stringify({
    target: site.target,
    siteSha,
    fingerprint: siteSha && !opt.gamesDir ? shortHash(JSON.stringify({ target: site.target, siteSha, gamesInfo }), 16) : null,
    buildId: site.buildId,
    builtAt: new Date().toISOString(),
    games: gamesInfo,
  }, null, 2));

  const totalFiles = walkFiles(opt.outDir).length;
  if (totalFiles > PAGES_MAX_FILES) {
    const biggest = report.filter(r => r.files).sort((a, b) => b.files - a.files).slice(0, 3).map(r => `- ${r.slug}: ${r.files} file`);
    throw new BuildError(`Il sito ha ${totalFiles} file: Cloudflare Pages ne accetta al massimo ${PAGES_MAX_FILES}.`, [
      'I giochi con più file:', ...biggest, 'Usa "exclude" nei loro game.json per non pubblicare i file che non servono.',
    ]);
  }

  // ── 5. Riepilogo ─────────────────────────────────────────
  printReport(report);
  const warnings = collectedWarnings();
  const drafts = report.filter(r => r.status === 'draft').length;
  const skipped = report.filter(r => r.status === 'skipped').length;
  info(`\nBuild completata${warnings.length ? ` con ${warnings.length} avvis${warnings.length === 1 ? 'o' : 'i'}` : ''}: `
    + `${games.length} gioc${games.length === 1 ? 'o pubblicato' : 'hi pubblicati'}`
    + `${drafts ? `, ${drafts} in bozza` : ''}${skipped ? `, ${skipped} saltati` : ''}`
    + ` · ${totalFiles} file · ${((Date.now() - started) / 1000).toFixed(1)}s → ${path.relative(process.cwd(), opt.outDir) || '.'}/\n`);
  writeGithubSummary(site, report, { games, drafts, skipped, totalFiles, warnings });
}

/** Controlla, copia e prepara un gioco. Lancia GameProblem se il gioco non è pubblicabile. */
async function prepareGame(src, row, site, opt) {
  if (RESERVED_SLUGS.has(src.slug)) throw new GameProblem(`il nome "${src.slug}" è riservato dal sito: rinomina il repo`);
  const { raw, parseError } = readGameJson(src.dir);
  if (parseError) throw new GameProblem(`game.json non è JSON valido (${parseError})`);
  if (!raw) throw new GameProblem('manca game.json nella root del repo');
  const { errors, warnings } = validateGameJson(raw);
  row.notes.push(...warnings);
  if (errors.length) throw new GameProblem(`game.json: ${errors.join('; ')}`);
  if (!fs.existsSync(path.join(src.dir, 'index.html'))) throw new GameProblem('manca index.html nella root del repo');

  const data = normalizeGame(raw, { slug: src.slug, repoDescription: src.repoDescription });
  if (data.draft && !site.isPreview) {
    row.status = 'draft';
    row.notes.unshift('"draft": true, non pubblicato sul sito pubblico');
    return null;
  }

  // File del gioco → dist/<slug>/play/
  const outGame = path.join(opt.outDir, src.slug);
  const isExcluded = makeMatcher([...DEFAULT_EXCLUDE, ...data.exclude]);
  const copied = copyFiltered(src.dir, path.join(outGame, 'play'), isExcluded);
  row.files = copied.files;
  row.size = copied.bytes;
  const tooBig = walkFiles(path.join(outGame, 'play'))
    .filter(rel => fs.statSync(path.join(outGame, 'play', rel)).size > PAGES_MAX_FILE_SIZE);
  if (tooBig.length) {
    throw new GameProblem(`${tooBig.join(', ')} supera${tooBig.length > 1 ? 'no' : ''} 25 MB (limite Cloudflare Pages): riducilo o aggiungilo a "exclude"`);
  }

  // Immagini: un file mancante o corrotto non blocca il gioco (si usa un'alternativa, con avviso)
  const img = await buildGameImages({ srcDir: src.dir, outDir: outGame, title: data.title, siteName: site.config.name, accent: site.config.themeColor });
  row.notes.push(...img.notes);

  const addedMs = data.added ? Date.parse(data.added) : 0;
  return {
    ...data,
    ref: src.ref,
    sha: src.sha,
    updatedAt: src.updatedAt,
    isNew: addedMs > 0 && Date.now() - addedMs < site.config.build.newGameDays * 86400000,
    images: { preview: `/${src.slug}/preview.webp`, og: `/${src.slug}/og.jpg` },
  };
}

/** Giochi correlati: prima la stessa categoria, poi gli altri. Ordine stabile tra una build e l'altra. */
function relatedFor(game, games, count) {
  const others = games.filter(g => g.slug !== game.slug);
  const score = g => (g.category === game.category ? 0 : 1) + stableRandom(game.slug + g.slug);
  return others.sort((a, b) => score(a) - score(b)).slice(0, count);
}

const STATUS = { ok: 'OK', draft: 'BOZZA', skipped: 'SALTATO' };

function printReport(report) {
  info('\n[5/5] Riepilogo giochi');
  if (!report.length) info('   (nessun gioco)');
  for (const r of report.sort((a, b) => a.slug.localeCompare(b.slug))) {
    const ref = r.sha && r.sha !== 'local' ? ` (${r.ref}@${r.sha.slice(0, 7)})` : '';
    const size = r.size && r.status === 'ok' ? ` · ${r.files} file, ${formatBytes(r.size)}` : '';
    info(`   ${STATUS[r.status].padEnd(7)} ${r.slug}${ref}${size}`);
    r.notes.forEach((n, i) => info(`           ${i === 0 && r.status !== 'ok' ? 'motivo:' : 'avviso:'} ${n}`));
  }
}

function writeGithubSummary(site, report, { games, drafts, skipped, totalFiles, warnings }) {
  const rows = report.map(r => `| ${STATUS[r.status]} | \`${r.slug}\` | ${r.ref || ''} ${r.sha ? '`' + r.sha.slice(0, 7) + '`' : ''} | ${r.size && r.status === 'ok' ? formatBytes(r.size) : ''} | ${r.notes.join('<br>')} |`);
  summary([
    `### ${site.config.name} — ${site.target} (${site.baseUrl})`,
    '',
    `**${games.length}** gioc${games.length === 1 ? 'o pubblicato' : 'hi pubblicati'}${drafts ? ` · ${drafts} in bozza` : ''}${skipped ? ` · **${skipped} saltati**` : ''} · ${totalFiles} file`,
    '',
    ...(warnings.length ? ['**Avvisi**', '', ...warnings.map(w => `- **${w.title}**: ${w.msg}`), ''] : []),
    ...(report.length
      ? ['| Stato | Gioco | Versione | Peso | Note |', '|---|---|---|---|---|', ...rows]
      : ['Nessun gioco trovato.']),
    '',
  ].join('\n'));
}

main().catch(e => process.exit(printFatal(e)));
