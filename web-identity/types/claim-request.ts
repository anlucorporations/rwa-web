/**
 * Types for Claim Requests
 */

export interface ClaimRequest {
  _id?: string;
  requesterAddress: string;
  issuerAddress: string;
  claimTopic: string;
  message?: string;
  documentFileId?: string;
  documentName?: string;
  documentContentType?: string;
  documentSize?: number;
  status: 'pending' | 'approved' | 'rejected';
  // Digital signature fields (requester)
  signedMessage: string;      // Message that was signed: "requester + date"
  signature: string;           // Cryptographic signature from MetaMask
  createdAt: Date;
  updatedAt: Date;
  reviewedAt?: Date;
  reviewNote?: string;
  // Digital signature fields (issuer review)
  issuerSignedMessage?: string;    // Message signed by issuer when approving/rejecting
  issuerSignature?: string;         // Issuer's cryptographic signature
}

export interface CreateClaimRequestDto {
  requesterAddress: string;
  issuerAddress: string;
  claimTopic: string;
  message?: string;
  documentFileId?: string;
  documentName?: string;
  documentContentType?: string;
  documentSize?: number;
  signedMessage: string;
  signature: string;
}

