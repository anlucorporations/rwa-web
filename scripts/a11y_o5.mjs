#!/usr/bin/env node
/**
 * a11y_o5.mjs — auditoría de accesibilidad estática con axe-core (O5.6).
 *
 * Analiza el HTML prerenderizado por `next build` (`.next/server/app/*.html`) de
 * las 3 apps con las reglas WCAG 2.0/2.1 A y AA. No sustituye a una auditoría de
 * navegador (estados dinámicos, foco, lectores de pantalla): es el gate estático
 * reproducible en CI sin browser.
 *
 * Uso: node scripts/a11y_o5.mjs   (después de `pnpm -r build`)
 * Sale con código 1 si hay violaciones de impacto critical/serious.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { JSDOM, VirtualConsole } from 'jsdom';
import axe from 'axe-core';

const ROOT = path.resolve(import.meta.dirname, '..');
const APPS = ['identity', 'issuer', 'token'];
const SEVERITY = new Set(['critical', 'serious']);

const IGNORED_FILES = new Set(['_global-error.html', '_not-found.html']);

function htmlFiles(app) {
  const dir = path.join(ROOT, 'apps', app, '.next', 'server', 'app');
  if (!existsSync(dir)) return [];
  const files = [];
  const walk = (current) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.html') && !IGNORED_FILES.has(entry.name)) files.push(full);
    }
  };
  walk(dir);
  return files;
}

async function analyse(file) {
  const html = readFileSync(file, 'utf8');
  const virtualConsole = new VirtualConsole();
  const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole });
  const { window } = dom;
  window.eval(axe.source);
  return window.axe.run(window.document, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
  });
}

let failures = 0;
let analysed = 0;

for (const app of APPS) {
  const files = htmlFiles(app);
  if (files.length === 0) {
    console.log(`⚠️  ${app}: sin HTML prerenderizado (¿falta pnpm -r build?)`);
    continue;
  }
  for (const file of files) {
    const rel = path.relative(path.join(ROOT, 'apps', app, '.next', 'server', 'app'), file);
    const results = await analyse(file);
    analysed += 1;
    const blocking = results.violations.filter((v) => SEVERITY.has(v.impact));
    const others = results.violations.filter((v) => !SEVERITY.has(v.impact));

    if (blocking.length === 0) {
      console.log(`✅ ${app}/${rel}: ${results.violations.length} violación(es), 0 críticas/graves`);
    } else {
      failures += 1;
      console.log(`❌ ${app}/${rel}: ${blocking.length} violación(es) críticas/graves`);
      for (const violation of blocking) {
        console.log(`   • [${violation.impact}] ${violation.id}: ${violation.help}`);
        for (const node of violation.nodes.slice(0, 3)) {
          console.log(`     ${node.target.join(' ')}`);
        }
      }
    }
    for (const violation of others) {
      console.log(`   ℹ️  [${violation.impact ?? 'minor'}] ${violation.id}: ${violation.help}`);
    }
  }
}

console.log(`\n${analysed} página(s) analizada(s); ${failures} con violaciones críticas/graves.`);
if (failures > 0) {
  console.log('✗ a11y estática: falla el presupuesto de accesibilidad (0 críticas/graves).');
  process.exit(1);
}
console.log('✓ a11y estática: 0 violaciones críticas/graves (WCAG A/AA).');
