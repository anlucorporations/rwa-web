/**
 * Repositorio de `rwa.claim_requests`.
 *
 * Cubre el listado (B1/B8), la creación (B2) y la revisión (B11) del inventario
 * heredado, ya sobre PostgreSQL y con `reviewed_by` obligatorio en la revisión
 * (lo exige el CHECK `claim_requests_review_consistency`).
 */

import { normalizeAddress, normalizeAddressOrUndefined } from '../address';
import { ValidationError } from '../../errors';
import { query } from '../pool';
import { translatePgError } from '../pg-errors';
import type { ClaimRequestRow, ClaimRequestStatus, ClaimRequestSummaryRow } from '../types';

const COLUMNS =
  'id, requester_address, issuer_address, claim_topic_id, message, status, ' +
  'signed_message, signature, review_note, issuer_signed_message, issuer_signature, ' +
  'reviewed_by, reviewed_at, identity_address, claim_chain_id, claim_scheme, ' +
  'claim_wallet_owner, claim_nonce, claim_expires_at, claim_data, claim_uri, ' +
  'claim_uri_hash, claim_data_hash, claim_signature, created_at, updated_at';

const SUMMARY_COLUMNS =
  'id, requester_address, issuer_address, issuer_name, claim_topic_id, claim_topic_name, ' +
  'status, created_at, reviewed_at, reviewed_by, document_count';

export type ClaimRequestFilter = {
  requesterAddress?: string;
  issuerAddress?: string;
  status?: ClaimRequestStatus;
  limit?: number;
  offset?: number;
};

export type CreateClaimRequestInput = {
  requesterAddress: string;
  issuerAddress: string;
  claimTopicId: number;
  message?: string | null;
  signedMessage: string;
  signature: string;
};

/** Payload EIP-712 firmado por el emisor (O2.3). Solo para `status = 'approved'`. */
export type ClaimPayloadFields = {
  identityAddress: string;
  chainId: number;
  walletOwner: string;
  nonce: string;
  expiresAt: string;
  scheme: number;
  data: string;
  uri: string;
  uriHash: string;
  dataHash: string;
  signature: string;
};

export type ReviewClaimRequestInput = {
  status: Extract<ClaimRequestStatus, 'approved' | 'rejected'>;
  reviewNote?: string | null;
  /** Dirección del emisor que revisa; el CHECK del esquema la exige al resolver. */
  reviewedBy: string;
  /** Obligatorio al aprobar: el claim firmado con EIP-712 que el inversor enviará a `addClaim`. */
  claim?: ClaimPayloadFields;
  /** Firma EIP-191 del mensaje de revisión (solo rechazos; el alta exige EIP-712). */
  issuerSignedMessage?: string;
  issuerSignature?: string;
};

function buildWhere(filter: ClaimRequestFilter): { clause: string; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];

  const requester = normalizeAddressOrUndefined(filter.requesterAddress);
  if (requester) {
    params.push(requester);
    conditions.push(`requester_address = $${params.length}`);
  }
  const issuer = normalizeAddressOrUndefined(filter.issuerAddress);
  if (issuer) {
    params.push(issuer);
    conditions.push(`issuer_address = $${params.length}`);
  }
  if (filter.status) {
    params.push(filter.status);
    conditions.push(`status = $${params.length}`);
  }

  return {
    clause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    params,
  };
}

function pagination(filter: ClaimRequestFilter, params: unknown[]): string {
  const limit = Math.min(Math.max(filter.limit ?? 100, 1), 500);
  const offset = Math.max(filter.offset ?? 0, 0);
  params.push(limit, offset);
  return `LIMIT $${params.length - 1} OFFSET $${params.length}`;
}

export class ClaimRequestsRepository {
  /** Listado directo de la tabla (equivalente a B1/B8). */
  async list(filter: ClaimRequestFilter = {}): Promise<ClaimRequestRow[]> {
    const { clause, params } = buildWhere(filter);
    const tail = pagination(filter, params);
    const { rows } = await query<ClaimRequestRow>(
      `SELECT ${COLUMNS} FROM rwa.claim_requests ${clause} ORDER BY created_at DESC ${tail}`,
      params,
    );
    return rows;
  }

