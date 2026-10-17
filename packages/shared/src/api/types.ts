/**
 * Tipos del contrato HTTP que comparten las apps (O4.3).
 *
 * Se derivan de los serializadores para que la forma JSON sea única.
 */

export type { ClaimRequestDto as ClaimRequest } from './serializers';

/** Datos de sesión que devuelve `GET /api/auth/session`. */
export type SessionDto = {
  address: string;
  role: 'investor' | 'issuer' | 'admin';
  expiresAt: Date;
};

/** Revisión de una solicitud (panel de emisor). */
export type UpdateRequestStatusDto = {
  requestId: string;
  status: 'approved' | 'rejected';
  reviewNote?: string;
  /** Obligatorio al aprobar: payload EIP-712 (O2.3). */
  claim?: unknown;
  claimSignature?: string;
  /** Obligatorio al rechazar: firma EIP-191 de la revisión. */
  issuerSignedMessage?: string;
  issuerSignature?: string;
};
