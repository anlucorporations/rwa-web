/**
 * API Route: actualizar los módulos de compliance de un token.
 * POST /api/tokens/[tokenId]/modules
 */

import { NextRequest, NextResponse } from 'next/server';
import { NotFoundError, repos, toErrorResponse, ValidationError } from '@rwa/shared';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ADDRESS_RE = /^0x[0-9a-f]{40}$/i;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tokenId: string }> }
) {
  try {
    const { tokenId } = await params;
    if (!UUID_RE.test(tokenId)) throw new ValidationError('id inválido', 'id');

    const body = (await request.json()) as Record<string, unknown>;
    const modules = parseModules(body.modules);

    const updated = await repos.tokens.setComplianceModules(tokenId, modules);
    if (!updated) throw new NotFoundError('token', tokenId);

    return NextResponse.json({
      success: true,
      message: 'Módulos actualizados',
      data: { modules },
    });
  } catch (error) {
    const { status, body } = toErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

/** Array de direcciones de módulo; puede estar vacío (limpia los módulos). */
function parseModules(value: unknown): string[] {
  if (!Array.isArray(value)) {
    throw new ValidationError('"modules" debe ser un array de direcciones', 'modules');
  }
  const modules: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string' || !ADDRESS_RE.test(item)) {
      throw new ValidationError('"modules" debe ser un array de direcciones', 'modules');
    }
    modules.push(item);
  }
  return modules;
}
