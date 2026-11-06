#!/usr/bin/env node
// Cancella i vecchi deploy da Cloudflare Pages, così la lista non cresce all'infinito.
//   node src/cleanup.js                       → pulisce produzione E anteprima
//   node src/cleanup.js --target production   → solo produzione
//   node src/cleanup.js --target preview      → solo anteprima
//   node src/cleanup.js --dry-run             → mostra solo cosa cancellerebbe
//
// Quanti tenerne: site.config.js → cloudflare.keepDeployments (default 3 + 3).
// Non vengono mai cancellati:
//   - il deploy attualmente online in produzione (www.pewplay.com);
//   - l'ultimo deploy riuscito del branch di anteprima (quello di preview.<progetto>.pages.dev);
//   - i deploy ancora in corso (creati nell'ultima ora e non ancora finiti).
//     Quelli più vecchi rimasti "in corso" o "in attesa" sono bloccati e vengono cancellati.
// Lavora a giri: legge l'elenco, cancella, rilegge… finché non resta niente da cancellare
// (così funziona anche con centinaia di deploy arretrati).
// Servono CLOUDFLARE_API_TOKEN e CLOUDFLARE_ACCOUNT_ID, gli stessi del deploy.
// Nota: cancellare un deploy NON restituisce deploy al limite mensile del piano gratuito.
import { loadOptions, parseArgs } from './config.js';
import { BuildError, info, warn, printFatal, summary } from './report.js';

