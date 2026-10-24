/**
 * API Route for Document Upload
 *
 * POST: Upload a document file linked to an existing claim request.
 * Stored in `rwa.document_files` (bytea) via `@rwa/shared`.
 *
 * RF-W-05 / HW-02: además del límite de tamaño, se aplican una **tasa por
 * wallet** (subidas/hora) y una **cuota de almacenamiento** acumulada. Los
 * contadores salen de `audit_log` y `document_files` (no hace falta una tabla
 * nueva ni estado en memoria, por lo que funciona con varias instancias).
 */

import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  repos,
  toErrorResponse,
  requireSession,
  requireOwner,
  assertAllowedUpload,
  evaluateUploadLimits,
  formatMb,
  getRequestId,
  parseBody,
  readUploadLimitPolicy,
  uuidSchema,
  ValidationError,
  NotFoundError,
  RateLimitError,
  encryptDocument,
} from '@rwa/shared';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ONE_HOUR_MS = 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession(request);
    const requestId = getRequestId(request);
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

    const policy = readUploadLimitPolicy();
    const size = file.size;
    if (size <= 0 || size > policy.maxFileBytes) {
      throw new ValidationError(
        `tamaño de fichero inválido (máx. ${formatMb(policy.maxFileBytes)})`,
        'file',
      );
    }

    const [uploadsLastHour, storedBytes] = await Promise.all([
      repos.auditLog.countByActorActionSince(
        session.address,
        'document.upload',
        new Date(Date.now() - ONE_HOUR_MS),
      ),
      repos.documentFiles.sumSizeByUploader(session.address),
    ]);

    const decision = evaluateUploadLimits({ sizeBytes: size, uploadsLastHour, storedBytes, policy });
    if (!decision.allowed) {
      throw new RateLimitError(decision.message);
    }

    const content = Buffer.from(await file.arrayBuffer());
    const contentType = assertAllowedUpload(content, file.type);
    const sha256 = createHash('sha256').update(content).digest();

    // O5.4/D-093: el binario se guarda cifrado (AES-256-GCM); sha256 y tamaño
    // corresponden al texto plano para verificar integridad y Content-Length.
    const encrypted = encryptDocument(content);

    const doc = await repos.documentFiles.create({
      claimRequestId,
      originalName: file.name,
      contentType,
      sizeBytes: size,
      sha256,
      content: encrypted.content,
      encryptionAlgo: encrypted.algo,
      encryptionNonce: encrypted.nonce,
      uploadedBy: session.address,
    });

    await repos.auditLog.record({
      actorAddress: session.address,
      action: 'document.upload',
      resourceType: 'document_file',
      resourceId: doc.id,
      requestId,
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
    const { status, body } = toErrorResponse(error, request);
    return NextResponse.json(body, { status });
  }
}
