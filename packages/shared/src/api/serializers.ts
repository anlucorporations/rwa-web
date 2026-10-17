/**
 * Serializadores fila PostgreSQL → contrato JSON heredado.
 *
 * O0.3 es una **migración de almacenamiento**, no un rediseño de la API: los
 * componentes de las 3 apps siguen leyendo `_id`, `documentFileId`, `claimTopic`,
 * `requiredClaims`, `complianceModules`… Estos mappers concentran esa traducción
 * para que las rutas queden finas y el contrato no se rompa.
 *
 * Cuando O1/O4 revisen la API, este es el único punto que hay que cambiar.
 */

import type {
  ClaimRequestRow,
  DocumentFileMetaRow,
  IssuerRow,
  TokenComplianceModuleRow,
  TokenRequiredClaimRow,
  TokenRow,
} from '../db/types';

export type ClaimRequestDto = {
  _id: string;
  requesterAddress: string;
  issuerAddress: string;
  claimTopic: string;
  message?: string;
  documentFileId?: string;
  documentName?: string;
  documentContentType?: string;
  documentSize?: number;
  status: 'pending' | 'approved' | 'rejected';
  signedMessage: string;
  signature: string;
  createdAt: Date;
  updatedAt: Date;
  reviewedAt?: Date;
  reviewNote?: string;
  issuerSignedMessage?: string;
  issuerSignature?: string;
  /** O2.3: payload EIP-712 firmado por el emisor (para que el inversor envíe `addClaim`). */
  claimPayload?: {
    chainId: number;
    identityAddress: string;
    walletOwner: string;
    topic: string;
    scheme: number;
    data: string;
    uri: string;
    expiresAt: string;
    nonce: string;
  } | null;
  claimSignature?: string;
};

/** `document` es el primer documento asociado a la solicitud (si existe). */
export function toClaimRequestDto(
  row: ClaimRequestRow,
  document?: DocumentFileMetaRow | null,
): ClaimRequestDto {
  return {
    _id: row.id,
    requesterAddress: row.requester_address,
    issuerAddress: row.issuer_address,
    claimTopic: String(row.claim_topic_id),
    message: row.message ?? undefined,
    documentFileId: document?.id,
    documentName: document?.original_name,
    documentContentType: document?.content_type,
    documentSize: document ? Number(document.size_bytes) : undefined,
    status: row.status,
    signedMessage: row.signed_message,
    signature: row.signature,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    reviewedAt: row.reviewed_at ?? undefined,
    reviewNote: row.review_note ?? undefined,
    issuerSignedMessage: row.issuer_signed_message ?? undefined,
    issuerSignature: row.issuer_signature ?? undefined,
    claimPayload:
      row.claim_signature &&
      row.identity_address &&
      row.claim_chain_id !== null &&
      row.claim_wallet_owner &&
      row.claim_nonce !== null &&
      row.claim_expires_at !== null &&
      row.claim_data !== null &&
      row.claim_uri !== null
        ? {
            chainId: row.claim_chain_id,
            identityAddress: row.identity_address,
            walletOwner: row.claim_wallet_owner,
            topic: String(row.claim_topic_id),
            scheme: row.claim_scheme,
            data: row.claim_data,
            uri: row.claim_uri,
            expiresAt: row.claim_expires_at,
            nonce: row.claim_nonce,
          }
        : null,
    claimSignature: row.claim_signature ?? undefined,
  };
}

export type TokenDto = {
  _id: string;
  name: string;
  symbol: string;
  decimals: number;
  tokenAddress: string;
  adminAddress: string;
  complianceAddress?: string;
  complianceModules?: string[];
  requiredClaims: number[];
  price?: number;
  createdAt: Date;
  updatedAt: Date;
  transactionHash?: string;
  blockNumber?: number;
  totalSupply?: string;
  description?: string;
};

export function toTokenDto(
  row: TokenRow,
  relations: {
    requiredClaims?: readonly TokenRequiredClaimRow[];
    complianceModules?: readonly TokenComplianceModuleRow[];
  } = {},
): TokenDto {
  return {
    _id: row.id,
    name: row.name,
    symbol: row.symbol,
    decimals: row.decimals,
    tokenAddress: row.token_address,
    adminAddress: row.admin_address,
    complianceAddress: row.compliance_address ?? undefined,
    complianceModules: (relations.complianceModules ?? []).map((m) => m.module_address),
    requiredClaims: (relations.requiredClaims ?? []).map((r) => r.claim_topic_id),
    price: row.price === null ? undefined : Number(row.price),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    transactionHash: row.transaction_hash ?? undefined,
    blockNumber: row.block_number === null ? undefined : Number(row.block_number),
    totalSupply: row.total_supply ?? undefined,
    description: row.description ?? undefined,
  };
}

export type IssuerDto = {
  _id: string;
  address: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
};

export function toIssuerDto(row: IssuerRow): IssuerDto {
  return {
    _id: row.id,
    address: row.address,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
