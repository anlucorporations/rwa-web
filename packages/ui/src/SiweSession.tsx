'use client';

/**
 * Sesión SIWE del cliente (RF-W-01, D-092).
 *
 * Tras conectar la wallet, firma el reto SIWE del mismo origen y crea la cookie
 * `httpOnly` que exigen las rutas de escritura. Sin esto, las mutaciones
 * autenticadas (claims, tokens, uploads) devolverían 401 desde la UI.
 */

type SignMessage = (message: string) => Promise<string>;

async function readJson(response: Response): Promise<Record<string, unknown> | null> {
  return response.json().catch(() => null);
}

/** Crea (si hace falta) la sesión SIWE para `address` y devuelve si quedó lista. */
export async function ensureSiweSession(address: string, signMessage: SignMessage): Promise<boolean> {
  const current = await fetch('/api/auth/session', {
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
  }).catch(() => null);

  if (current?.ok) {
    const body = await readJson(current);
    const data = body?.data as { address?: string } | undefined;
    if (data?.address?.toLowerCase() === address.toLowerCase()) return true;
  }

  const nonceResponse = await fetch('/api/auth/nonce', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address }),
  });
  const nonceBody = await readJson(nonceResponse);
  const nonceData = nonceBody?.data as { message?: string } | undefined;
  if (!nonceResponse.ok || !nonceData?.message) {
    throw new Error('No se pudo iniciar la sesión SIWE (nonce)');
  }

  const signature = await signMessage(nonceData.message);

  const verifyResponse = await fetch('/api/auth/verify', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: nonceData.message, signature }),
  });
  if (!verifyResponse.ok) {
    throw new Error('No se pudo verificar la sesión SIWE');
  }
  return true;
}
