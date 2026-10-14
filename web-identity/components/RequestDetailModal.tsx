/**
 * Request Detail Modal Component (for users to view their requests)
 * 
 * Shows detailed information about a claim request including signatures
 */

'use client';

import { useState } from 'react';
import { ClaimRequest } from '@/types/claim-request';

interface RequestDetailModalProps {
  request: ClaimRequest;
  onClose: () => void;
  identityAddress: string;
  onClaimAdded?: () => void;
}

export default function RequestDetailModal({ request, onClose, identityAddress, onClaimAdded }: RequestDetailModalProps) {
  const [addingClaim, setAddingClaim] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claimAdded, setClaimAdded] = useState(false);

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleString();
  };

  const addClaimToIdentity = async () => {
    if (!identityAddress || identityAddress === '0x0000000000000000000000000000000000000000') {
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

      console.log('🔐 Adding claim to identity contract...');
      console.log('Identity address:', identityAddress);
      console.log('Claim topic:', request.claimTopic);
      console.log('Issuer:', request.issuerAddress);

      if (typeof window === 'undefined' || !window.ethereum) {
        throw new Error('MetaMask not available');
      }

      // Dynamic import of ethers
      const { ethers } = await import('ethers');

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Identity contract ABI for addClaim
      const identityABI = [
        {
          "type": "function",
          "name": "addClaim",
          "inputs": [
            { "name": "_topic", "type": "uint256" },
            { "name": "_scheme", "type": "uint256" },
            { "name": "_issuer", "type": "address" },
            { "name": "_signature", "type": "bytes" },
            { "name": "_data", "type": "bytes" },
            { "name": "_uri", "type": "string" }
          ],
          "outputs": [{ "name": "", "type": "bytes32" }],
          "stateMutability": "nonpayable"
        }
      ];

      const identityContract = new ethers.Contract(
        identityAddress,
        identityABI,
        signer
      );

      // Prepare claim data
      const topic = BigInt(request.claimTopic);
      const scheme = 1n; // ECDSA signature scheme
      const issuer = request.issuerAddress;
      
      // Use issuer's signature as the signature bytes
      const signatureBytes = request.issuerSignature || '0x';
      
      // Encode additional data (message, timestamps, etc.)
      const claimData = ethers.AbiCoder.defaultAbiCoder().encode(
        ['string', 'string', 'uint256'],
        [
          request.message || '',
          request.issuerSignedMessage || '',
          Math.floor(new Date(request.reviewedAt || request.updatedAt).getTime() / 1000)
        ]
      );
      
      const uri = request.documentFileId 
        ? `/api/download/${request.documentFileId}`
        : '';

      console.log('📝 Calling addClaim with:', {
        topic: topic.toString(),
        scheme: scheme.toString(),
        issuer,
        signature: signatureBytes.substring(0, 20) + '...',
        uri
      });

      const tx = await identityContract.addClaim(
        topic,
        scheme,
        issuer,
        signatureBytes,
        claimData,
        uri
      );

      console.log('⏳ Transaction sent:', tx.hash);
      await tx.wait();
      console.log('✅ Claim added to identity!');

      setClaimAdded(true);
      alert('Claim added to your identity successfully!\n\n✓ You can now use this claim for token investments');
      
      if (onClaimAdded) {
        onClaimAdded();
      }
    } catch (err) {
      console.error('Error adding claim to identity:', err);
      setError(err instanceof Error ? err.message : 'Failed to add claim to identity');
    } finally {
      setAddingClaim(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };
    
    return badges[status as keyof typeof badges] || badges.pending;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Request Details
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <span className="text-2xl">✕</span>
          </button>
        </div>

        {/* Status Badge */}
        <div className="mb-6">
          <span className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold ${getStatusBadge(request.status)}`}>
            {request.status.toUpperCase()}
          </span>
        </div>

        {/* Request Information */}
        <div className="space-y-4">
          {/* Issuer Address */}
          <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
            <p className="mb-1 text-sm font-medium text-gray-500 dark:text-gray-400">
              Issuer Address
            </p>
            <code className="block break-all text-sm text-gray-900 dark:text-white">
              {request.issuerAddress}
            </code>
          </div>

          {/* Claim Topic */}
          <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
            <p className="mb-1 text-sm font-medium text-gray-500 dark:text-gray-400">
              Claim Topic
            </p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              Topic {request.claimTopic}
            </p>
          </div>

          {/* Message */}
          {request.message && (
            <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
              <p className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                Your Message
              </p>
              <p className="text-sm text-gray-900 dark:text-white">
                {request.message}
              </p>
            </div>
          )}

          {/* Document */}
          {request.documentFileId && (
            <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
              <p className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                Attached Document
              </p>
              <a
                href={`/api/download/${request.documentFileId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
              >
                📎 {request.documentName || 'Download Document'}
                {request.documentSize && (
                  <span className="text-xs">
                    ({(request.documentSize / 1024).toFixed(1)} KB)
                  </span>
                )}
              </a>
            </div>
          )}

          {/* Your Digital Signature */}
          {request.signedMessage && request.signature && (
            <div className="rounded-lg border-2 border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
              <p className="mb-2 flex items-center gap-2 text-sm font-medium text-green-900 dark:text-green-300">
                ✍️ Your Digital Signature
              </p>
              
              <div className="space-y-3">
                {/* Signed Message */}
                <div>
                  <p className="mb-1 text-xs font-semibold text-green-800 dark:text-green-400">
                    Signed Message:
                  </p>
                  <div className="rounded bg-white p-2 dark:bg-gray-900">
                    <pre className="whitespace-pre-wrap break-words text-xs text-gray-700 dark:text-gray-300">
                      {request.signedMessage}
                    </pre>
                  </div>
                </div>
                
                {/* Signature */}
                <div>
                  <p className="mb-1 text-xs font-semibold text-green-800 dark:text-green-400">
                    Your Cryptographic Signature:
                  </p>
                  <code className="block break-all rounded bg-white p-2 text-xs text-gray-700 dark:bg-gray-900 dark:text-gray-300">
                    {request.signature}
                  </code>
                </div>
              </div>
              
              <p className="mt-2 text-xs text-green-700 dark:text-green-500">
                ✓ You cryptographically signed this request, proving authenticity.
              </p>
            </div>
          )}

          {/* Review Note (if reviewed) */}
          {request.reviewNote && (
            <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
              <p className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                Issuer's Review Note
              </p>
              <p className="text-sm text-gray-900 dark:text-white">
                {request.reviewNote}
              </p>
            </div>
          )}

          {/* Issuer Digital Signature (if reviewed) */}
          {request.issuerSignedMessage && request.issuerSignature && (
            <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
              <p className="mb-2 flex items-center gap-2 text-sm font-medium text-blue-900 dark:text-blue-300">
                ✍️ Issuer's Digital Signature
              </p>
              
              <div className="space-y-3">
                {/* Signed Decision Message */}
                <div>
                  <p className="mb-1 text-xs font-semibold text-blue-800 dark:text-blue-400">
                    Issuer's Signed Decision:
                  </p>
                  <div className="rounded bg-white p-2 dark:bg-gray-900">
                    <pre className="whitespace-pre-wrap break-words text-xs text-gray-700 dark:text-gray-300">
                      {request.issuerSignedMessage}
                    </pre>
                  </div>
                </div>
                
                {/* Issuer Signature */}
                <div>
                  <p className="mb-1 text-xs font-semibold text-blue-800 dark:text-blue-400">
                    Issuer's Cryptographic Signature:
                  </p>
                  <code className="block break-all rounded bg-white p-2 text-xs text-gray-700 dark:bg-gray-900 dark:text-gray-300">
                    {request.issuerSignature}
                  </code>
                </div>
              </div>
              
              <p className="mt-2 text-xs text-blue-700 dark:text-blue-500">
                ✓ The issuer has cryptographically signed their decision of {request.status}, providing a permanent, verifiable record.
              </p>
            </div>
          )}

          {/* Timestamps */}
          <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
            <p className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">
              Timeline
            </p>
            <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
              <p>Created: {formatDate(request.createdAt)}</p>
              <p>Updated: {formatDate(request.updatedAt)}</p>
              {request.reviewedAt && (
                <p>Reviewed: {formatDate(request.reviewedAt)}</p>
              )}
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-4 rounded-lg border border-red-300 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
            <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {claimAdded && (
          <div className="mt-4 rounded-lg border-2 border-green-300 bg-green-100 p-4 dark:border-green-700 dark:bg-green-900/30">
            <p className="text-sm font-semibold text-green-900 dark:text-green-300">
              ✅ Claim successfully added to your identity!
            </p>
            <p className="mt-1 text-xs text-green-800 dark:text-green-400">
              The claim is now part of your on-chain identity and can be used for compliance verification.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 space-y-3 border-t border-gray-200 pt-6 dark:border-gray-700">
          {/* Add to Identity Button (only for approved claims) */}
          {request.status === 'approved' && !claimAdded && (
            <div className="rounded-lg border-2 border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
              <h4 className="mb-2 text-sm font-semibold text-green-900 dark:text-green-300">
                ✅ Claim Approved!
              </h4>
              <p className="mb-3 text-xs text-green-800 dark:text-green-400">
                This claim has been approved by the issuer. You can now add it to your identity contract to use it for token investments and compliance verification.
              </p>
              <button
                onClick={addClaimToIdentity}
                disabled={addingClaim}
                className="w-full rounded-lg bg-green-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {addingClaim ? 'Adding to Identity...' : '⬆️ Add Claim to Identity Contract'}
              </button>
            </div>
          )}
          
          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-full rounded-lg bg-gray-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

