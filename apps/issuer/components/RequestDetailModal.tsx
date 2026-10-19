/**
 * Request Detail Modal (emisor) — firma EIP-712 del claim y revisión con viem/wagmi.
 * La presentación compartida vive en `@rwa/ui` (O4.3).
 */

'use client';

import { useState } from 'react';
import { usePublicClient, useWalletClient } from 'wagmi';
import { toHex } from 'viem';
import { RequestDetailModal as SharedRequestDetailModal } from '@rwa/ui';
import { ClaimRequest } from '@/types/claim-request';
import { IdentityCloneableAbi, IdentityRegistryAbi, getContractAddress } from '@rwa/shared/contracts';
import { buildClaimTypedData, type ClaimPayload } from '@rwa/shared/claims';
import { ZERO_ADDRESS, assertCanonicalChain } from '@rwa/shared/network';
import { useUpdateRequestMutation } from '@/lib/queries';

interface RequestDetailModalProps {
  request: ClaimRequest;
  onClose: () => void;
  onUpdate: () => void;
  issuerAddress: string;
}

export default function RequestDetailModal({
  request,
  onClose,
  onUpdate,
  issuerAddress,
}: RequestDetailModalProps) {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const updateRequest = useUpdateRequestMutation();
  const [loading, setLoading] = useState(false);
  const [reviewNote, setReviewNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const signReviewDecision = async (
    status: 'approved' | 'rejected',
  ): Promise<{ signedMessage: string; signature: string }> => {
    try {
      if (!walletClient) {
        throw new Error('MetaMask not available');
      }

      const timestamp = new Date().toISOString();
      const messageToSign = `Claim Request Review Decision

Request ID: ${request._id}
Issuer: ${issuerAddress}
Requester: ${request.requesterAddress}
Claim Topic: ${request.claimTopic}
Decision: ${status.toUpperCase()}
Timestamp: ${timestamp}
Review Note: ${reviewNote || 'N/A'}

I hereby ${status === 'approved' ? 'APPROVE' : 'REJECT'} this claim request with my digital signature.`;

      const signature = await walletClient.signMessage({
        account: walletClient.account!,
        message: messageToSign,
      });

      return { signedMessage: messageToSign, signature };
    } catch {
      throw new Error('Failed to sign decision. Please approve the signature request in MetaMask.');
    }
  };

  /**
   * O2.3: construye el payload EIP-712 del claim con datos on-chain (clon de identidad
   * y `claimNonce(topic, issuer)`) y lo firma con `signTypedData`. El inversor enviará
   * después `addClaim` con esta firma.
   */
  const signClaim = async (): Promise<{ payload: ClaimPayload; signature: string }> => {
    if (!walletClient || !publicClient) {
      throw new Error('MetaMask not available');
    }
    const chainId = await publicClient.getChainId();
    assertCanonicalChain(chainId);

    const identityAddress = (await publicClient.readContract({
      address: getContractAddress('IdentityRegistry') as `0x${string}`,
      abi: IdentityRegistryAbi,
      functionName: 'getIdentity',
      args: [request.requesterAddress as `0x${string}`],
    })) as string;

    if (!identityAddress || identityAddress === ZERO_ADDRESS) {
      throw new Error(
        'El inversor todavía no ha creado su identidad on-chain; no se puede emitir el claim firmado.',
      );
    }

    const owner = (await publicClient.readContract({
      address: identityAddress as `0x${string}`,
      abi: IdentityCloneableAbi,
      functionName: 'owner',
    })) as string;
    if (owner.toLowerCase() !== request.requesterAddress.toLowerCase()) {
      throw new Error('La identidad on-chain no pertenece al solicitante (owner distinto).');
    }

    const topic = Number(request.claimTopic);
    const nonce = (await publicClient.readContract({
      address: identityAddress as `0x${string}`,
      abi: IdentityCloneableAbi,
      functionName: 'claimNonce',
      args: [BigInt(topic), issuerAddress as `0x${string}`],
    })) as bigint;
    const expiresAt = String(Math.floor(Date.now() / 1000) + 365 * 24 * 3600);
    const data = toHex(
      JSON.stringify({
        claimRequestId: request._id,
        documentFileId: request.documentFileId ?? null,
        issuer: issuerAddress,
        requester: request.requesterAddress,
        reviewedAt: new Date().toISOString(),
      }),
    );
    const uri = request.documentFileId
      ? `/api/download/${request.documentFileId}`
      : `/api/claim/${request._id}`;

    const payload: ClaimPayload = {
      chainId,
      identityAddress: identityAddress as `0x${string}`,
      walletOwner: owner as `0x${string}`,
      topic: String(topic),
      scheme: 1,
      data: data as `0x${string}`,
      uri,
      expiresAt,
      nonce: String(nonce),
    };

    const typedData = buildClaimTypedData(payload);
    const signature = await walletClient.signTypedData({
      account: walletClient.account!,
      domain: typedData.domain,
      types: typedData.types,
      primaryType: 'Claim',
      message: typedData.message,
    });
    return { payload, signature };
  };

  const handleAction = async (status: 'approved' | 'rejected') => {
    if (issuerAddress.toLowerCase() !== request.issuerAddress.toLowerCase()) {
      setError('You are not authorized to review this request');
      return;
    }

    if (request.status !== 'pending') {
      setError('This request has already been reviewed');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let reviewBody: Record<string, unknown>;

      if (status === 'approved') {
        // O2.3: el alta exige una firma EIP-712 del claim (addClaim on-chain)
        const { payload, signature } = await signClaim();
        reviewBody = {
          requestId: request._id,
          status,
          reviewNote,
          claim: payload,
          claimSignature: signature,
        };
      } else {
        // El rechazo no genera claim on-chain: basta la firma EIP-191 del mensaje de revisión
        const { signedMessage, signature } = await signReviewDecision(status);
        reviewBody = {
          requestId: request._id,
          status,
          reviewNote,
          issuerSignedMessage: signedMessage,
          issuerSignature: signature,
        };
      }

      await updateRequest.mutateAsync({
        requestId: request._id,
        status,
        reviewNote,
        ...(reviewBody.claim ? { claim: reviewBody.claim } : {}),
        ...(reviewBody.claimSignature ? { claimSignature: String(reviewBody.claimSignature) } : {}),
        ...(reviewBody.issuerSignedMessage
          ? { issuerSignedMessage: String(reviewBody.issuerSignedMessage) }
          : {}),
        ...(reviewBody.issuerSignature ? { issuerSignature: String(reviewBody.issuerSignature) } : {}),
      });

      alert(`Request ${status} successfully!\n\n✓ Decision cryptographically signed`);
      onUpdate();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SharedRequestDetailModal
      request={request}
      onClose={onClose}
      variant="issuer"
      error={error}
      actions={
        request.status === 'pending' ? (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Review Note (optional)
              </label>
              <textarea
                value={reviewNote}
                onChange={(event) => setReviewNote(event.target.value)}
                rows={3}
                placeholder="Notas para el inversor..."
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => handleAction('approved')}
                disabled={loading}
                className="flex-1 rounded-lg bg-green-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Procesando...' : '✓ Approve & Sign Claim'}
              </button>
              <button
                onClick={() => handleAction('rejected')}
                disabled={loading}
                className="flex-1 rounded-lg bg-red-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Procesando...' : '✕ Reject'}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Esta solicitud ya fue revisada ({request.status}).
          </p>
        )
      }
    />
  );
}
