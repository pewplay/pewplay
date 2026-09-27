#!/usr/bin/env node
// Server statico minimale per provare il sito in locale (niente dipendenze).
//   npm run serve                 → serve dist/ su http://localhost:8080
//   npm run serve -- --dir dist-dev --port 3000
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs, ROOT } from './config.js';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.eot': 'application/vnd.ms-fontobject',
  '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.mp4': 'video/mp4', '.webm': 'video/webm', '.wasm': 'application/wasm',
};

export function serve(dir, port) {
  const root = path.resolve(dir);
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let file = path.join(root, p);
    if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
      if (!p.endsWith('/')) { res.writeHead(301, { Location: p + '/' }).end(); return; }
      file = path.join(file, 'index.html');
    }
    let status = 200;
    if (!fs.existsSync(file)) { status = 404; file = path.join(root, '404.html'); }
    res.writeHead(status, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  });
  if (!fs.existsSync(path.join(root, 'index.html'))) {
    console.error(`\nERRORE: ${root} non contiene un sito: esegui prima la build.\n`);
    process.exit(1);
  }
  server.on('error', e => {
    console.error(e.code === 'EADDRINUSE'
      ? `\nERRORE: la porta ${port} è già in uso. Usa un'altra porta, es. --port ${port + 1}\n`
      : `\nERRORE: server non avviato (${e.message})\n`);
    process.exit(1);
  });
  server.listen(port, () => console.log(`\nSito locale: http://localhost:${port}/  (Ctrl+C per fermare)\n`));
  return server;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.join(ROOT, 'src', 'serve.js')) {
  const args = parseArgs(process.argv.slice(2));
  serve(path.resolve(ROOT, args.dir || 'dist'), Number(args.port || 8080));
}
