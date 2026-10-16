/**
 * POST /api/auth/nonce — manejador compartido de @rwa/shared (SIWE, D-092).
 */

import { handleNonce } from '@rwa/shared';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const POST = handleNonce;
