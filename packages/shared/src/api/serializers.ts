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
