/**
 * API Route for Document Download
 *
 * GET: Download a document by its id from `rwa.document_files` (bytea).
 *
 * Only the requester or the issuer of the linked claim request may download it.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  repos,
  toErrorResponse,
  requireSession,
  attachmentDisposition,
  ForbiddenError,
  ValidationError,
  NotFoundError,
} from '@rwa/shared';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> },
) {
  try {
    const session = await requireSession(request);
    const { fileId } = await params;

    if (!UUID_RE.test(fileId)) {
      throw new ValidationError('id inválido', 'id');
    }

    const file = await repos.documentFiles.findById(fileId);
    if (!file) {
      throw new NotFoundError('documento', fileId);
    }

    const claim = await repos.claimRequests.findById(file.claim_request_id);
    if (!claim) {
      throw new NotFoundError('solicitud', file.claim_request_id);
    }

    if (
      session.address !== claim.requester_address &&
      session.address !== claim.issuer_address
    ) {
      throw new ForbiddenError('No autorizado a descargar este documento');
    }

    await repos.auditLog.record({
      actorAddress: session.address,
      action: 'document.download',
      resourceType: 'document_file',
      resourceId: file.id,
      detail: { claimRequestId: file.claim_request_id },
    });

    return new NextResponse(new Uint8Array(file.content), {
      headers: {
        'Content-Type': file.content_type,
        'Content-Length': file.size_bytes,
        'Content-Disposition': attachmentDisposition(file.original_name),
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    const { status, body } = toErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
