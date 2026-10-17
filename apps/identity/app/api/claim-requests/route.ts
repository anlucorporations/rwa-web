/**
 * API Route for Claim Requests
 *
 * GET: List claim requests (optionally filtered by requester, issuer or status)
 * POST: Create a new claim request
 *
 * PostgreSQL-backed via `@rwa/shared` (schema `rwa`). The document (if any) is
 * linked afterwards through `POST /api/upload` using the created claim request id.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  repos,
  toClaimRequestDto,
  toErrorResponse,
  requireSession,
  requireOwner,
  ForbiddenError,
  ValidationError,
  type ClaimRequestStatus,
} from '@rwa/shared';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CLAIM_STATUSES: readonly ClaimRequestStatus[] = ['pending', 'approved', 'rejected'];

function parseStatus(value: string | null): ClaimRequestStatus | undefined {
  if (value === null) return undefined;
  if (!CLAIM_STATUSES.includes(value as ClaimRequestStatus)) {
    throw new ValidationError(`status inválido: ${value}`, 'status');
  }
  return value as ClaimRequestStatus;
}

type CreateClaimRequestBody = {
  requesterAddress?: string;
  issuerAddress?: string;
  claimTopic?: string | number;
  message?: string | null;
  signedMessage?: string;
  signature?: string;
};

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession(request);
    const searchParams = request.nextUrl.searchParams;
    let requesterAddress = searchParams.get('requesterAddress') ?? undefined;
    const issuerAddress = searchParams.get('issuerAddress') ?? undefined;
    const status = parseStatus(searchParams.get('status'));

    if (requesterAddress !== undefined) {
      if (requesterAddress.toLowerCase() !== session.address) {
        throw new ForbiddenError('Solo puedes consultar tus propias solicitudes');
      }
    } else if (issuerAddress !== undefined) {
      if (issuerAddress.toLowerCase() !== session.address) {
        throw new ForbiddenError('Solo puedes consultar las solicitudes dirigidas a tu dirección');
      }
    } else {
      requesterAddress = session.address;
    }

    const rows = await repos.claimRequests.list({ requesterAddress, issuerAddress, status });

    const docs = await repos.documentFiles.listByClaimRequestIds(rows.map((r) => r.id));
    const firstDocByClaim = new Map<string, (typeof docs)[number]>();
    for (const doc of docs) {
      if (!firstDocByClaim.has(doc.claim_request_id)) {
        firstDocByClaim.set(doc.claim_request_id, doc);
      }
    }

    const data = rows.map((row) => toClaimRequestDto(row, firstDocByClaim.get(row.id) ?? null));

    return NextResponse.json({
      success: true,
      data,
      count: data.length,
    });
  } catch (error) {
    const { status, body } = toErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession(request);
    const body = (await request.json()) as CreateClaimRequestBody;

    if (
      !body.requesterAddress ||
      !body.issuerAddress ||
      body.claimTopic === undefined ||
      body.claimTopic === null ||
      !body.signedMessage ||
      !body.signature
    ) {
      throw new ValidationError(
        'requesterAddress, issuerAddress, claimTopic, signedMessage y signature son obligatorios',
      );
    }

    requireOwner(session, body.requesterAddress, 'la solicitud');

    const topic = await repos.claimTopics.resolve(body.claimTopic);
    if (!topic) {
      throw new ValidationError('claimTopic inválido', 'claimTopic');
    }

    const row = await repos.claimRequests.create({
      requesterAddress: body.requesterAddress,
      issuerAddress: body.issuerAddress,
      claimTopicId: topic.id,
      message: body.message ?? null,
      signedMessage: body.signedMessage,
      signature: body.signature,
    });

    await repos.auditLog.record({
      actorAddress: session.address,
      action: 'claim.create',
      resourceType: 'claim_request',
      resourceId: row.id,
      detail: { topicId: topic.id },
    });

    return NextResponse.json(
      {
        success: true,
        data: toClaimRequestDto(row, null),
        message: 'Claim request created',
      },
      { status: 201 },
    );
  } catch (error) {
    const { status, body } = toErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
