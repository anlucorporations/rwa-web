/**
 * API Route for Document Upload
 *
 * POST: Upload a document file linked to an existing claim request.
 * Stored in `rwa.document_files` (bytea) via `@rwa/shared`.
 */

import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { repos, toErrorResponse, ValidationError, NotFoundError } from '@rwa/shared';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_SIZE = 10 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const claimRequestId = formData.get('claimRequestId');

    if (!(file instanceof File)) {
      throw new ValidationError('file es obligatorio', 'file');
    }

    if (typeof claimRequestId !== 'string' || !UUID_RE.test(claimRequestId)) {
      throw new ValidationError(
        'claimRequestId es obligatorio (sube el documento después de crear la solicitud)',
        'claimRequestId',
      );
    }

    const claim = await repos.claimRequests.findById(claimRequestId);
    if (!claim) {
      throw new NotFoundError('solicitud', claimRequestId);
    }

    const size = file.size;
    if (size <= 0 || size > MAX_SIZE) {
      throw new ValidationError('tamaño de fichero inválido (máx. 10 MB)', 'file');
    }

    const contentType = file.type === 'image/jpg' ? 'image/jpeg' : file.type;
    if (!ALLOWED_TYPES.has(contentType)) {
      throw new ValidationError('tipo de fichero no permitido', 'file');
    }

    const content = Buffer.from(await file.arrayBuffer());
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
      uploadedBy: claim.requester_address,
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
