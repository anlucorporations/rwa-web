/**
 * Flujo de certificaciones (CU-04/05/09/10): solicitud, verificación documental
 * y emisión firmada con EIP-712 (esquema `rwa.claim_requests` v3).
 */
import { query } from "@rwa/shared";

import { recordAudit } from "./audit";
import { buildClaimTypedData, claimDataHash, claimUriHash, type ClaimPayload } from "@rwa/shared/claims";
import type { Address, Hex } from "viem";

export type ClaimStatus = "pending" | "documents_verified" | "in_review" | "approved" | "rejected" | "revoked";

export interface ClaimRow {
  id: string;
  identity_id: string;
  issuer_program_id: string;
  credential_type_id: number;
  issuer_id: string | null;
  status: ClaimStatus;
  requester_wallet: string;
  requester_signature: string | null;
  verified_by_wallet: string | null;
  verified_at: Date | null;
  reviewed_by_wallet: string | null;
  reviewed_at: Date | null;
  issuer_signature: string | null;
  tx_hash: string | null;
  metadata: Record<string, unknown>;
  created_at: Date;
  display_alias?: string;
  credential_code?: string;
  program_name?: string;
  program_slug?: string;
}

export interface ClaimDocumentRow {
  id: string;
  claim_request_id: string;
  label: string;
  mime_type: string;
  size_bytes: number;
  sha256: string;
  encrypted_data: Buffer;
  encryption_meta: { nonce?: string };
}

const CLAIM_COLUMNS = `cr.id, cr.identity_id, cr.issuer_program_id, cr.credential_type_id,
  cr.issuer_id, cr.status::text AS status, cr.requester_wallet, cr.requester_signature,
  cr.verified_by_wallet, cr.verified_at, cr.reviewed_by_wallet, cr.reviewed_at,
  cr.issuer_signature, cr.tx_hash, cr.metadata, cr.created_at,
  i.display_alias, ct.code AS credential_code, ip.name AS program_name, ip.slug AS program_slug`;

export async function listClaimsFor(wallet: string): Promise<ClaimRow[]> {
  const { rows } = await query<ClaimRow>(
    `SELECT ${CLAIM_COLUMNS}
       FROM rwa.claim_requests cr
       JOIN rwa.identities i ON i.id = cr.identity_id
       JOIN rwa.credential_types ct ON ct.id = cr.credential_type_id
       JOIN rwa.issuer_programs ip ON ip.id = cr.issuer_program_id
      WHERE lower(cr.requester_wallet) = lower($1)
      ORDER BY cr.created_at DESC`,
    [wallet],
  );
  return rows;
}

