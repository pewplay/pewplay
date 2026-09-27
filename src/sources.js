// Da dove arrivano i giochi:
//   - GitHub: tutti i repo dell'organizzazione che contengono game.json nella root
//   - Cartella locale (--games ../): ogni sottocartella con game.json
//
// Ogni gioco viene restituito come { slug, dir, ref, sha, updatedAt, repoDescription, source }
// dove `dir` è una cartella locale con i file del gioco (in cache per GitHub).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { run, mapLimit, readJsonSafe } from './util.js';
import { BuildError } from './report.js';

// ── LOCALE ─────────────────────────────────────────────────
export function localGames(gamesDir, { skipRepos = [] } = {}) {
  const root = path.resolve(gamesDir);
  const games = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || skipRepos.includes(entry.name)) continue;
    const dir = path.join(root, entry.name);
    let isDir = false;
    try { isDir = fs.statSync(dir).isDirectory(); } catch { /* link rotto: ignorato */ }
    if (!isDir) continue; // segue anche i link simbolici
    const marker = 'game.json';
    if (!fs.existsSync(path.join(dir, marker))) continue;
    if (entry.name.endsWith('-game-template')) continue; // il template non è un gioco
    games.push({
      slug: entry.name,
      dir,
      ref: 'local',
      sha: 'local',
      updatedAt: fs.statSync(path.join(dir, marker)).mtime.toISOString(),
      repoDescription: '',
      source: 'local',
    });
  }
  return games.sort((a, b) => a.slug.localeCompare(b.slug));
}

// ── GITHUB ─────────────────────────────────────────────────
// git viene eseguito FUORI da qualsiasi repository (cartella temporanea del sistema):
// così non eredita credenziali salvate altrove (es. quelle di actions/checkout),
// che insieme alle nostre produrrebbero l'errore "Duplicate header: Authorization".
const GIT_CWD = os.tmpdir();

function gitAuthEnv(token) {
  const env = { ...process.env, GIT_TERMINAL_PROMPT: '0' };
  if (!token) return env;
  // Il token passa come header HTTP via variabili d'ambiente: mai nell'URL o nei log.
  const basic = Buffer.from(`x-access-token:${token}`).toString('base64');
  return { ...env, GIT_CONFIG_COUNT: '1', GIT_CONFIG_KEY_0: 'http.https://github.com/.extraHeader', GIT_CONFIG_VALUE_0: `Authorization: Basic ${basic}` };
}

async function listOrgRepos(org, token) {
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'pewplay-build',
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const repos = [];
  for (let page = 1; ; page++) {
    let res;
    try {
      res = await fetch(`https://api.github.com/orgs/${encodeURIComponent(org)}/repos?per_page=100&type=all&page=${page}`, { headers });
    } catch (e) {
      throw new BuildError(`GitHub non è raggiungibile (${e.cause?.code || e.message}).`, ['Probabile problema di rete temporaneo: rilancia la build tra qualche minuto.']);
    }
    if (res.status === 401) {
      throw new BuildError('Il token GitHub non è valido o è scaduto.', ['Su GitHub Actions: controlla il secret GH_READ_TOKEN (oppure rimuovilo per usare il token automatico).', 'In locale: controlla GH_TOKEN nel file .env.']);
    }
    if (res.status === 404) {
      throw new BuildError(`L'organizzazione GitHub "${org}" non esiste o non è visibile con questo token.`, ['Controlla "github.org" in site.config.js (su GitHub Actions viene usato il proprietario del repo pewplay).']);
    }
    if (res.status === 403 || res.status === 429) {
      const reset = Number(res.headers.get('x-ratelimit-reset'));
      const when = reset ? ` Si libera alle ${new Date(reset * 1000).toLocaleTimeString('it-IT')}.` : '';
      throw new BuildError(`Limite di richieste all'API GitHub raggiunto.${when}`, [token ? 'Riprova più tardi.' : 'Imposta GH_TOKEN (in .env) per avere un limite molto più alto.']);
    }
    if (!res.ok) throw new BuildError(`GitHub ha risposto con errore ${res.status} leggendo i repo di "${org}".`, ['Riprova tra qualche minuto; se continua controlla https://www.githubstatus.com']);
    const batch = await res.json();
    repos.push(...batch);
    if (batch.length < 100) return repos;
  }
}

/** Ripete un'operazione di rete una volta in caso di errore (problemi temporanei). */
async function withRetry(fn) {
  try {
    return await fn();
  } catch {
    await new Promise(r => setTimeout(r, 2000));
    return fn();
  }
}

/** SHA dei branch richiesti, con una sola chiamata `git ls-remote` (non consuma quota API). */
async function remoteHeads(cloneUrl, branches, env) {
  const out = await run('git', ['ls-remote', '--heads', cloneUrl, ...branches.map(b => `refs/heads/${b}`)], { env, cwd: GIT_CWD });
  const heads = {};
  for (const line of out.trim().split('\n').filter(Boolean)) {
    const [sha, ref] = line.split('\t');
    heads[ref.replace('refs/heads/', '')] = sha;
  }
  return heads;
}

