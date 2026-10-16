/**
 * API Route for Document Download
 *
 * GET: Download a document by its id from `rwa.document_files` (bytea).
 *
 * Keeps the legacy `inline` behaviour; authorization by ownership is O1.
 */

import { NextRequest, NextResponse } from 'next/server';
import { repos, toErrorResponse, ValidationError, NotFoundError } from '@rwa/shared';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  request: NextRequest,
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
