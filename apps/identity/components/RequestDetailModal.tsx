/**
 * Request Detail Modal (inversor) — lógica de `addClaim` con viem/wagmi.
 * La presentación compartida vive en `@rwa/ui` (O4.3).
 */

'use client';

import { useState } from 'react';
import { usePublicClient, useWalletClient } from 'wagmi';
import { RequestDetailModal as SharedRequestDetailModal, useToast } from '@rwa/ui';
import { ClaimRequest } from '@/types/claim-request';
import { IdentityCloneableAbi } from '@rwa/shared/contracts';
import { ZERO_ADDRESS } from '@rwa/shared/network';
import { CLAIM_TOPIC_NAMES } from '@/lib/identity-claims';

interface RequestDetailModalProps {
  request: ClaimRequest;
  onClose: () => void;
  identityAddress: string;
  onClaimAdded?: () => void;
}

export default function RequestDetailModal({
  request,
  onClose,
  identityAddress,
  onClaimAdded,
}: RequestDetailModalProps) {
  const toast = useToast();
  const [addingClaim, setAddingClaim] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claimAdded, setClaimAdded] = useState(false);
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const addClaimToIdentity = async () => {
    if (!identityAddress || identityAddress === ZERO_ADDRESS) {
      setError('No identity contract found');
      return;
    }

    if (request.status !== 'approved') {
      setError('Only approved claims can be added to your identity');
      return;
    }

    try {
      setAddingClaim(true);
      setError(null);

      if (!walletClient || !publicClient) {
        throw new Error('MetaMask not available');
      }

      // O2.3: el claim se envía con la firma EIP-712 emitida por el emisor.
      const payload = request.claimPayload;
      const claimSignature = request.claimSignature;
      if (!payload || !claimSignature) {
        throw new Error(
          'Esta solicitud no tiene un claim firmado (EIP-712). Pide al emisor que la apruebe de nuevo.',
        );
      }
      if (payload.identityAddress.toLowerCase() !== identityAddress.toLowerCase()) {
        throw new Error('El claim firmado corresponde a otra identidad on-chain.');
      }

      const hash = await walletClient.writeContract({
        address: identityAddress as `0x${string}`,
        abi: IdentityCloneableAbi,
        functionName: 'addClaim',
        args: [
          BigInt(payload.topic),
          BigInt(payload.scheme),
          request.issuerAddress as `0x${string}`,
          claimSignature as `0x${string}`,
          payload.data as `0x${string}`,
          payload.uri,
          BigInt(payload.expiresAt),
        ],
      });
      await publicClient.waitForTransactionReceipt({ hash });

      setClaimAdded(true);
      toast.success(
        'Claim added to your identity successfully!\n\n✓ You can now use this claim for token investments',
      );
      onClaimAdded?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add claim to identity');
    } finally {
      setAddingClaim(false);
    }
  };

  const topicName = CLAIM_TOPIC_NAMES[Number(request.claimTopic)];

  return (
    <SharedRequestDetailModal
      request={request}
      onClose={onClose}
      variant="investor"
      topicName={topicName}
      identityAddress={identityAddress}
      error={error}
      actions={
        claimAdded ? (
          <div className="rounded-lg border border-green-300 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
            <p className="text-sm font-semibold text-green-800 dark:text-green-400">
              ✓ Claim added to your identity
            </p>
          </div>
        ) : request.status === 'approved' ? (
          <div className="space-y-2">
            <button
              onClick={addClaimToIdentity}
              disabled={addingClaim || !request.claimSignature}
              className="w-full rounded-lg bg-green-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {addingClaim ? 'Adding claim...' : '➕ Add Claim to My Identity'}
            </button>
            {!request.claimSignature && (
              <p className="text-xs text-orange-600 dark:text-orange-400">
                ⚠️ Esta solicitud no tiene firma EIP-712; el emisor debe aprobarla de nuevo.
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {request.status === 'rejected'
              ? 'Esta solicitud fue rechazada por el emisor.'
              : 'El emisor aún no ha revisado esta solicitud.'}
          </p>
        )
      }
    />
  );
}
