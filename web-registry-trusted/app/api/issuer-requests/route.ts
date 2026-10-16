/**
 * API Route for Issuer Requests
 *
 * GET: Get claim requests for a specific issuer (equivalente a B8, ya sobre PostgreSQL).
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  ValidationError,
  repos,
  toClaimRequestDto,
  toErrorResponse,
  type ClaimRequestStatus,
  type DocumentFileMetaRow,
} from '@rwa/shared';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function parseStatus(value: string | null): ClaimRequestStatus | undefined {
  if (value === 'pending' || value === 'approved' || value === 'rejected') {
    return value;
  }
  return undefined;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const issuerAddress = searchParams.get('issuerAddress');

    if (!issuerAddress) {
      throw new ValidationError('issuerAddress es obligatorio', 'issuerAddress');
    }

    const status = parseStatus(searchParams.get('status'));

    const rows = await repos.claimRequests.list({ issuerAddress, status });
    const docs = await repos.documentFiles.listByClaimRequestIds(rows.map((row) => row.id));

    // El contrato heredado expone un único documento por solicitud: se usa el primero
    // (listByClaimRequestIds ya ordena por created_at ASC).
    const documentByRequest = new Map<string, DocumentFileMetaRow>();
    for (const doc of docs) {
      if (!documentByRequest.has(doc.claim_request_id)) {
        documentByRequest.set(doc.claim_request_id, doc);
      }
    }

    const data = rows.map((row) => toClaimRequestDto(row, documentByRequest.get(row.id) ?? null));

    return NextResponse.json({
      success: true,
      data,
      count: data.length,
    });
  } catch (error) {
    const { status, body } = toErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