export async function getClaim(id: string): Promise<ClaimRow | null> {
  const { rows } = await query<ClaimRow>(
    `SELECT ${CLAIM_COLUMNS}
       FROM rwa.claim_requests cr
       JOIN rwa.identities i ON i.id = cr.identity_id
       JOIN rwa.credential_types ct ON ct.id = cr.credential_type_id
       JOIN rwa.issuer_programs ip ON ip.id = cr.issuer_program_id
      WHERE cr.id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function listReviewQueue(statuses: readonly ClaimStatus[]): Promise<ClaimRow[]> {
  const { rows } = await query<ClaimRow>(
    `SELECT ${CLAIM_COLUMNS}
       FROM rwa.claim_requests cr
       JOIN rwa.identities i ON i.id = cr.identity_id
       JOIN rwa.credential_types ct ON ct.id = cr.credential_type_id
       JOIN rwa.issuer_programs ip ON ip.id = cr.issuer_program_id
      WHERE cr.status::text = ANY($1::text[])
      ORDER BY cr.created_at ASC`,
    [statuses],
  );
  return rows;
}

export interface CreateClaimInput {
  identityId: string;
  requesterWallet: string;
  programSlug: string;
  credentialCode: string;
  requesterSignature: string;
  metadataClaim: Record<string, unknown>;
}

export async function createClaim(input: CreateClaimInput): Promise<ClaimRow> {
  const { rows } = await query<ClaimRow>(
    `WITH ids AS (
        SELECT ip.id AS program_id, ct.id AS credential_id
          FROM rwa.issuer_programs ip
          JOIN rwa.issuer_program_credentials ipc ON ipc.issuer_program_id = ip.id
          JOIN rwa.credential_types ct ON ct.id = ipc.credential_type_id
         WHERE ip.slug = $3 AND ct.code = $4 AND ip.active
     )
     INSERT INTO rwa.claim_requests
        (identity_id, issuer_program_id, credential_type_id, status,
         requester_wallet, requester_signature, metadata)
     SELECT $1, ids.program_id, ids.credential_id, 'pending', $2, $5, $6::jsonb
       FROM ids
     RETURNING id`,
    [
      input.identityId,
      input.requesterWallet,
      input.programSlug,
      input.credentialCode,
      input.requesterSignature,
      JSON.stringify({ requesterRequest: true, claim: input.metadataClaim }),
    ],
  );
  if (!rows[0]) throw new Error("ISSUER o credencial no encontrados");
  const created = await getClaim(rows[0].id);
  if (!created) throw new Error("No se pudo leer la solicitud creada");
  return created;
}

export interface InsertDocumentInput {
  claimRequestId: string;
  label: string;
  mimeType: string;
  sizeBytes: number;
  sha256Hex: string;
  encrypted: Buffer;
  nonceHex: string;
  retentionDeleteAt: string | null;
}

export async function insertDocument(input: InsertDocumentInput): Promise<string> {
  const { rows } = await query<{ id: string }>(
    `INSERT INTO rwa.document_files
       (claim_request_id, label, mime_type, size_bytes, sha256, encrypted_data, encryption_meta, retention_delete_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)
     RETURNING id`,
    [
      input.claimRequestId,
      input.label,
      input.mimeType,
      input.sizeBytes,
      input.sha256Hex,
      input.encrypted,
      JSON.stringify({ algo: "AES-256-GCM", nonce: input.nonceHex }),
      input.retentionDeleteAt,
    ],
  );
  return rows[0].id;
}

/** Operador marca documentos verificados (pending → documents_verified). */
export async function verifyDocuments(claimId: string, operatorWallet: string): Promise<ClaimRow> {
  const { rows } = await query<{ id: string }>(
    `UPDATE rwa.claim_requests
        SET status = 'documents_verified',
            verified_by_wallet = lower($2),
            verified_at = now()
      WHERE id = $1 AND status = 'pending'
      RETURNING id`,
    [claimId, operatorWallet],
  );
  if (!rows[0]) throw Object.assign(new Error("La solicitud no está pendiente"), { code: "CONFLICT" });
  await recordAudit({ actor: operatorWallet, action: "claim.documents_verified", resourceType: "claim", resourceId: claimId });
  const claim = await getClaim(claimId);
  if (!claim) throw new Error("Solicitud no encontrada");
  return claim;
}

export interface IssueClaimInput {
  claimId: string;
  issuerWallet: string;
  issuerId: string;
  issuerSignature: string;
  txHash: string | null;
}

/** Emisor/Admin emite el claim firmado (documents_verified → approved). */
export async function issueClaim(input: IssueClaimInput): Promise<ClaimRow> {
  const { rows } = await query<{ id: string }>(
    `UPDATE rwa.claim_requests
        SET status = 'approved',
            issuer_id = $2,
            issuer_signature = $3,
            reviewed_by_wallet = lower($4),
            reviewed_at = now(),
            tx_hash = $5
      WHERE id = $1 AND status = 'documents_verified'
      RETURNING id`,
    [input.claimId, input.issuerId, input.issuerSignature, input.issuerWallet, input.txHash],
  );
  if (!rows[0]) throw Object.assign(new Error("La solicitud no está verificada"), { code: "CONFLICT" });
  await recordAudit({
    actor: input.issuerWallet,
    action: "claim.issued",
    resourceType: "claim",
    resourceId: input.claimId,
    metadata: { issuerId: input.issuerId, txHash: input.txHash },
  });
  const claim = await getClaim(input.claimId);
  if (!claim) throw new Error("Solicitud no encontrada");
  return claim;
}

export function buildTypedDataFor(claim: ClaimRow): ClaimPayload {
  const claimMeta = (claim.metadata as { claim?: Record<string, unknown> }).claim ?? {};
  const uri = String(claimMeta.uri ?? "");
  return {
    chainId: Number(claimMeta.chainId ?? 31337),
    identityAddress: String(claimMeta.identityAddress ?? claim.requester_wallet) as Address,
    walletOwner: claim.requester_wallet as Address,
    topic: String(claimMeta.topic ?? "0"),
    scheme: 1,
    data: "0x" as Hex,
    uri,
    expiresAt: String(claimMeta.expiresAt ?? "0"),
    nonce: String(claimMeta.nonce ?? "0"),
  };
}

export function typedDataFor(claim: ClaimRow) {
  return buildClaimTypedData(buildTypedDataFor(claim));
}

export async function getDocument(id: string): Promise<ClaimDocumentRow | null> {
  const { rows } = await query<ClaimDocumentRow>(
    `SELECT id, claim_request_id, label, mime_type, size_bytes, sha256, encrypted_data, encryption_meta
       FROM rwa.document_files WHERE id = $1 AND deleted_at IS NULL`,
    [id],
  );
  return rows[0] ?? null;
}

export function claimUriHashFor(uri: string) {
  return claimUriHash(uri);
}

export function claimDataHashFor(data: Hex) {
  return claimDataHash(data);
}
