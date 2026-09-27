// Piccole utility condivise, senza dipendenze esterne.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';

/** Escape per testo e attributi HTML. */
export function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** "space-invaders" → "Space Invaders" */
export function prettifySlug(slug) {
  return slug.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim();
}

export function shortHash(input, len = 8) {
  return crypto.createHash('sha1').update(input).digest('hex').slice(0, len);
}

/** Esegue un comando; rifiuta con lo stderr se fallisce. Ritorna stdout. */
export function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'], ...options });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', c => { stdout += c; });
    child.stderr.on('data', c => { stderr += c; });
    child.on('error', reject);
    child.on('close', code => {
      if (code === 0) return resolve(stdout);
      reject(new Error(stderr.trim() || `${command} exited with code ${code}`));
    });
  });
}

/** Esegue `worker` su tutti gli elementi con al massimo `limit` in parallelo. */
export async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  const runners = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await worker(items[i], i);
    }
  });
  await Promise.all(runners);
  return results;
}

/**
 * Converte un pattern stile .gitignore in RegExp sul percorso relativo (con "/").
 *  - "*.md"       → qualsiasi file .md in qualsiasi cartella
 *  - "doc"        → la cartella/il file "doc" ovunque, con tutto il contenuto
 *  - "/doc"       → solo "doc" nella root
 *  - "promo/**"   → tutto dentro promo/
 */
export function globToRegExp(pattern) {
  let p = pattern.trim();
  const anchored = p.startsWith('/') || p.slice(0, -1).includes('/');
  p = p.replace(/^\//, '').replace(/\/$/, '');
  let re = '';
  for (let i = 0; i < p.length; i++) {
    const c = p[i];
    if (c === '*') {
      if (p[i + 1] === '*') {
        if (p[i + 2] === '/') { re += '(?:.*/)?'; i += 2; } else { re += '.*'; i += 1; }
      } else re += '[^/]*';
    } else if (c === '?') re += '[^/]';
    else re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${anchored ? '' : '(?:.*/)?'}${re}(?:/.*)?$`);
}

export function makeMatcher(patterns) {
  const regs = patterns.filter(Boolean).map(globToRegExp);
  return rel => regs.some(r => r.test(rel));
}

/** Elenca ricorsivamente i file di una cartella (percorsi relativi con "/"). */
export function walkFiles(dir, base = dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, base, out);
    else if (entry.isFile()) out.push(path.relative(base, full).split(path.sep).join('/'));
  }
  return out;
}

/** Copia una cartella saltando i percorsi che `isExcluded(rel)` scarta. */
export function copyFiltered(src, dst, isExcluded) {
  let files = 0;
  let bytes = 0;
  for (const rel of walkFiles(src)) {
    if (isExcluded(rel)) continue;
    const from = path.join(src, rel);
    const to = path.join(dst, rel);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(from, to);
    files++;
    bytes += fs.statSync(from).size;
  }
  return { files, bytes };
}

export function readJsonSafe(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

export function writeFile(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

export function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 ** 2).toFixed(1)} MB`;
}

/** Hash deterministico 0..1 da una stringa (per ordinamenti stabili). */
export function stableRandom(str) {
  return parseInt(shortHash(str, 8), 16) / 0xffffffff;
}
