/**
 * API Route for File Download from PostgreSQL `rwa.document_files`.
 *
 * GET: Download a file by its ID (binary `bytea` column, sustituye GridFS).
 */

import { NextRequest, NextResponse } from 'next/server';
import { NotFoundError, ValidationError, repos, toErrorResponse } from '@rwa/shared';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> },
) {
  try {
    const { fileId } = await params;

    if (!UUID_RE.test(fileId)) {
      throw new ValidationError('id inválido', 'id');
    }

    const file = await repos.documentFiles.findById(fileId);
    if (!file) {
      throw new NotFoundError('documento', fileId);
    }

    // `Buffer` no satisface `BodyInit` en el lib DOM: se copia a un `Uint8Array`.
    return new NextResponse(new Uint8Array(file.content), {
      headers: {
        'Content-Type': file.content_type,
        'Content-Length': file.size_bytes,
        'Content-Disposition': `inline; filename="${file.original_name}"`,
      },
    });
  } catch (error) {
    const { status, body } = toErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
