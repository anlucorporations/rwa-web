/**
 * API Route for File Download from PostgreSQL `rwa.document_files`.
 *
 * GET: Download a file by its ID (binary `bytea` column, sustituye GridFS).
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
  attachmentDisposition,
  decryptDocument,
  repos,
  requireSession,
  toErrorResponse,
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

    const isRequester = session.address === claim.requester_address;
    const isIssuer = session.address === claim.issuer_address;
    if (!isRequester && !isIssuer) {
      throw new ForbiddenError('No autorizado a descargar este documento');
    }

    await repos.auditLog.record({
      actorAddress: session.address,
      action: 'document.download',
      resourceType: 'document_file',
      resourceId: file.id,
      detail: { claimRequestId: file.claim_request_id },
    });

    // `Buffer` no satisface `BodyInit` en el lib DOM: se copia a un `Uint8Array`.
    // O5.4: el contenido está cifrado en reposo; se descifra solo tras autorizar.
    const plaintext = decryptDocument({
      content: file.content,
      encryptionAlgo: file.encryption_algo,
      encryptionNonce: file.encryption_nonce,
    });

    return new NextResponse(new Uint8Array(plaintext), {
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
