/**
 * Manejadores HTTP de autenticación (Web standard `Request`/`Response`).
 *
 * Se implementan aquí, sin depender de `next`, para que las 3 apps los expongan
 * con un fichero de 3 líneas:
 *
 *   export const dynamic = 'force-dynamic';
 *   export const runtime = 'nodejs';
 *   export const POST = handleNonce;
 */

import { normalizeAddress } from '../db/address';
import { parseBody, siweNonceSchema, siweVerifySchema } from '../validation/index';
import { repos } from '../db/index';
import { toErrorResponse } from '../api/http';
import {
  createChallenge,
  getSessionSecret,
  publicSession,
  readSessionCookie,
  requestOrigin,
  requireSession,
  serializeClearCookie,
  serializeSessionCookie,
  verifyChallenge,
  verifySessionCookie,
} from './index';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function errorResponse(error: unknown): Response {
  const { status, body } = toErrorResponse(error);
  return json(body, status);
}

/** `POST /api/auth/nonce` — crea el reto SIWE para una dirección. */
export async function handleNonce(request: Request): Promise<Response> {
  try {
    const body = parseBody(siweNonceSchema, await request.json());
    const address = normalizeAddress(body.address, 'address');
    const origin = requestOrigin(request);
    const challenge = await createChallenge(address, origin, request.headers.get('user-agent'));
    return json({
      success: true,
      data: {
        nonce: challenge.nonce,
        message: challenge.message,
        expiresAt: challenge.expiresAt,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

/** `POST /api/auth/verify` — verifica la firma y emite la cookie de sesión. */
export async function handleVerify(request: Request): Promise<Response> {
  try {
    const body = parseBody(siweVerifySchema, await request.json());
    const origin = requestOrigin(request);
    const verified = await verifyChallenge(body.message, body.signature, origin);

    const response = json({
      success: true,
      data: {
        address: verified.address,
        role: verified.role,
        expiresAt: verified.expiresAt,
      },
    });
    response.headers.append(
      'Set-Cookie',
      serializeSessionCookie(verified.sessionId, getSessionSecret(), origin.secure),
    );
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}

/** `GET /api/auth/session` — sesión actual (401 si no hay cookie válida). */
export async function handleSession(request: Request): Promise<Response> {
  try {
    const identity = await requireSession(request);
    return json({ success: true, data: publicSession(identity) });
  } catch (error) {
    return errorResponse(error);
  }
}

/** `POST /api/auth/logout` — revoca la sesión y borra la cookie. */
export async function handleLogout(request: Request): Promise<Response> {
  try {
    const secret = getSessionSecret();
    const raw = readSessionCookie(request);
    if (raw) {
      const sessionId = verifySessionCookie(raw, secret);
      if (sessionId) await repos.sessions.revoke(sessionId);
    }
    const response = json({ success: true, data: { loggedOut: true } });
    response.headers.append('Set-Cookie', serializeClearCookie(requestOrigin(request).secure));
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
