/**
 * API Route for Batch Issuer Information
 *
 * POST: Get issuer information for multiple addresses
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  repos,
  toIssuerDto,
  toErrorResponse,
  requireSession,
  ValidationError,
  type IssuerDto,
} from '@rwa/shared';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_ADDRESSES = 200;

export async function POST(request: NextRequest) {
  try {
    await requireSession(request);
    const body = (await request.json()) as { addresses?: unknown };
    const { addresses } = body;

    if (!Array.isArray(addresses) || addresses.length === 0) {
      throw new ValidationError('addresses es obligatorio (array no vacío)', 'addresses');
    }

    if (addresses.length > MAX_ADDRESSES) {
      throw new ValidationError(`máximo ${MAX_ADDRESSES} direcciones por petición`, 'addresses');
    }

    if (!addresses.every((address): address is string => typeof address === 'string')) {
      throw new ValidationError('addresses debe contener solo strings', 'addresses');
    }

    const rows = await repos.issuers.findByAddresses(addresses);

    const data: Record<string, IssuerDto> = {};
    for (const row of rows) {
      data[row.address] = toIssuerDto(row);
    }

    return NextResponse.json({
      success: true,
      data,
      count: rows.length,
    });
  } catch (error) {
    const { status, body } = toErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
