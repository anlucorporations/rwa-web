#!/usr/bin/env node
/**
 * e2e_market_legacy.mjs — E2E de la brecha de marketplace/precio (P1).
 *
 * Verifica de forma reproducible la decisión documentada en la guía
 * (`FICHERO_PARA_ESTUDIANTE.md`, §4 «Establecer Precio — módulo LEGACY») y en
 * `apps/token/lib/contracts/market.ts`:
 *
 *   1. El ABI REAL de `TokenCloneable` (artefacto generado desde `rwa-sc`) NO
 *      declara `pricePerToken`, `setPrice` ni `buyToken`.
 *   2. `market.ts` sigue declarando esas funciones con un ABI manual Y está
 *      marcado explícitamente como legacy (cabeza del módulo).
 *   3. (Opcional, on-chain) Si `E2E_RPC_URL` y `E2E_TOKEN_ADDRESS` están
 *      definidos, `eth_call` a `pricePerToken()` no devuelve datos: la función
 *      no existe en el contrato desplegado.
 *
 * Uso:
 *   node scripts/e2e_market_legacy.mjs
 *   E2E_RPC_URL=http://127.0.0.1:8545 E2E_TOKEN_ADDRESS=0x... node scripts/e2e_market_legacy.mjs
 *
 * Sale con código 1 si alguna comprobación falla.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

let failures = 0;
function check(name, ok, detail = '') {
  if (ok) {
    console.log(`✓ ${name}`);
  } else {
    failures += 1;
    console.error(`✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

// --- 1. ABI real generado desde rwa-sc: sin funciones de mercado -----------------
const generatedAbiPath = join(ROOT, 'packages/shared/src/contracts/abis/TokenCloneable.ts');
const generatedAbi = readFileSync(generatedAbiPath, 'utf8');
for (const fn of ['pricePerToken', 'setPrice', 'buyToken']) {
  check(
    `TokenCloneable (ABI generado) no expone ${fn}()`,
    !generatedAbi.includes(`"name": "${fn}"`),
    'el artefacto de rwa-sc declara la función: hay que regenerar/alinear',
  );
}

// --- 2. market.ts: ABI manual + marcado legacy explícito ------------------------
const marketPath = join(ROOT, 'apps/token/lib/contracts/market.ts');
const market = readFileSync(marketPath, 'utf8');
check(
  'market.ts declara el ABI legacy (pricePerToken/setPrice/buyToken)',
  ['pricePerToken', 'setPrice', 'buyToken'].every((fn) => market.includes(fn)),
);
check(
  'market.ts está marcado explícitamente como legacy/deuda',
  /legacy|deuda t[eé]cnica|anterior a esa generaci[oó]n|debe desaparecer/i.test(market),
  'falta la marca de legacy en la cabeza del módulo',
);

// --- 3. (Opcional) on-chain: pricePerToken() no responde ------------------------
const rpcUrl = process.env.E2E_RPC_URL;
const tokenAddress = process.env.E2E_TOKEN_ADDRESS;
if (rpcUrl && tokenAddress) {
  // selector de pricePerToken() (keccak256("pricePerToken()")[:4]); sin acoplar viem
  const selector = '0x7b1b1de6';
  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_call',
      params: [{ to: tokenAddress, data: selector }, 'latest'],
    }),
  });
  const json = await res.json();
  const result = json?.result ?? '';
  check(
    'on-chain: pricePerToken() no existe en TokenCloneable desplegado',
    json?.error !== undefined || result === '0x' || result === '0x0',
    `la llamada devolvió ${JSON.stringify(json?.result ?? json?.error)}`,
  );
} else {
  console.log('• on-chain: omitido (define E2E_RPC_URL y E2E_TOKEN_ADDRESS para ejecutarlo)');
}

if (failures > 0) {
  console.error(`\n✗ e2e_market_legacy: ${failures} comprobación(es) fallida(s)`);
  process.exit(1);
}
console.log('\n✓ e2e_market_legacy: brecha de marketplace/precio marcada como legacy y verificada');
