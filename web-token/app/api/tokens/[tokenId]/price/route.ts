/**
 * API Route: actualizar el precio de un token.
 * POST /api/tokens/[tokenId]/price
 */

import { NextRequest, NextResponse } from 'next/server';
import { NotFoundError, repos, requireOwner, requireSession, toErrorResponse, ValidationError } from '@rwa/shared';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Decimal no negativo y sin notación científica (columna `numeric(38,18)`). */
const PRICE_RE = /^\d+(\.\d+)?$/;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tokenId: string }> }
) {
  try {
    const session = await requireSession(request);

    const { tokenId } = await params;
    if (!UUID_RE.test(tokenId)) throw new ValidationError('id inválido', 'id');

    const token = await repos.tokens.findById(tokenId);
    if (!token) throw new NotFoundError('token', tokenId);

    requireOwner(session, token.admin_address, 'el token');

    const body = (await request.json()) as Record<string, unknown>;
    const price = parsePrice(body.price);

    const updated = await repos.tokens.setPrice(tokenId, String(price));
    if (!updated) throw new NotFoundError('token', tokenId);

    await repos.auditLog.record({
      actorAddress: session.address,
      action: 'token.set_price',
      resourceType: 'token',
      resourceId: tokenId,
    });

    return NextResponse.json({
      success: true,
      message: 'Precio actualizado',
      data: { price },
    });
  } catch (error) {
    const { status, body } = toErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

/** Acepta `string` o `number` y lo normaliza a string decimal no negativo. */
function parsePrice(value: unknown): string {
  if (value === undefined || value === null) {
    throw new ValidationError('"price" es obligatorio', 'price');
  }
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new ValidationError('"price" debe ser texto o número', 'price');
  }
  if (typeof value === 'number' && !Number.isFinite(value)) {
    throw new ValidationError('"price" debe ser un número finito', 'price');
  }
  const normalized = String(value);
  if (!PRICE_RE.test(normalized)) {
    throw new ValidationError('"price" debe ser un decimal no negativo sin notación científica', 'price');
  }
  return normalized;
}
