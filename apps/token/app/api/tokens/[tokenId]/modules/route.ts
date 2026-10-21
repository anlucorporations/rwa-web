/**
 * API Route: actualizar los módulos de compliance de un token.
 * POST /api/tokens/[tokenId]/modules
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  NotFoundError,
  parseBody,
  repos,
  requireOwner,
  requireSession,
  setModulesSchema,
  toErrorResponse,
  ValidationError,
} from '@rwa/shared';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

    const { modules } = parseBody(setModulesSchema, await request.json());

    const updated = await repos.tokens.setComplianceModules(tokenId, modules);
    if (!updated) throw new NotFoundError('token', tokenId);

    await repos.auditLog.record({
      actorAddress: session.address,
      action: 'token.set_modules',
      resourceType: 'token',
      resourceId: tokenId,
    });

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
