/**
 * Diagnóstico de la conexión PostgreSQL (esquema `rwa`).
 *
 * GET: comprueba el pool y devuelve el listado de tokens con sus relaciones.
 */

import { NextResponse } from 'next/server';
import { debugEndpointsEnabled, logger, NotFoundError, repos, toErrorResponse, toTokenDto } from '@rwa/shared';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    if (!debugEndpointsEnabled()) throw new NotFoundError('endpoint', 'test-db');

    const items = await repos.tokens.listWithRelations();
    const stats = await repos.tokens.stats();

    logger.info({ totalTokens: items.length }, 'Conexión PostgreSQL verificada');

    return NextResponse.json({
      success: true,
      connected: true,
      database: 'rwa',
      totalTokens: items.length,
      tokens: items.map((item) => toTokenDto(item.token, item)),
      dbStats: {
        tables: stats.tables,
        sizeBytes: stats.sizeBytes,
      },
    });
  } catch (error) {
    const { status, body } = toErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
