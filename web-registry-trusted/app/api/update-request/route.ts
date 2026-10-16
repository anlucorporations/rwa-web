/**
 * API Route for Updating Request Status
 *
 * POST: Approve or reject a claim request (B11).
 *
 * O1.2 (HW-01): solo el emisor destinatario de la solicitud puede resolverla y
 * debe firmar la revisión con su propia wallet. `reviewed_by` es siempre la
 * dirección de la sesión: ya no se acepta `body.reviewedBy` ni se cae al
 * `issuer_address` de la solicitud.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
  repos,
  requireOwner,
  requireSession,
  requireSignature,
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
};

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession(request);

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

    const existing = await repos.claimRequests.findById(requestId);
    if (!existing) {
      throw new NotFoundError('solicitud', requestId);
    }

    requireOwner(session, existing.issuer_address, 'la solicitud');

    if (existing.status !== 'pending') {
      throw new ConflictError('La solicitud ya fue resuelta');
    }

    await requireSignature(
      issuerSignedMessage,
      issuerSignature,
      session.address,
      'la revisión de la solicitud',
    );

    const updated = await repos.claimRequests.review(requestId, {
      status,
      reviewNote,
      issuerSignedMessage,
      issuerSignature,
      reviewedBy: session.address,
    });

    if (!updated) {
      throw new ConflictError('La solicitud ya fue resuelta');
    }

    await repos.auditLog.record({
      actorAddress: session.address,
      action: 'claim.review',
      resourceType: 'claim_request',
      resourceId: requestId,
      detail: { status },
    });

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
