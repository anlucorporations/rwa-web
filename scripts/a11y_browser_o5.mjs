#!/usr/bin/env node
/**
 * a11y_browser_o5.mjs — auditoría de accesibilidad en navegador real (O5.6).
 *
 * Complementa al gate estático (`a11y_o5.mjs`): carga las rutas con Playwright
 * (Chromium headless) e inyecta axe-core en el DOM ya hidratado, por lo que cubre
 * estados dinámicos de render (no interacción con wallet).
 *
 * Uso:
 *   scripts/serve_o5.mjs &        # levanta las 3 apps en 4011/4012/4013
 *   node scripts/a11y_browser_o5.mjs
 *
 * Sale con 1 si hay violaciones axe critical/serious.
 */

import path from 'node:path';
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const ROOT = path.resolve(import.meta.dirname, '..');
const AXE_SOURCE = readFileSync(path.join(ROOT, 'node_modules/axe-core/axe.min.js'), 'utf8');
const SEVERITY = new Set(['critical', 'serious']);

const ROUTES = [
  ['identity', 'http://127.0.0.1:4011/'],
  ['identity', 'http://127.0.0.1:4011/app'],
  ['issuer', 'http://127.0.0.1:4012/'],
  ['issuer', 'http://127.0.0.1:4012/dashboard'],
  ['token', 'http://127.0.0.1:4013/'],
  ['token', 'http://127.0.0.1:4013/factory'],
  ['token', 'http://127.0.0.1:4013/marketplace'],
];

const browser = await chromium.launch();
let failures = 0;
let analysed = 0;

try {
  for (const [app, url] of ROUTES) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const consoleErrors = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });

    try {
      const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 45_000 });
      await page.waitForTimeout(750);
      await page.addScriptTag({ content: AXE_SOURCE });
      const results = await page.evaluate(async () => {
        // @ts-expect-error axe se inyecta en tiempo de ejecución
        return window.axe.run(document, {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
        });
      });

      const blocking = results.violations.filter((violation) => SEVERITY.has(violation.impact));
      const status = response?.status() ?? 0;
      analysed += 1;

      if (blocking.length === 0) {
        console.log(`✅ ${app} ${url} [HTTP ${status}] — 0 críticas/graves (${results.violations.length} menores)`);
      } else {
        failures += 1;
        console.log(`❌ ${app} ${url} [HTTP ${status}] — ${blocking.length} críticas/graves`);
        for (const violation of blocking) {
          console.log(`   • [${violation.impact}] ${violation.id}: ${violation.help} (${violation.nodes.length} nodo/s)`);
          for (const node of violation.nodes.slice(0, 3)) {
            console.log(`     ${node.target.join(' ')}`);
            console.log(`       ${String(node.failureSummary ?? '').split('\n').slice(-1)[0]}`);
          }
        }
      }
      const relevantErrors = consoleErrors.filter((line) => !/Failed to load resource|fetch|503|500/i.test(line));
      if (relevantErrors.length > 0) {
        console.log(`   ⚠️ ${relevantErrors.length} error(es) de consola no esperados`);
      }
    } catch (error) {
      failures += 1;
      console.log(`❌ ${app} ${url} — no se pudo auditar: ${error instanceof Error ? error.message : error}`);
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
}

console.log(`\n${analysed}/${ROUTES.length} ruta(s) auditadas en navegador; ${failures} con fallos.`);
if (failures > 0) process.exit(1);
console.log('✓ a11y en navegador: 0 violaciones críticas/graves (WCAG A/AA).');