/** Scarica (o riusa dalla cache) il contenuto del repo a un certo commit. */
async function fetchSnapshot({ cloneUrl, slug, ref, sha, cacheDir, env }) {
  const dir = path.join(cacheDir, `${slug}@${sha}`);
  const metaFile = `${dir}.json`;
  if (fs.existsSync(dir) && fs.existsSync(metaFile)) {
    return { dir, ...readJsonSafe(metaFile), cached: true };
  }
  const tmp = `${dir}.tmp-${process.pid}`;
  fs.rmSync(tmp, { recursive: true, force: true });
  await run('git', ['clone', '--depth', '1', '--quiet', '--single-branch', '--branch', ref, cloneUrl, tmp], { env, cwd: GIT_CWD });
  const updatedAt = (await run('git', ['-C', tmp, 'log', '-1', '--format=%cI'], { env })).trim();
  fs.rmSync(path.join(tmp, '.git'), { recursive: true, force: true });
  fs.rmSync(dir, { recursive: true, force: true });
  fs.renameSync(tmp, dir);
  fs.writeFileSync(metaFile, JSON.stringify({ updatedAt }));
  return { dir, updatedAt, cached: false };
}

/** Rimuove dalla cache le versioni non più usate. */
function pruneCache(cacheDir, keep) {
  if (!fs.existsSync(cacheDir)) return;
  const keepSet = new Set(keep);
  for (const name of fs.readdirSync(cacheDir)) {
    const base = name.replace(/\.json$/, '').replace(/\.tmp-\d+$/, '');
    if (!keepSet.has(base)) fs.rmSync(path.join(cacheDir, name), { recursive: true, force: true });
  }
}

/**
 * Trova e scarica i giochi dall'organizzazione GitHub.
 * Ritorna:
 *   games     → giochi scaricati (con game.json)
 *   failures  → repo che NON è stato possibile scaricare (problema di rete/permessi)
 *   stats     → conteggi per il riepilogo (repo senza il branch, repo che non sono giochi)
 * target "production" → branch principale (main); target "preview" → SOLO il branch preview.
 * I repo senza branch preview non compaiono nel sito di anteprima.
 */
export async function githubGames({ org, token, target, previewBranch, skipRepos, cacheDir, concurrency, log }) {
  const env = gitAuthEnv(token);
  const repos = (await listOrgRepos(org, token))
    .filter(r => !r.archived && !r.disabled && !r.is_template && !skipRepos.includes(r.name))
    .sort((a, b) => a.name.localeCompare(b.name));
  fs.mkdirSync(cacheDir, { recursive: true });
  log(`   ${repos.length} repo nell'organizzazione (esclusi template, archiviati e ${skipRepos.join(', ')})`);

  const results = await mapLimit(repos, concurrency, async repo => {
    try {
      const ref = target === 'preview' ? previewBranch : repo.default_branch;
      const heads = await withRetry(() => remoteHeads(repo.clone_url, [ref], env));
      if (!heads[ref]) return { noBranch: repo.name }; // branch non presente (o repo vuoto)
      const snap = await withRetry(() => fetchSnapshot({ cloneUrl: repo.clone_url, slug: repo.name, ref, sha: heads[ref], cacheDir, env }));
      if (!fs.existsSync(path.join(snap.dir, 'game.json'))) return { notAGame: `${repo.name}@${heads[ref]}`, slug: null, name: repo.name };
      return {
        slug: repo.name,
        dir: snap.dir,
        ref,
        sha: heads[ref],
        updatedAt: snap.updatedAt || repo.pushed_at,
        repoDescription: repo.description || '',
        source: 'github',
        cached: snap.cached,
      };
    } catch (e) {
      const msg = e.message.split('\n').filter(Boolean).pop() || e.message;
      return { failure: { slug: repo.name, message: `download non riuscito (${msg})` } };
    }
  });

  const games = results.filter(r => r.slug);
  const failures = results.filter(r => r.failure).map(r => r.failure);
  const stats = {
    repos: repos.length,
    noBranch: results.filter(r => r.noBranch).map(r => r.noBranch),
    notGames: results.filter(r => r.notAGame).map(r => r.name),
  };
  // In cache teniamo anche i repo "non giochi" per non riscaricarli ogni volta.
  // Se qualche download è fallito non tocchiamo la cache: servirà al prossimo tentativo.
  if (!failures.length) pruneCache(cacheDir, [...games.map(g => `${g.slug}@${g.sha}`), ...results.filter(r => r.notAGame).map(r => r.notAGame)]);
  return { games, failures, stats };
}
