/**
 * Diagnostic API for stored documents (`rwa.document_files`) and claim requests.
 */

import { NextRequest, NextResponse } from 'next/server';
import { repos, toErrorResponse, debugEndpointsEnabled, NotFoundError } from '@rwa/shared';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(_request: NextRequest) {
  try {
    if (!debugEndpointsEnabled()) {
      throw new NotFoundError('endpoint', 'test-gridfs');
    }

    const [files, totalFiles, requests] = await Promise.all([
      repos.documentFiles.list({ limit: 200 }),
      repos.documentFiles.count(),
      repos.claimRequests.list({ limit: 200 }),
    ]);

    return NextResponse.json({
      success: true,
      totalFiles,
      files: files.map((f) => ({
        id: f.id,
        filename: f.original_name,
        contentType: f.content_type,
        size: Number(f.size_bytes),
        uploadedAt: f.created_at,
      })),
      totalRequests: requests.length,
      requests: requests.map((r) => ({
        _id: r.id,
        requesterAddress: r.requester_address,
        issuerAddress: r.issuer_address,
        claimTopic: String(r.claim_topic_id),
        status: r.status,
      })),
    });
  } catch (error) {
    const { status, body } = toErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
