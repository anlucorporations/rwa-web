/**
 * API Route for Document Upload
 *
 * POST: Upload a document file linked to an existing claim request.
 * Stored in `rwa.document_files` (bytea) via `@rwa/shared`.
 */

import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  repos,
  toErrorResponse,
  requireSession,
  requireOwner,
  assertAllowedUpload,
  parseBody,
  uuidSchema,
  ValidationError,
  NotFoundError,
} from '@rwa/shared';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_SIZE = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession(request);
    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      throw new ValidationError('file es obligatorio', 'file');
    }

    const claimRequestId = parseBody(uuidSchema, formData.get('claimRequestId'));

    const claim = await repos.claimRequests.findById(claimRequestId);
    if (!claim) {
      throw new NotFoundError('solicitud', claimRequestId);
    }

    requireOwner(session, claim.requester_address, 'la solicitud');

    const size = file.size;
    if (size <= 0 || size > MAX_SIZE) {
      throw new ValidationError('tamaño de fichero inválido (máx. 10 MB)', 'file');
    }

    const content = Buffer.from(await file.arrayBuffer());
    const contentType = assertAllowedUpload(content, file.type);
    const sha256 = createHash('sha256').update(content).digest();

    const doc = await repos.documentFiles.create({
      claimRequestId,
      originalName: file.name,
      contentType,
      sizeBytes: size,
      sha256,
      content,
      encryptionAlgo: 'none',
      encryptionNonce: null,
      uploadedBy: session.address,
    });

    await repos.auditLog.record({
      actorAddress: session.address,
      action: 'document.upload',
      resourceType: 'document_file',
      resourceId: doc.id,
      detail: { claimRequestId, sizeBytes: size, contentType },
    });

    return NextResponse.json({
      success: true,
      data: {
        fileId: doc.id,
        filename: doc.original_name,
        contentType: doc.content_type,
        size: Number(doc.size_bytes),
        uploadedAt: doc.created_at,
      },
    });
  } catch (error) {
    const { status, body } = toErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
