/**
 * GET /api/auth/session — manejador compartido de @rwa/shared (SIWE, D-092).
 */

import { handleSession } from '@rwa/shared';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const GET = handleSession;
