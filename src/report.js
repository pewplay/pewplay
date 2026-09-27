// Messaggi della build, uguali in locale e su GitHub Actions.
//
// Tre livelli:
//   info     → normale avanzamento
//   warn     → qualcosa da sapere, ma la build prosegue e il sito viene pubblicato
//   BuildError → problema che impedisce di pubblicare: la build si ferma (exit 1)
//               e online resta la versione precedente del sito.
//
// Su GitHub Actions avvisi ed errori diventano anche "annotazioni", visibili
// in cima alla pagina della run senza dover aprire i log.
import fs from 'node:fs';

const IN_GITHUB = !!process.env.GITHUB_ACTIONS;
const warnings = [];

/** Errore "previsto": messaggio chiaro + suggerimenti su come risolvere. */
export class BuildError extends Error {
  constructor(message, hints = []) {
    super(message);
    this.hints = hints;
  }
}

const escapeAnnotation = s => String(s).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');

export function info(msg = '') {
  console.log(msg);
}

/** Avviso: mostrato subito, ripetuto nel riepilogo finale e annotato su GitHub. */
export function warn(title, msg) {
  warnings.push({ title, msg });
  console.log(`   AVVISO  ${title}${msg ? `: ${msg}` : ''}`);
  if (IN_GITHUB) console.log(`::warning title=${escapeAnnotation(title)}::${escapeAnnotation(msg || title)}`);
}

export function collectedWarnings() {
  return warnings;
}

/** Stampa un errore che ferma il programma e restituisce il codice di uscita. */
export function printFatal(e) {
  if (e instanceof BuildError) {
    console.error(`\nERRORE: ${e.message}`);
    for (const h of e.hints) console.error(`        ${h}`);
    console.error('');
    if (IN_GITHUB) console.log(`::error title=PewPlay::${escapeAnnotation([e.message, ...e.hints].join('\n'))}`);
  } else {
    console.error('\nERRORE IMPREVISTO (probabile bug della build):');
    console.error(e && e.stack ? e.stack : e);
    console.error('');
    if (IN_GITHUB) console.log(`::error title=PewPlay - errore imprevisto::${escapeAnnotation(e && e.message ? e.message : String(e))}`);
  }
  return 1;
}

/** Aggiunge testo al riepilogo della run di GitHub Actions (se presente). */
export function summary(markdown) {
  const file = process.env.GITHUB_STEP_SUMMARY;
  if (file) fs.appendFileSync(file, `${markdown}\n`);
}
