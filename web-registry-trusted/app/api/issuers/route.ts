/**
 * API Route for Issuers
 *
 * POST: Save or update issuer information (name)  (B9)
 * GET:  Get issuer information by address        (B10)
 */

import { NextRequest, NextResponse } from 'next/server';
import { ValidationError, repos, toErrorResponse, toIssuerDto } from '@rwa/shared';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type IssuerBody = { address?: unknown; name?: unknown };

export async function POST(request: NextRequest) {
  try {
    const raw = (await request.json()) as unknown;
    const { address, name } = ((raw ?? {}) as IssuerBody);

    if (typeof address !== 'string' || address.length === 0) {
      throw new ValidationError('address es obligatorio', 'address');
    }

    if (typeof name !== 'string' || name.trim().length === 0) {
      throw new ValidationError('name es obligatorio', 'name');
    }

    const { issuer, created } = await repos.issuers.upsertName(address, name.trim());

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
