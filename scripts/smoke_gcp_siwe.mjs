#!/usr/bin/env node
/**
 * smoke_gcp_siwe.mjs — smoke test de autenticación SIWE contra una app desplegada.
 *
 * Verifica el flujo real completo (no solo /api/health):
 *   POST /api/auth/nonce → firma EIP-4361 con una cuenta de Anvil → POST /api/auth/verify
 *   → GET /api/auth/session (200 con la dirección y rol).
 *
 * Esto valida en Cloud Run: SIWE_SESSION_SECRET, escritura/lectura de `rwa.sessions` en el
 * PostgreSQL global y el proxy de red. Usa una clave de Anvil pública (solo redes de prueba).
 *
 * Uso (desde rwa-web/, con dependencias instaladas):
 *   node scripts/smoke_gcp_siwe.mjs https://rwa-identity-slzlptbcla-ew.a.run.app
 *   node scripts/smoke_gcp_siwe.mjs            # por defecto, rwa-identity global (ver abajo)
 *
 * Salida: JSON con los códigos HTTP y la sesión; exit 1 si algo falla.
 */

import { privateKeyToAccount } from 'viem/accounts';

const DEFAULT_BASE = 'https://rwa-identity-slzlptbcla-ew.a.run.app';
const BASE = (process.argv[2] ?? DEFAULT_BASE).replace(/\/$/, '');

// Cuenta owner por defecto de Anvil (pública, solo test).
const account = privateKeyToAccount('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80');

const post = (path, body) =>
  fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

const nonceRes = await post('/api/auth/nonce', { address: account.address });
const nonceBody = await nonceRes.json();
if (!nonceRes.ok) throw new Error(`nonce ${nonceRes.status}: ${JSON.stringify(nonceBody)}`);

const signature = await account.signMessage({ message: nonceBody.data.message });
const verifyRes = await post('/api/auth/verify', { message: nonceBody.data.message, signature });
const verifyBody = await verifyRes.json();
if (!verifyRes.ok) throw new Error(`verify ${verifyRes.status}: ${JSON.stringify(verifyBody)}`);

const cookies = verifyRes.headers.getSetCookie?.() ?? [verifyRes.headers.get('set-cookie')];
const cookie = cookies.filter(Boolean).map((c) => c.split(';')[0]).join('; ');

const sessionRes = await fetch(`${BASE}/api/auth/session`, { headers: { cookie } });
const sessionBody = await sessionRes.json();

const result = {
  base: BASE,
  nonce: nonceRes.status,
  verify: verifyRes.status,
  session: sessionRes.status,
  address: sessionBody?.data?.address,
  role: sessionBody?.data?.role,
  cookie: cookie ? 'presente' : 'ausente',
};
console.log(JSON.stringify(result, null, 1));

if (sessionRes.status !== 200 || sessionBody?.data?.address?.toLowerCase() !== account.address.toLowerCase()) {
  console.error('✗ smoke_gcp_siwe: la sesión SIWE no quedó establecida');
  process.exit(1);
}
console.log('✓ smoke_gcp_siwe: autenticación SIWE operativa en la app desplegada');
