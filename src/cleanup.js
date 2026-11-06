#!/usr/bin/env node
// Cancella i vecchi deploy da Cloudflare Pages, così la lista non cresce all'infinito.
//   node src/cleanup.js --target production   → tiene gli ultimi N deploy di produzione
//   node src/cleanup.js --target preview      → tiene gli ultimi N deploy di anteprima
//   node src/cleanup.js --target … --dry-run  → mostra solo cosa cancellerebbe
//
// Quanti tenerne: site.config.js → cloudflare.keepDeployments (default 3 + 3).
// Non vengono mai cancellati:
//   - il deploy attualmente online in produzione (www.pewplay.com);
//   - l'ultimo deploy riuscito del branch di anteprima (quello di preview.<progetto>.pages.dev);
//   - i deploy ancora in corso.
// Servono CLOUDFLARE_API_TOKEN e CLOUDFLARE_ACCOUNT_ID, gli stessi del deploy.
// Nota: cancellare un deploy NON restituisce deploy al limite mensile del piano gratuito.
import { loadOptions, parseArgs } from './config.js';
import { BuildError, info, warn, printFatal, summary } from './report.js';

const DEFAULT_KEEP = { production: 3, preview: 3 };
const sleep = ms => new Promise(res => setTimeout(res, ms));

async function main() {
  const opt = await loadOptions();
  const args = parseArgs(process.argv.slice(2));
  const dryRun = !!args['dry-run'];
  const env = opt.target; // "production" | "preview": coincide con l'ambiente di Cloudflare
  const project = opt.config.cloudflare.pagesProject;
  const previewBranch = opt.config.github.previewBranch;
  const keepCfg = { ...DEFAULT_KEEP, ...(opt.config.cloudflare.keepDeployments || {}) };
  const keep = Math.max(1, Number.parseInt(keepCfg[env], 10) || DEFAULT_KEEP[env]);
  const token = (process.env.CLOUDFLARE_API_TOKEN || '').trim();
  const accountId = (process.env.CLOUDFLARE_ACCOUNT_ID || '').trim();

  if (!token || !accountId) {
    throw new BuildError('Mancano CLOUDFLARE_API_TOKEN e/o CLOUDFLARE_ACCOUNT_ID (vedi README → Configurazione iniziale).');
  }

  // Chiamata all'API con un paio di tentativi in caso di limite di richieste (429) o errori temporanei (5xx)
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
        throw new BuildError(`Cloudflare non è raggiungibile (${e.cause?.code || e.message}).`, ['Problema di rete temporaneo: la pulizia verrà ritentata al prossimo deploy.']);
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

  // ── 1. Progetto: quale deploy è online in produzione ──────
  const proj = await cf('GET', base);
  if (!proj.ok) {
    if (proj.status === 404) { info(`Progetto "${project}" non trovato su Cloudflare: niente da pulire.`); return; }
    throw new BuildError(`Non riesco a leggere il progetto "${project}" (HTTP ${proj.status}).`, [
      'Controlla token e account con: npm run deploy:check',
      `Dettagli: ${proj.errors}`,
    ]);
  }
  const liveProductionId = proj.result?.canonical_deployment?.id || null;

  // ── 2. Tutti i deploy dell'ambiente ───────────────────────
  const all = [];
  for (let page = 1; page <= 1000; page++) {
    const r = await cf('GET', `${base}/deployments?env=${env}&page=${page}&per_page=25`);
    if (!r.ok) throw new BuildError(`Non riesco a leggere l'elenco dei deploy (HTTP ${r.status}).`, [`Dettagli: ${r.errors}`]);
    const items = r.result || [];
    all.push(...items);
    const totalPages = r.resultInfo?.total_pages;
    if (!items.length || (totalPages && page >= totalPages)) break;
  }
  // Per sicurezza filtra anche qui: tiene solo l'ambiente richiesto
  const deployments = all
    .filter(d => d.environment === env)
    .sort((a, b) => new Date(b.created_on) - new Date(a.created_on)); // dal più recente

  // ── 3. Cosa tenere ────────────────────────────────────────
  const branchOf = d => d.deployment_trigger?.metadata?.branch || '';
  const statusOf = d => d.latest_stage?.status || '';
  const protectedIds = new Set();
  if (liveProductionId) protectedIds.add(liveProductionId);
  if (env === 'preview') {
    const livePreview = deployments.find(d => branchOf(d) === previewBranch && statusOf(d) === 'success');
    if (livePreview) protectedIds.add(livePreview.id);
  }

  const keepIds = new Set(deployments.slice(0, keep).map(d => d.id));
  const toDelete = deployments.filter(d =>
    !keepIds.has(d.id) &&
    !protectedIds.has(d.id) &&
    ['success', 'failure', 'canceled', 'skipped'].includes(statusOf(d) || 'success'), // mai quelli in corso
  );

  info(`\nPulizia deploy ${env} del progetto "${project}": ${deployments.length} trovati, ne tengo ${deployments.length - toDelete.length}, da cancellare ${toDelete.length}${dryRun ? ' (prova: non cancello niente)' : ''}`);
  if (!toDelete.length) {
    summary(`\n**Pulizia deploy ${env}**: niente da cancellare (${deployments.length} deploy, limite ${keep}).\n`);
    return;
  }
  if (dryRun) {
    for (const d of toDelete) info(`   -  ${d.short_id || d.id}  ${d.created_on}  ${branchOf(d)}`);
    return;
  }

  // ── 4. Cancellazione ──────────────────────────────────────
  // force=true serve per i deploy che hanno ancora un alias (es. vecchi branch).
  let deleted = 0;
  const failed = [];
  for (const d of toDelete) {
    const r = await cf('DELETE', `${base}/deployments/${d.id}?force=true`);
    if (r.ok) deleted++;
    else failed.push(`${d.short_id || d.id} (HTTP ${r.status}${r.errors ? `: ${r.errors}` : ''})`);
    if (deleted && deleted % 50 === 0) info(`   ..  ${deleted}/${toDelete.length} cancellati`);
  }

  info(`   OK  cancellati ${deleted} vecchi deploy ${env}`);
  if (failed.length) {
    warn('Alcuni vecchi deploy non sono stati cancellati', `${failed.length}: ${failed.slice(0, 5).join(', ')}${failed.length > 5 ? '…' : ''} (verranno ritentati al prossimo deploy)`);
  }
  summary(`\n**Pulizia deploy ${env}**: cancellati ${deleted} vecchi deploy, tenuti gli ultimi ${keep}${failed.length ? ` (${failed.length} non cancellati)` : ''}.\n`);
}

main().catch(e => process.exit(printFatal(e)));
