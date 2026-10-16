/**
 * Prueba de humo del ciclo O0 (O0.7).
 *
 * Comprueba de extremo a extremo la fundación del frontend:
 *   1. PostgreSQL responde (`SELECT 1`) y el esquema `rwa` tiene el catálogo de topics.
 *   2. La capa de datos compartida devuelve los 5 topics sembrados (1/7/9 activos).
 *   3. El RPC canónico responde con `chainId` 31337 (Anvil de GCP, D-096).
 *
 * Uso:
 *   source scripts/gcp-env.sh --tcp
 *   pnpm --filter @rwa/shared smoke
 *
 * Sale con código ≠ 0 si cualquiera de las tres comprobaciones falla.
 */

import { getNetworkConfig } from '../config/index.js';
import { closePool, ping } from './pool.js';
import { ClaimTopicsRepository } from './repositories/claim-topics.js';

const EXPECTED_ACTIVE_TOPICS = [1, 7, 9];

interface ChainIdResponse {
  result?: string;
  error?: { message?: string };
}

async function chainId(rpcUrl: string): Promise<string> {
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_chainId', params: [], id: 1 }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`RPC HTTP ${response.status}`);
  const body = (await response.json()) as ChainIdResponse;
  if (!body.result) throw new Error(body.error?.message ?? 'respuesta sin result');
  return body.result;
}

async function main(): Promise<void> {
  const checks: { name: string; ok: boolean; detail: string }[] = [];

  // 1. Conectividad PostgreSQL
  await ping();
  checks.push({ name: 'PostgreSQL SELECT 1', ok: true, detail: 'ok' });

  // 2. Catálogo de topics a través del repositorio compartido
  const topics = await new ClaimTopicsRepository().listActive();
  const ids = topics.map((t) => t.id).sort((a, b) => a - b);
  const topicsOk = JSON.stringify(ids) === JSON.stringify(EXPECTED_ACTIVE_TOPICS);
  checks.push({
    name: 'rwa.claim_topics (activos)',
    ok: topicsOk,
    detail: `[${ids.join(', ')}] ${topics.map((t) => `${t.id}=${t.code}`).join(' · ')}`,
  });

  // 3. Red canónica on-chain
  const net = getNetworkConfig();
  const hex = await chainId(net.rpcUrl);
  const onchain = Number.parseInt(hex, 16);
  checks.push({
    name: `RPC chainId (${net.rpcUrl})`,
    ok: onchain === net.chainId,
    detail: `${hex} = ${onchain} (esperado ${net.chainId})`,
  });

  console.log('\n— Prueba de humo O0 —');
  let failed = 0;
  for (const check of checks) {
    console.log(`${check.ok ? '✓' : '✗'} ${check.name}: ${check.detail}`);
    if (!check.ok) failed += 1;
  }
  console.log(`\n${checks.length - failed}/${checks.length} comprobaciones en verde`);

  if (failed > 0) process.exitCode = 1;
}

main()
  .catch((error: unknown) => {
    console.error(`✗ Prueba de humo O0 abortada: ${(error as Error).message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
