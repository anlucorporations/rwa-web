/**
 * API Route para la gestión de tokens.
 *
 * GET:  listado off-chain (filtro opcional por `adminAddress`).
 * POST: alta del token + topics exigidos + módulos de compliance.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  createTokenSchema,
  parseBody,
  NotFoundError,
  repos,
  requireOwner,
  requireSession,
  toErrorResponse,
  toTokenDto,
} from '@rwa/shared';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** El esquema exige `^[A-Z0-9]{1,11}$` para `symbol` (CHECK). */
const SYMBOL_RE = /^[A-Z0-9]{1,11}$/;

export async function GET(request: NextRequest) {
  try {
    const adminAddress = request.nextUrl.searchParams.get('adminAddress') ?? undefined;

    const items = await repos.tokens.listWithRelations({ adminAddress });

    return NextResponse.json({
      success: true,
      data: items.map((item) => toTokenDto(item.token, item)),
      count: items.length,
    });
  } catch (error) {
    const { status, body } = toErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession(request);

    const body = parseBody(createTokenSchema, await request.json());
    const {
      name,
      symbol,
      decimals,
      adminAddress,
      tokenAddress,
      identityRegistry,
      trustedIssuersRegistry,
      claimTopicsRegistry,
      requiredClaims,
    } = body;

    requireOwner(session, adminAddress, 'el token');

    const created = await repos.tokens.create({
      tokenAddress,
      adminAddress,
      name,
      symbol,
      decimals,
      identityRegistry: identityRegistry.toLowerCase(),
      trustedIssuersRegistry: trustedIssuersRegistry.toLowerCase(),
      claimTopicsRegistry: claimTopicsRegistry.toLowerCase(),
      requiredClaims,
      complianceModules: body.complianceModules,
      complianceAddress: body.complianceAddress ?? undefined,
      description: body.description ?? undefined,
      transactionHash: body.transactionHash ?? undefined,
      blockNumber: body.blockNumber ?? undefined,
    });

    await repos.auditLog.record({
      actorAddress: session.address,
      action: 'token.create',
      resourceType: 'token',
      resourceId: created.id,
      detail: { tokenAddress },
    });

    const withRel = await repos.tokens.findWithRelationsById(created.id);
    if (!withRel) throw new NotFoundError('token', created.id);

    return NextResponse.json(
      {
        success: true,
        data: toTokenDto(withRel.token, withRel),
        message: 'Token registrado',
      },
      { status: 201 },
    );
  } catch (error) {
    const { status, body } = toErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
