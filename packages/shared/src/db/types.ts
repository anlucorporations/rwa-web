/**
 * Tipos de fila del esquema PostgreSQL `rwa`.
 *
 * Reflejan literalmente `RepoTecnico/base_datos.sql` (columnas en snake_case tal
 * como las devuelve `pg`). `bigint` y `numeric` llegan como `string`; se anotan así
 * para no perder precisión.
 *
 * Se usan alias de tipo (no `interface`) para que satisfagan la restricción
 * `QueryResultRow` de `pg`.
 */

export type ClaimRequestStatus = 'pending' | 'approved' | 'rejected';
export type SessionRole = 'investor' | 'issuer' | 'admin';

export type ClaimTopicRow = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  active: boolean;
  created_at: Date;
};

export type IssuerRow = {
  id: string;
  address: string;
  name: string;
  verified: boolean;
  verified_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export type ClaimRequestRow = {
  id: string;
  requester_address: string;
  issuer_address: string;
  claim_topic_id: number;
  message: string | null;
  status: ClaimRequestStatus;
  signed_message: string;
  signature: string;
  review_note: string | null;
  issuer_signed_message: string | null;
  issuer_signature: string | null;
  reviewed_by: string | null;
  reviewed_at: Date | null;
  // O2.3: payload EIP-712 firmado por el emisor (IdentityCloneable.addClaim)
  identity_address: string | null;
  claim_chain_id: number | null;
  claim_scheme: number;
  claim_wallet_owner: string | null;
  claim_nonce: string | null;
  claim_expires_at: string | null;
  claim_data: string | null;
  claim_uri: string | null;
  claim_uri_hash: string | null;
  claim_data_hash: string | null;
  claim_signature: string | null;
  created_at: Date;
  updated_at: Date;
};

/** Filas de la vista `rwa.v_claim_request_summary`. */
export type ClaimRequestSummaryRow = {
  id: string;
  requester_address: string;
  issuer_address: string;
  issuer_name: string | null;
  claim_topic_id: number;
  claim_topic_name: string | null;
  status: ClaimRequestStatus;
  created_at: Date;
  reviewed_at: Date | null;
  reviewed_by: string | null;
  document_count: string;
};

export type DocumentFileRow = {
  id: string;
  claim_request_id: string;
  original_name: string;
  content_type: string;
  size_bytes: string;
  sha256: Buffer;
  content: Buffer;
  encryption_algo: string;
  encryption_nonce: Buffer | null;
  uploaded_by: string;
  created_at: Date;
};

/** Metadatos de `document_files` sin el binario (para listados). */
export type DocumentFileMetaRow = Omit<DocumentFileRow, 'content'>;

export type TokenRow = {
  id: string;
  token_address: string;
  admin_address: string;
  name: string;
  symbol: string;
  decimals: number;
  max_total_supply: string | null;
  total_supply: string | null;
  identity_registry: string | null;
  trusted_issuers_registry: string | null;
  claim_topics_registry: string | null;
  compliance_address: string | null;
  price: string | null;
  description: string | null;
  transaction_hash: string | null;
  block_number: string | null;
  created_at: Date;
  updated_at: Date;
};

export type TokenRequiredClaimRow = {
  token_id: string;
  claim_topic_id: number;
  created_at: Date;
};

export type TokenComplianceModuleRow = {
  token_id: string;
  module_address: string;
  is_primary: boolean;
  created_at: Date;
};

export type SessionRow = {
  id: string;
  address: string;
  nonce: string;
  role: SessionRole;
  issued_at: Date;
  expires_at: Date;
  revoked_at: Date | null;
  user_agent: string | null;
  ip: string | null;
};

export type AuditLogRow = {
  id: string;
  actor_address: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  request_id: string | null;
  detail: unknown;
  at: Date;
};
