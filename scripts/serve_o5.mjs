#!/usr/bin/env node
/**
 * serve_o5.mjs — levanta las 3 apps de producción para las verificaciones O5.
 *
 *   node scripts/serve_o5.mjs           # 4011 identity · 4012 issuer · 4013 token
 *   node scripts/serve_o5.mjs --stop    # detiene los procesos
 *
 * Usa `next start` sobre el build existente (`.next`). Requiere `pnpm -r build`.
 * Escribe logs en `logs/o5-<app>.log` y PIDs en `.pids/o5-<app>.pid`.
 */

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync, openSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const APPS = [
  ['identity', 4011],
  ['issuer', 4012],
  ['token', 4013],
];

mkdirSync(path.join(ROOT, 'logs'), { recursive: true });
mkdirSync(path.join(ROOT, '.pids'), { recursive: true });

const STOP = process.argv.includes('--stop');

function pidFile(app) {
  return path.join(ROOT, '.pids', `o5-${app}.pid`);
}

if (STOP) {
  for (const [app] of APPS) {
    const file = pidFile(app);
    if (existsSync(file)) {
      const pid = Number(readFileSync(file, 'utf8'));
      try {
        process.kill(pid, 'SIGTERM');
        console.log(`✓ ${app} detenido (PID ${pid})`);
      } catch {
        console.log(`ℹ️  ${app} ya no estaba corriendo`);
      }
      rmSync(file, { force: true });
    }
  }
  process.exit(0);
}

for (const [app, port] of APPS) {
  const cwd = path.join(ROOT, 'apps', app);
  if (!existsSync(path.join(cwd, '.next'))) {
    console.error(`✗ ${app}: falta .next (ejecuta pnpm -r build)`);
    process.exit(1);
  }
  const log = path.join(ROOT, 'logs', `o5-${app}.log`);
  const logFd = openSync(log, 'a');
  const out = spawn('pnpm', ['exec', 'next', 'start', '-p', String(port), '-H', '127.0.0.1'], {
    cwd,
    env: process.env,
    detached: true,
    stdio: ['ignore', logFd, logFd],
  });
  out.unref();
  writeFileSync(pidFile(app), String(out.pid));
  console.log(`▶ ${app} en http://127.0.0.1:${port} (PID ${out.pid})`);
}

console.log('\nEspera unos segundos y comprueba: curl http://127.0.0.1:4011/api/health');
