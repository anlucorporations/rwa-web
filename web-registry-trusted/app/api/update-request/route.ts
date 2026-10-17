/**
 * API Route for Updating Request Status
 *
 * POST: Approve or reject a claim request (B11).
 *
 * O1.2 (HW-01): solo el emisor destinatario puede resolverla y `reviewed_by` es la
 * dirección de la sesión.
 *
 * O2.3 (RF-W-10): al **aprobar**, el emisor firma con EIP-712 el claim que el inversor
 * enviará a `IdentityCloneable.addClaim`. El servidor verifica la firma tipada y
 * persiste el payload completo. Al **rechazar** basta la firma EIP-191 del mensaje de
 * revisión (no hay claim on-chain).
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  isAddress,
  repos,
  requireOwner,
  requireSession,
  requireSignature,
  toClaimRequestDto,
  toErrorResponse,
} from '@rwa/shared';
import {
  CLAIM_SCHEME,
  assertClaimPayloadConsistent,
  buildClaimTypedData,
  claimDataHash,
  claimUriHash,
  recoverClaimIssuer,
  type ClaimPayload,
} from '@rwa/shared/claims';
import { CANONICAL_CHAIN_ID } from '@rwa/shared/network';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEX_RE = /^0x[0-9a-fA-F]*$/;

type Hex = `0x${string}`;

type RawClaim = {
  chainId?: unknown;
  identityAddress?: unknown;
  walletOwner?: unknown;
  topic?: unknown;
  scheme?: unknown;
  data?: unknown;
  uri?: unknown;
  expiresAt?: unknown;
  nonce?: unknown;
};

type UpdateRequestBody = {
  requestId?: unknown;
  status?: unknown;
  reviewNote?: unknown;
  issuerSignedMessage?: unknown;
  issuerSignature?: unknown;
  claim?: RawClaim;
  claimSignature?: unknown;
};

function asUintString(value: unknown, field: string): string {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) return String(value);
  if (typeof value === 'string' && /^\d+$/.test(value)) return value;
  throw new ValidationError(`${field} debe ser un entero no negativo`, field);
}

/** Valida el payload EIP-712 recibido del panel de emisor. */
function parseClaimPayload(raw: RawClaim | undefined): ClaimPayload {
  if (!raw || typeof raw !== 'object') {
    throw new ValidationError('Al aprobar se exige el payload EIP-712 del claim', 'claim');
  }
  if (raw.chainId !== CANONICAL_CHAIN_ID) {
    throw new ValidationError(
      `El payload debe firmarse para el chainId canónico ${CANONICAL_CHAIN_ID}`,
      'claim.chainId',
    );
  }
  if (!isAddress(raw.identityAddress)) {
    throw new ValidationError('claim.identityAddress no es una dirección válida', 'claim.identityAddress');
  }
  if (!isAddress(raw.walletOwner)) {
    throw new ValidationError('claim.walletOwner no es una dirección válida', 'claim.walletOwner');
  }
  if (raw.scheme !== CLAIM_SCHEME) {
    throw new ValidationError(`claim.scheme debe ser ${CLAIM_SCHEME}`, 'claim.scheme');
  }
  if (typeof raw.data !== 'string' || !HEX_RE.test(raw.data)) {
    throw new ValidationError('claim.data debe ser hex (0x…)', 'claim.data');
  }
  if (typeof raw.uri !== 'string' || raw.uri.length === 0) {
    throw new ValidationError('claim.uri es obligatorio', 'claim.uri');
  }

  return {
    chainId: raw.chainId,
    identityAddress: raw.identityAddress as Hex,
    walletOwner: raw.walletOwner as Hex,
    topic: asUintString(raw.topic, 'claim.topic'),
    scheme: raw.scheme,
    data: raw.data as Hex,
    uri: raw.uri,
    expiresAt: asUintString(raw.expiresAt, 'claim.expiresAt'),
    nonce: asUintString(raw.nonce, 'claim.nonce'),
  };
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession(request);

    const raw = (await request.json()) as unknown;
    const body = (raw ?? {}) as UpdateRequestBody;
    const { requestId, status, issuerSignedMessage, issuerSignature, claimSignature } = body;

    if (typeof requestId !== 'string' || !UUID_RE.test(requestId)) {
      throw new ValidationError('id inválido', 'id');
    }
    if (status !== 'approved' && status !== 'rejected') {
      throw new ValidationError('status debe ser "approved" o "rejected"', 'status');
    }

    const reviewNote = typeof body.reviewNote === 'string' ? body.reviewNote : undefined;

    const existing = await repos.claimRequests.findById(requestId);
    if (!existing) {
      throw new NotFoundError('solicitud', requestId);
    }

    // Solo el emisor destinatario puede resolverla (HW-01).
    requireOwner(session, existing.issuer_address, 'la solicitud');

    if (existing.status !== 'pending') {
      throw new ConflictError('La solicitud ya fue resuelta');
    }

    let updated;

    if (status === 'approved') {
      // --- O2.3: claim firmado con EIP-712 ---
      if (typeof claimSignature !== 'string' || !HEX_RE.test(claimSignature)) {
        throw new ValidationError('Al aprobar se exige claimSignature (EIP-712)', 'claimSignature');
      }
      const payload = parseClaimPayload(body.claim);
      assertClaimPayloadConsistent(
        payload,
        { requesterAddress: existing.requester_address, topic: existing.claim_topic_id },
        CANONICAL_CHAIN_ID,
      );

      const typedData = buildClaimTypedData(payload);
      const signer = await recoverClaimIssuer(typedData, claimSignature as Hex);
      if (signer.toLowerCase() !== session.address) {
        throw new ForbiddenError('La firma EIP-712 del claim no corresponde a la sesión del emisor');
      }

      updated = await repos.claimRequests.review(requestId, {
        status,
        reviewNote,
        reviewedBy: session.address,
        claim: {
          identityAddress: payload.identityAddress,
          chainId: payload.chainId,
          walletOwner: payload.walletOwner,
          nonce: payload.nonce,
          expiresAt: payload.expiresAt,
          scheme: payload.scheme,
          data: payload.data,
          uri: payload.uri,
          uriHash: claimUriHash(payload.uri),
          dataHash: claimDataHash(payload.data),
          signature: claimSignature,
        },
      });
    } else {
      // --- Rechazo: firma EIP-191 del mensaje de revisión (O1.2) ---
      if (typeof issuerSignedMessage !== 'string' || issuerSignedMessage.length === 0) {
        throw new ValidationError('issuerSignedMessage es obligatorio', 'issuerSignedMessage');
      }
      if (typeof issuerSignature !== 'string' || issuerSignature.length === 0) {
        throw new ValidationError('issuerSignature es obligatorio', 'issuerSignature');
      }
      await requireSignature(
        issuerSignedMessage,
        issuerSignature,
        session.address,
        'la revisión de la solicitud',
      );

      updated = await repos.claimRequests.review(requestId, {
        status,
        reviewNote,
        reviewedBy: session.address,
        issuerSignedMessage,
        issuerSignature,
      });
    }

    if (!updated) {
      throw new ConflictError('La solicitud ya fue resuelta');
    }

    await repos.auditLog.record({
      actorAddress: session.address,
      action: 'claim.review',
      resourceType: 'claim_request',
      resourceId: requestId,
      detail: { status, scheme: status === 'approved' ? CLAIM_SCHEME : undefined },
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
