#!/usr/bin/env node
/**
 * headers_o5.mjs — verifica las cabeceras de seguridad y la correlación (RNF-W-01 / RF-W-16).
 *
 * Requiere las 3 apps servidas con `node scripts/serve_o5.mjs` (puertos 4011–4013).
 * Comprueba en la portada y en `/api/health` de cada app:
 *   Content-Security-Policy · X-Frame-Options · Referrer-Policy
 *   Strict-Transport-Security · X-Content-Type-Options · x-request-id
 *
 * Uso:
 *   node scripts/serve_o5.mjs
 *   node scripts/headers_o5.mjs
 *   node scripts/serve_o5.mjs --stop
 */

const APPS = [
  ['identity', 'http://127.0.0.1:4011'],
  ['issuer', 'http://127.0.0.1:4012'],
  ['token', 'http://127.0.0.1:4013'],
];

const REQUIRED = {
  'content-security-policy': (value) =>
    value.includes("default-src 'self'") && value.includes("frame-ancestors 'none'"),
  'x-frame-options': (value) => value.toUpperCase() === 'DENY',
  'referrer-policy': (value) => value === 'strict-origin-when-cross-origin',
  'strict-transport-security': (value) => value.includes('max-age='),
  'x-content-type-options': (value) => value === 'nosniff',
  'x-request-id': (value) => /^[A-Za-z0-9._-]{8,128}$/.test(value),
};

const PATHS = ['/', '/api/health'];
const TIMEOUT_MS = 45_000;

async function waitFor(url) {
  const deadline = Date.now() + TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      await fetch(url, { method: 'GET', signal: AbortSignal.timeout(3_000) });
      return true;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
  }
  return false;
}

let failures = 0;
let checks = 0;

for (const [app, base] of APPS) {
  if (!(await waitFor(`${base}/`))) {
    console.error(`✗ ${app}: no responde en ${base}`);
    failures += 1;
    continue;
  }

  for (const path of PATHS) {
    const url = `${base}${path}`;
    let response;
    try {
      response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(10_000) });
    } catch (error) {
      console.error(`✗ ${app}${path}: error de red (${error.message})`);
      failures += 1;
      continue;
    }

    for (const [header, validate] of Object.entries(REQUIRED)) {
      checks += 1;
      const value = response.headers.get(header);
      if (!value) {
        console.error(`✗ ${app}${path}: falta ${header}`);
        failures += 1;
      } else if (!validate(value)) {
        console.error(`✗ ${app}${path}: ${header} inválida → ${value}`);
        failures += 1;
      }
    }
    console.log(`✓ ${app}${path} → ${response.status} con cabeceras y x-request-id`);
  }
}

console.log(`\n${checks} comprobaciones; ${failures} fallo(s).`);
process.exit(failures === 0 ? 0 : 1);
