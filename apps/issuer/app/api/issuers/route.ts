/**
 * API Route for Issuers
 *
 * POST: Save or update issuer information (name)  (B9)
 * GET:  Get issuer information by address        (B10)
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  issuerNameSchema,
  parseBody,
  ValidationError,
  repos,
  requireOwner,
  requireSession,
  toErrorResponse,
  toIssuerDto,
} from '@rwa/shared';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession(request);

    const { address, name } = parseBody(issuerNameSchema, await request.json());

    requireOwner(session, address, 'el registro del emisor');

    const { issuer, created } = await repos.issuers.upsertName(address, name);

    await repos.auditLog.record({
      actorAddress: session.address,
      action: 'issuer.upsert',
      resourceType: 'issuer',
      resourceId: issuer.address,
      detail: { created },
    });

    return NextResponse.json({
      success: true,
      data: {
        address: issuer.address,
        name: issuer.name,
      },
      created,
    });
  } catch (error) {
    const { status, body } = toErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession(request);

    const address = request.nextUrl.searchParams.get('address');

    if (!address) {
      throw new ValidationError('address es obligatorio', 'address');
    }

    const issuer = await repos.issuers.findByAddress(address);

    return NextResponse.json({
      success: true,
      data: issuer ? toIssuerDto(issuer) : null,
    });
  } catch (error) {
    const { status, body } = toErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
