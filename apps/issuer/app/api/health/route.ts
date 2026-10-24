/**
 * Healthcheck de web-registry-trusted (O0.5 · RT-W-09).
 *
 * Valida la red canónica (chain 31337) y el pool de PostgreSQL vía `@rwa/shared`.
 */

import { NextRequest, NextResponse } from 'next/server';
import { buildHealthReport, toErrorResponse } from '@rwa/shared';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({ success: true, data: await buildHealthReport() });
  } catch (error) {
    const { status, body } = toErrorResponse(error, request);
    return NextResponse.json(body, { status });
  }
}
