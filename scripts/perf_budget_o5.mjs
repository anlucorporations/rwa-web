#!/usr/bin/env node
/**
 * perf_budget_o5.mjs — presupuesto de rendimiento del build de producción (O5.7).
 *
 * Para cada ruta prerenderizada, suma el JavaScript que carga el navegador
 * (chunks referenciados por `<script src>` + scripts inline) y lo compara con el
 * presupuesto gzip por ruta. Determinista y reproducible sin browser/Lighthouse:
 * mide el "First Load JS" del HTML generado por `next build`.
 *
 * Uso: node scripts/perf_budget_o5.mjs   (después de `pnpm -r build`)
 * Presupuesto por ruta: PERF_BUDGET_KB (por defecto 400).
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const BUDGET_KB = Number(process.env.PERF_BUDGET_KB ?? 400);
const APPS = ['identity', 'issuer', 'token'];
const IGNORED = new Set(['_global-error.html', '_not-found.html']);

function htmlFiles(app) {
  const dir = path.join(ROOT, 'apps', app, '.next', 'server', 'app');
  if (!existsSync(dir)) return [];
  const files = [];
  const walk = (current) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.html') && !IGNORED.has(entry.name)) files.push(full);
    }
  };
  walk(dir);
  return files;
}

function gzipKb(buffer) {
  return gzipSync(buffer, { level: 9 }).length / 1024;
}

function pageBudget(app, file) {
  const html = readFileSync(file, 'utf8');
  const nextRoot = path.join(ROOT, 'apps', app, '.next');
  const scripts = [...html.matchAll(/<script[^>]*src="([^"]+)"[^>]*>/g)].map((m) => m[1]);
  let total = 0;
  const seen = new Set();

  for (const src of scripts) {
    const clean = src.replace(/^\/_next\//, '').split('?')[0];
    if (seen.has(clean)) continue;
    seen.add(clean);
    const full = path.join(nextRoot, clean);
    if (existsSync(full)) total += gzipKb(readFileSync(full));
  }

  // Scripts inline del HTML (datos de RSC/estado inicial)
  for (const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) {
    if (match[1].trim().length > 0) total += gzipKb(Buffer.from(match[1]));
  }

  return total;
}

let failures = 0;
let measured = 0;

console.log(`Presupuesto por ruta: ${BUDGET_KB} KB (gzip, First Load JS)\n`);

for (const app of APPS) {
  const files = htmlFiles(app);
  if (files.length === 0) {
    console.log(`⚠️  ${app}: sin HTML prerenderizado (¿falta pnpm -r build?)`);
    continue;
  }
  for (const file of files) {
    const rel = path.relative(path.join(ROOT, 'apps', app, '.next', 'server', 'app'), file);
    const kb = pageBudget(app, file);
    measured += 1;
    const ok = kb <= BUDGET_KB;
    if (!ok) failures += 1;
    console.log(`${ok ? '✅' : '❌'} ${app}/${rel.padEnd(18)} ${kb.toFixed(1).padStart(7)} KB`);
  }
}

console.log(`\n${measured} ruta(s) medidas; ${failures} fuera de presupuesto.`);
if (failures > 0) {
  console.log('✗ perf budget: hay rutas por encima del presupuesto.');
  process.exit(1);
}
console.log('✓ perf budget: todas las rutas dentro del presupuesto.');
