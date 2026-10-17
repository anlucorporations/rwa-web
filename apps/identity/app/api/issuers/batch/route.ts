/**
 * API Route for Batch Issuer Information
 *
 * POST: Get issuer information for multiple addresses
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  issuersBatchSchema,
  parseBody,
  repos,
  toIssuerDto,
  toErrorResponse,
  requireSession,
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
    const { status, body } = toErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