  /** Listado enriquecido desde la vista (nombre del emisor, del topic y nº de documentos). */
  async listSummary(filter: ClaimRequestFilter = {}): Promise<ClaimRequestSummaryRow[]> {
    const { clause, params } = buildWhere(filter);
    const tail = pagination(filter, params);
    const { rows } = await query<ClaimRequestSummaryRow>(
      `SELECT ${SUMMARY_COLUMNS} FROM rwa.v_claim_request_summary ${clause} ORDER BY created_at DESC ${tail}`,
      params,
    );
    return rows;
  }

  async findById(id: string): Promise<ClaimRequestRow | null> {
    const { rows } = await query<ClaimRequestRow>(
      `SELECT ${COLUMNS} FROM rwa.claim_requests WHERE id = $1`,
      [id],
    );
    return rows[0] ?? null;
  }

  /** Alta de solicitud; `status` queda en `pending` por defecto del esquema. */
  async create(input: CreateClaimRequestInput): Promise<ClaimRequestRow> {
    const requester = normalizeAddress(input.requesterAddress, 'requesterAddress');
    const issuer = normalizeAddress(input.issuerAddress, 'issuerAddress');
    try {
      const { rows } = await query<ClaimRequestRow>(
        `INSERT INTO rwa.claim_requests
           (requester_address, issuer_address, claim_topic_id, message, signed_message, signature)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING ${COLUMNS}`,
        [requester, issuer, input.claimTopicId, input.message ?? null, input.signedMessage, input.signature],
      );
      return rows[0];
    } catch (error) {
      translatePgError(error, 'No se pudo crear la solicitud');
    }
  }

  /**
   * Resolución de la solicitud. Devuelve `null` si no existe o si ya estaba resuelta.
   *
   * `WHERE status = 'pending'` implementa la **idempotencia** de O1.2: una segunda
   * revisión (o una carrera entre dos emisores) no puede sobrescribir la primera.
   * La verificación criptográfica de la firma la hace la ruta con `requireSignature`.
   */
  async review(id: string, input: ReviewClaimRequestInput): Promise<ClaimRequestRow | null> {
    const reviewedBy = normalizeAddress(input.reviewedBy, 'reviewedBy');
    const claim = input.claim;
    if (input.status === 'approved' && !claim) {
      throw new ValidationError('Al aprobar se exige el payload EIP-712 firmado por el emisor', 'claim');
    }
    if (!claim && !input.issuerSignature) {
      throw new ValidationError('Una revisión necesita una firma del emisor', 'issuerSignature');
    }

    try {
      const { rows } = await query<ClaimRequestRow>(
        `UPDATE rwa.claim_requests
            SET status = $2,
                review_note = $3,
                issuer_signed_message = $4,
                issuer_signature = $5,
                reviewed_by = $6,
                reviewed_at = now(),
                identity_address = $7,
                claim_chain_id = $8,
                claim_scheme = $9,
                claim_wallet_owner = $10,
                claim_nonce = $11,
                claim_expires_at = $12,
                claim_data = $13,
                claim_uri = $14,
                claim_uri_hash = $15,
                claim_data_hash = $16,
                claim_signature = $17
          WHERE id = $1
            AND status = 'pending'
          RETURNING ${COLUMNS}`,
        [
          id,
          input.status,
          input.reviewNote ?? null,
          claim ? JSON.stringify(claim) : (input.issuerSignedMessage ?? null),
          claim ? claim.signature : (input.issuerSignature ?? null),
          reviewedBy,
          claim ? normalizeAddress(claim.identityAddress, 'claim.identityAddress') : null,
          claim ? claim.chainId : null,
          claim ? claim.scheme : 1,
          claim ? normalizeAddress(claim.walletOwner, 'claim.walletOwner') : null,
          claim ? claim.nonce : null,
          claim ? claim.expiresAt : null,
          claim ? claim.data : null,
          claim ? claim.uri : null,
          claim ? claim.uriHash : null,
          claim ? claim.dataHash : null,
          claim ? claim.signature : null,
        ],
      );
      return rows[0] ?? null;
    } catch (error) {
      translatePgError(error, 'No se pudo resolver la solicitud');
    }
  }

  async countByStatus(): Promise<Record<ClaimRequestStatus, number>> {
    const { rows } = await query<{ status: ClaimRequestStatus; total: string }>(
      'SELECT status, count(*)::text AS total FROM rwa.claim_requests GROUP BY status',
    );
    const result: Record<ClaimRequestStatus, number> = { pending: 0, approved: 0, rejected: 0 };
    for (const row of rows) result[row.status] = Number(row.total);
    return result;
  }
}
