/**
 * API Route for Batch Issuer Information
 *
 * POST: Get issuer information for multiple addresses (B4).
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  issuersBatchSchema,
  parseBody,
  repos,
  requireSession,
  toErrorResponse,
  toIssuerDto,
  type IssuerDto,
} from '@rwa/shared';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    await requireSession(request);

    const { addresses } = parseBody(issuersBatchSchema, await request.json());

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
    const { status, body } = toErrorResponse(error, request);
    return NextResponse.json(body, { status });
  }
}
