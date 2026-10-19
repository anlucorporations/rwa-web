/**
 * Tipos mínimos compartidos por `@rwa/ui` (O4.3).
 *
 * Estructurales: las apps pasan sus DTOs (`ClaimRequest`) sin acoplar el paquete
 * al cliente de API.
 */

export type ClaimRequestStatus = 'pending' | 'approved' | 'rejected' | string;

/** Campos de una solicitud de claim que la UI compartida sabe mostrar. */
export interface ClaimRequestLike {
  _id?: string;
  requesterAddress: string;
  issuerAddress: string;
  claimTopic: number | bigint | string;
  status: ClaimRequestStatus;
  message?: string;
  documentFileId?: string;
  documentName?: string;
  documentSize?: number;
  signedMessage?: string;
  signature?: string;
  issuerSignedMessage?: string;
  issuerSignature?: string;
  reviewNote?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  /** Payload EIP-712 del claim (O2.3), presente en solicitudes aprobadas. */
  claimPayload?: unknown;
  claimSignature?: string;
}
