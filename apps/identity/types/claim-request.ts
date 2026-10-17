/**
 * Tipos de solicitudes de claim. La forma común vive en `@rwa/shared` (O4.3).
 */
export type { ClaimRequest } from '@rwa/shared';

export interface CreateClaimRequestDto {
  requesterAddress: string;
  issuerAddress: string;
  claimTopic: string;
  message?: string;
  signedMessage: string;
  signature: string;
}
