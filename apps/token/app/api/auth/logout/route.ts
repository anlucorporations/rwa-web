/**
 * POST /api/auth/logout — manejador compartido de @rwa/shared (SIWE, D-092).
 */

import { handleLogout } from '@rwa/shared';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const POST = handleLogout;
