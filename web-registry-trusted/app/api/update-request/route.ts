/**
 * API Route for Updating Request Status
 *
 * POST: Approve or reject a claim request (B11).
 *
 * El CHECK `claim_requests_review_consistency` exige `reviewed_by` NOT NULL al
 * resolver; mientras la recuperación de la address desde la firma sea O1.2, se
 * acepta `body.reviewedBy` o se usa el `issuer_address` de la solicitud.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  NotFoundError,
  ValidationError,
  isAddress,
  repos,
  toClaimRequestDto,
  toErrorResponse,
} from '@rwa/shared';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type UpdateRequestBody = {
  requestId?: unknown;
  status?: unknown;
  reviewNote?: unknown;
  issuerSignedMessage?: unknown;
  issuerSignature?: unknown;
  reviewedBy?: unknown;
};

export async function POST(request: NextRequest) {
  try {
    const raw = (await request.json()) as unknown;
    const body = (raw ?? {}) as UpdateRequestBody;
    const { requestId, status, issuerSignedMessage, issuerSignature } = body;

    if (typeof requestId !== 'string' || !UUID_RE.test(requestId)) {
      throw new ValidationError('id inválido', 'id');
    }

    if (status !== 'approved' && status !== 'rejected') {
      throw new ValidationError('status debe ser "approved" o "rejected"', 'status');
    }

    if (typeof issuerSignedMessage !== 'string' || issuerSignedMessage.length === 0) {
      throw new ValidationError('issuerSignedMessage es obligatorio', 'issuerSignedMessage');
    }

    if (typeof issuerSignature !== 'string' || issuerSignature.length === 0) {
      throw new ValidationError('issuerSignature es obligatorio', 'issuerSignature');
    }

    const reviewNote = typeof body.reviewNote === 'string' ? body.reviewNote : undefined;

    let reviewedBy: string;
    if (typeof body.reviewedBy === 'string' && isAddress(body.reviewedBy)) {
      reviewedBy = body.reviewedBy;
    } else {
      const existing = await repos.claimRequests.findById(requestId);
      if (!existing) {
        throw new NotFoundError('solicitud', requestId);
      }
      reviewedBy = existing.issuer_address;
    }

    const updated = await repos.claimRequests.review(requestId, {
      status,
      reviewNote,
      issuerSignedMessage,
      issuerSignature,
      reviewedBy,
    });

    if (!updated) {
      throw new NotFoundError('solicitud', requestId);
    }

    return NextResponse.json({
      success: true,
      data: toClaimRequestDto(updated, null),
      message: 'Request updated',
    });
  } catch (error) {
    const { status, body } = toErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
