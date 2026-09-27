#!/usr/bin/env node
// Prova i giochi in locale DENTRO il sito vero, prima di pushare.
//   npm run dev -- --games ..            → tutte le cartelle-gioco accanto a pewplay
//   npm run dev -- --games .. --only mio-gioco
// Costruisce in modalità anteprima (bozze visibili) in dist-dev/ e avvia un server locale.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { parseArgs, ROOT } from './config.js';
import { serve } from './serve.js';

const args = parseArgs(process.argv.slice(2));
const port = Number(args.port || 8080);
const buildArgs = ['--target', 'preview', '--out', 'dist-dev', '--base-url', `http://localhost:${port}`];
if (args.games) buildArgs.push('--games', path.resolve(args.games));
if (args.only) buildArgs.push('--only', args.only);

const r = spawnSync(process.execPath, [path.join(ROOT, 'src/build.js'), ...buildArgs], { stdio: 'inherit', cwd: ROOT });
if (r.status !== 0) process.exit(r.status || 1);
serve(path.join(ROOT, 'dist-dev'), port);
