#!/usr/bin/env node
// Pubblica la cartella dist/ su Cloudflare Pages con wrangler.
//   node src/deploy.js --target production   → branch "main"    (sito pubblico)
//   node src/deploy.js --target preview      → branch "preview" (sito di anteprima)
//   node src/deploy.js --check               → controlla solo token, account e progetto
//   node src/deploy.js --target … --force    → pubblica anche se il sito online è già identico
// Servono CLOUDFLARE_API_TOKEN e CLOUDFLARE_ACCOUNT_ID (secrets su GitHub, oppure .env in locale).
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { loadOptions, parseArgs } from './config.js';
import { BuildError, info, warn, printFatal, summary } from './report.js';

async function main() {
  const opt = await loadOptions();
  const args = parseArgs(process.argv.slice(2));
  const checkOnly = !!args.check;
  const force = !!args.force;
  const project = opt.config.cloudflare.pagesProject;
  const branch = opt.isPreview ? 'preview' : 'main';
  // I secrets copiati a mano a volte hanno spazi o "a capo" finali
  const token = (process.env.CLOUDFLARE_API_TOKEN || '').trim();
  const accountId = (process.env.CLOUDFLARE_ACCOUNT_ID || '').trim();

  function fail([message, ...hints]) {
    throw new BuildError(message, hints);
  }

  async function cf(method, apiPath, body) {
    let res;
    try {
      res = await fetch(`https://api.cloudflare.com/client/v4${apiPath}`, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (e) {
      fail([`Cloudflare non è raggiungibile (${e.cause?.code || e.message}).`, 'Probabile problema di rete temporaneo: rilancia il deploy tra qualche minuto.']);
    }
    const json = await res.json().catch(() => ({}));
    return { status: res.status, ok: res.ok && json.success !== false, errors: (json.errors || []).map(e => `${e.code}: ${e.message}`).join('; ') };
  }

  // ── 1. Controlli preliminari con messaggi chiari ──────────
  if (!token || !accountId) fail(['Mancano CLOUDFLARE_API_TOKEN e/o CLOUDFLARE_ACCOUNT_ID (vedi README → Configurazione iniziale).']);
  if (!/^[0-9a-f]{32}$/.test(accountId)) {
    fail([
      'CLOUDFLARE_ACCOUNT_ID non ha il formato giusto (32 caratteri esadecimali).',
      'Prendilo da: dashboard Cloudflare → Workers & Pages → colonna a destra "Account ID".',
      'Attenzione a non usare lo "Zone ID" del dominio: è diverso.',
    ]);
  }

  info('\nControllo credenziali Cloudflare…');
  const userToken = await cf('GET', '/user/tokens/verify');
  const accountToken = userToken.ok ? null : await cf('GET', `/accounts/${accountId}/tokens/verify`);
  if (!userToken.ok && !accountToken.ok) {
    fail([
      'Il token Cloudflare non è valido.',
      'Cause tipiche: token copiato male, token scaduto/revocato, oppure hai messo la "Global API Key" invece di un API Token.',
      'Crea un nuovo token: My Profile → API Tokens → Create Token → Custom token (vedi README).',
      `Dettagli: ${userToken.errors || userToken.status}`,
    ]);
  }
  info('   OK  token valido');

  const list = await cf('GET', `/accounts/${accountId}/pages/projects?per_page=1`);
  if (!list.ok) {
    fail([
      `Il token non può usare Cloudflare Pages sull'account ${accountId.slice(0, 6)}… (HTTP ${list.status}).`,
      'Controlla nel token:',
      '  • Permissions: Account → Cloudflare Pages → Edit',
      '  • Account Resources: Include → il TUO account (o "All accounts")',
      'e che CLOUDFLARE_ACCOUNT_ID sia l\'ID dello stesso account (non lo Zone ID).',
      `Dettagli: ${list.errors}`,
    ]);
  }
  info('   OK  permesso Cloudflare Pages sull\'account');

  // ── 2. Progetto Pages: se non esiste lo crea ──────────────
  const existing = await cf('GET', `/accounts/${accountId}/pages/projects/${project}`);
  if (existing.ok) {
    info(`   OK  progetto "${project}" trovato`);
  } else if (existing.status === 404) {
    info(`   ..  progetto "${project}" non esiste: lo creo`);
    const created = await cf('POST', `/accounts/${accountId}/pages/projects`, { name: project, production_branch: 'main' });
    if (!created.ok) {
      fail([
        `Non riesco a creare il progetto Pages "${project}".`,
        'Se il nome è già usato, cambia cloudflare.pagesProject (e previewUrl) in site.config.js.',
        `Dettagli: ${created.errors}`,
      ]);
    }
    info(`   OK  progetto "${project}" creato (https://${project}.pages.dev)`);
  } else {
    fail([`Errore leggendo il progetto "${project}" (HTTP ${existing.status}): ${existing.errors}`]);
  }
  if (checkOnly) { info('\nCredenziali e progetto a posto.\n'); return; }

  // ── 3. Deploy ─────────────────────────────────────────────
  const infoFile = path.join(opt.outDir, 'build-info.json');
  if (!fs.existsSync(infoFile)) fail([`${path.relative(process.cwd(), opt.outDir) || '.'}/ non contiene una build.`, `Esegui prima: node src/build.js --target ${opt.target}`]);
  let built;
  try {
    built = JSON.parse(fs.readFileSync(infoFile, 'utf8'));
  } catch {
    fail(['build-info.json è danneggiato: rifai la build prima del deploy.']);
  }
  if (built.target !== opt.target) fail([`La build in dist/ è "${built.target}" ma stai pubblicando "${opt.target}".`, `Rifai la build con --target ${opt.target}.`]);
  if (!built.games || !built.games.length) {
    warn('Sito senza giochi', `il sito ${opt.target} viene pubblicato con la home vuota ("No games yet").`);
  }

  // Se online c'è già esattamente questa versione (stesso codice del sito e stessi commit dei giochi),
  // non ripubblica: niente deploy inutili (il piano gratuito ne concede 500 al mese).
  const liveUrl = opt.isPreview ? `https://${branch}.${project}.pages.dev` : `https://${project}.pages.dev`;
  if (!force && built.fingerprint) {
    const live = await fetch(`${liveUrl}/build-info.json`, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .catch(() => null); // se non si riesce a leggere la versione online, si pubblica comunque
    if (live && live.fingerprint === built.fingerprint) {
      info(`\nDeploy non necessario: ${liveUrl} è già aggiornato (nessun cambiamento dal deploy ${live.buildId}).\n`);
      summary(`\n**Deploy non necessario**: ${liveUrl} è già identico a questa build.\n`);
      return;
    }
  }

  info(`\nPubblico ${opt.target} su Cloudflare Pages: progetto "${project}", branch "${branch}"\n`);
  const wranglerArgs = ['--yes', 'wrangler', 'pages', 'deploy', opt.outDir, '--project-name', project, '--branch', branch, '--commit-dirty=true'];
  const runWrangler = () => spawnSync('npx', wranglerArgs, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, CLOUDFLARE_API_TOKEN: token, CLOUDFLARE_ACCOUNT_ID: accountId },
  });
  let r = runWrangler();
  if (r.status !== 0) {
    // Gli errori di upload sono spesso temporanei: un secondo tentativo dopo qualche secondo.
    warn('Primo tentativo di deploy non riuscito', 'riprovo tra 10 secondi');
    await new Promise(res => setTimeout(res, 10000));
    r = runWrangler();
  }
  if (r.status !== 0) {
    fail([
      'Il deploy su Cloudflare Pages non è riuscito (dettagli di wrangler qui sopra).',
      'Online resta la versione precedente del sito.',
      'Se il problema è temporaneo basta rilanciare; se si ripete, esegui "npm run deploy:check" per verificare token e progetto.',
    ]);
  }
  const liveAt = opt.isPreview ? `https://${branch}.${project}.pages.dev` : opt.config.url;
  info(`\nPubblicato: ${liveAt}${!opt.isPreview && !opt.config.url.includes(`${project}.pages.dev`) ? ` (e https://${project}.pages.dev)` : ''}\n`);
  summary(`\n**Pubblicato** su ${liveAt}\n`);

  // IndexNow: avvisa Bing, Yandex & co. che il sito è cambiato (solo sito pubblico; un errore qui non blocca niente)
  if (!opt.isPreview && built.indexNowKey && built.urls?.length) {
    try {
      const host = new URL(opt.config.url).host;
      const res = await fetch('https://api.indexnow.org/indexnow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ host, key: built.indexNowKey, keyLocation: `${opt.config.url}/${built.indexNowKey}.txt`, urlList: built.urls.slice(0, 10000) }),
      });
      if (res.ok) info(`IndexNow: ${built.urls.length} indirizzi segnalati ai motori di ricerca`);
      else warn('IndexNow non riuscito', `risposta ${res.status} (non blocca niente: Google usa la sitemap)`);
    } catch (e) {
      warn('IndexNow non raggiungibile', `${e.message} (non blocca niente)`);
    }
  }
}

main().catch(e => process.exit(printFatal(e)));
