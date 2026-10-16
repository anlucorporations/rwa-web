/**
 * API Route for Batch Issuer Information
 *
 * POST: Get issuer information for multiple addresses (B4).
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  ValidationError,
  repos,
  toErrorResponse,
  toIssuerDto,
  type IssuerDto,
} from '@rwa/shared';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_ADDRESSES = 200;

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

export async function POST(request: NextRequest) {
  try {
    const raw = (await request.json()) as unknown;
    const addresses = ((raw ?? {}) as { addresses?: unknown }).addresses;

    if (!isStringArray(addresses) || addresses.length === 0) {
      throw new ValidationError('addresses debe ser un array no vacío', 'addresses');
    }

    if (addresses.length > MAX_ADDRESSES) {
      throw new ValidationError(
        `addresses no puede superar ${MAX_ADDRESSES} elementos`,
        'addresses',
      );
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