const DEFAULT_KEEP = { production: 3, preview: 3 };
const MAX_ROUNDS = 20;
const FINAL = ['success', 'failure', 'canceled', 'skipped'];
const IN_PROGRESS_GRACE_MS = 60 * 60 * 1000; // un deploy "in corso" da più di un'ora è bloccato
const sleep = ms => new Promise(res => setTimeout(res, ms));

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const target = args.target && args.target !== true ? String(args.target) : 'all';
  if (!['all', 'production', 'preview'].includes(target)) {
    throw new BuildError(`--target deve essere "production", "preview" o "all" (ricevuto "${target}")`);
  }
  const envs = target === 'all' ? ['production', 'preview'] : [target];
  const opt = await loadOptions(['--target', envs[0]]); // serve solo per leggere site.config.js e .env
  const dryRun = !!args['dry-run'];
  const project = opt.config.cloudflare.pagesProject;
  const previewBranch = opt.config.github.previewBranch;
  const keepCfg = { ...DEFAULT_KEEP, ...(opt.config.cloudflare.keepDeployments || {}) };
  const token = (process.env.CLOUDFLARE_API_TOKEN || '').trim();
  const accountId = (process.env.CLOUDFLARE_ACCOUNT_ID || '').trim();

  if (!token || !accountId) {
    throw new BuildError('Mancano CLOUDFLARE_API_TOKEN e/o CLOUDFLARE_ACCOUNT_ID (vedi README → Configurazione iniziale).');
  }

  // Chiamata all'API con qualche tentativo in caso di limite di richieste (429) o errori temporanei (5xx)
  async function cf(method, apiPath) {
    for (let attempt = 1; ; attempt++) {
      let res;
      try {
        res = await fetch(`https://api.cloudflare.com/client/v4${apiPath}`, {
          method,
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (e) {
        if (attempt < 3) { await sleep(3000 * attempt); continue; }
        throw new BuildError(`Cloudflare non è raggiungibile (${e.cause?.code || e.message}).`, ['Problema di rete temporaneo: la pulizia verrà ritentata alla prossima run.']);
      }
      if ((res.status === 429 || res.status >= 500) && attempt < 4) {
        await sleep((Number(res.headers.get('retry-after')) || 5 * attempt) * 1000);
        continue;
      }
      const json = await res.json().catch(() => ({}));
      return {
        status: res.status,
        ok: res.ok && json.success !== false,
        result: json.result,
        resultInfo: json.result_info,
        errors: (json.errors || []).map(e => `${e.code}: ${e.message}`).join('; '),
      };
    }
  }

  const base = `/accounts/${accountId}/pages/projects/${project}`;

  // ── Progetto: quale deploy è online in produzione ─────────
  const proj = await cf('GET', base);
  if (!proj.ok) {
    if (proj.status === 404) { info(`Progetto "${project}" non trovato su Cloudflare: niente da pulire.`); return; }
    throw new BuildError(`Non riesco a leggere il progetto "${project}" (HTTP ${proj.status}).`, [
      'Controlla token e account con: npm run deploy:check',
      `Dettagli: ${proj.errors}`,
    ]);
  }
  const liveProductionId = proj.result?.canonical_deployment?.id || null;

  // Legge l'elenco dei deploy di un ambiente, pagina per pagina, dal più recente
  async function listDeployments(env) {
    const seen = new Map();
    for (let page = 1; page <= 200; page++) {
      const r = await cf('GET', `${base}/deployments?env=${env}&page=${page}&per_page=25`);
      if (!r.ok) {
        // Alcune pagine oltre la fine danno errore invece di una lista vuota: si tiene quanto letto
        if (seen.size) break;
        throw new BuildError(`Non riesco a leggere l'elenco dei deploy ${env} (HTTP ${r.status}).`, [`Dettagli: ${r.errors}`]);
      }
      const items = r.result || [];
      const before = seen.size;
      for (const d of items) seen.set(d.id, d);
      const totalPages = r.resultInfo?.total_pages;
      if (!items.length || seen.size === before || (totalPages && page >= totalPages)) break;
    }
    return [...seen.values()]
      .filter(d => d.environment === env) // per sicurezza: solo l'ambiente richiesto
      .sort((a, b) => new Date(b.created_on) - new Date(a.created_on));
  }

  const branchOf = d => d.deployment_trigger?.metadata?.branch || '';
  const statusOf = d => d.latest_stage?.status || 'success';
  const inProgress = d => !FINAL.includes(statusOf(d)) && Date.now() - new Date(d.created_on).getTime() < IN_PROGRESS_GRACE_MS;

  for (const env of envs) {
    const keep = Math.max(1, Number.parseInt(keepCfg[env], 10) || DEFAULT_KEEP[env]);
    let deleted = 0;
    let remaining = 0;
    let lastFailures = [];
    const failedIds = new Set();

    info(`\nPulizia deploy ${env} del progetto "${project}" (tengo gli ultimi ${keep})${dryRun ? ' — PROVA: non cancello niente' : ''}`);

    for (let round = 1; round <= MAX_ROUNDS; round++) {
      const deployments = await listDeployments(env);
      const protectedIds = new Set(liveProductionId ? [liveProductionId] : []);
      if (env === 'preview') {
        const livePreview = deployments.find(d => branchOf(d) === previewBranch && statusOf(d) === 'success');
        if (livePreview) protectedIds.add(livePreview.id);
      }
      const keepIds = new Set(deployments.slice(0, keep).map(d => d.id));
      const toDelete = deployments.filter(d =>
        !keepIds.has(d.id) && !protectedIds.has(d.id) && !failedIds.has(d.id) && !inProgress(d));
      remaining = deployments.length;

      if (round === 1) {
        const states = {};
        for (const d of deployments) states[statusOf(d)] = (states[statusOf(d)] || 0) + 1;
        const running = deployments.filter(d => !keepIds.has(d.id) && !protectedIds.has(d.id) && inProgress(d)).length;
        info(`   ..  trovati ${deployments.length} deploy (stati: ${Object.entries(states).map(([k, v]) => `${k} ${v}`).join(', ')})`);
        info(`   ..  tengo: ${keepIds.size} più recenti, ${[...protectedIds].filter(id => !keepIds.has(id) && deployments.some(d => d.id === id)).length} online, ${running} in corso; da cancellare ${toDelete.length}`);
      }
      if (!toDelete.length) break;

      if (dryRun) {
        for (const d of toDelete) info(`   -  ${d.short_id || d.id}  ${d.created_on}  ${branchOf(d)}`);
        info(`   ..  ne cancellerei ${toDelete.length} (letti in un solo giro: con molti deploy potrebbero essere di più)`);
        break;
      }

      let deletedThisRound = 0;
      lastFailures = [];
      for (const d of toDelete) {
        // force=true serve per i deploy che hanno ancora un alias (es. vecchi branch)
        const r = await cf('DELETE', `${base}/deployments/${d.id}?force=true`);
        if (r.ok) { deleted++; deletedThisRound++; }
        else { failedIds.add(d.id); lastFailures.push(`${d.short_id || d.id} (HTTP ${r.status}${r.errors ? `: ${r.errors}` : ''})`); }
        if (deleted && deleted % 50 === 0 && r.ok) info(`   ..  ${deleted} cancellati finora`);
      }
      remaining -= deletedThisRound;
      if (!deletedThisRound) break; // tutti rifiutati: inutile insistere
    }

    if (dryRun) continue;
    info(`   OK  cancellati ${deleted} vecchi deploy ${env}, ne restano ${remaining}`);
    if (failedIds.size) {
      warn(`Alcuni vecchi deploy ${env} non sono stati cancellati`, `${failedIds.size}: ${lastFailures.slice(0, 5).join(', ')}${failedIds.size > 5 ? '…' : ''} (verranno ritentati alla prossima run)`);
    }
    summary(`\n**Pulizia deploy ${env}**: cancellati ${deleted} vecchi deploy, ne restano ${remaining} (limite ${keep})${failedIds.size ? `, ${failedIds.size} non cancellati` : ''}.\n`);
  }
}

main().catch(e => process.exit(printFatal(e)));
