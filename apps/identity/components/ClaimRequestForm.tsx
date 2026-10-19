/**
 * Claim Request Form Component
 * 
 * Form to request a claim from a trusted issuer
 */

'use client';

import { useState, useEffect } from 'react';
import { useWalletClient } from 'wagmi';
import { useCreateClaimRequestMutation, useTrustedIssuersQuery } from '@/lib/queries';
import {
  TRUSTED_ISSUERS_REGISTRY_ADDRESS,
  NETWORK_CONFIG,
} from '@/contracts/TrustedIssuersRegistry';

interface ClaimRequestFormProps {
  userAddress: string;
  onSuccess: () => void;
}

export default function ClaimRequestForm({ userAddress, onSuccess }: ClaimRequestFormProps) {
  const { data: walletClient } = useWalletClient();
  const {
    data: issuers = [],
    isLoading: loadingIssuers,
    error: issuersError,
  } = useTrustedIssuersQuery();
  const createClaimRequest = useCreateClaimRequestMutation();
  const [selectedIssuer, setSelectedIssuer] = useState<string>('');
  const [availableTopics, setAvailableTopics] = useState<readonly bigint[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [message, setMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedIssuer) {
      const issuer = issuers.find(i => i.address === selectedIssuer);
      if (issuer) {
        setAvailableTopics(issuer.claimTopics);
        setSelectedTopic('');
      }
    } else {
      setAvailableTopics([]);
      setSelectedTopic('');
    }
  }, [selectedIssuer, issuers]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const uploadFile = async (claimRequestId: string): Promise<{
    fileId: string;
    filename: string;
    contentType: string;
    size: number;
  } | null> => {
    if (!file) return null;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('claimRequestId', claimRequestId);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to upload file');
      }

      return {
        fileId: result.data.fileId,
        filename: result.data.filename,
        contentType: result.data.contentType,
        size: result.data.size,
      };
    } catch (err) {
            throw err;
    } finally {
      setUploading(false);
    }
  };

  const signMessage = async (): Promise<{ signedMessage: string; signature: string }> => {
    try {
      if (!walletClient) {
        throw new Error('MetaMask not available');
      }

      // Create message with requester address + timestamp
      const timestamp = new Date().toISOString();
      const messageToSign = `Claim Request Verification\n\nRequester: ${userAddress}\nTimestamp: ${timestamp}\n\nI hereby request verification of my claim from the selected trusted issuer.`;

      // Request signature from MetaMask
      const signature = await walletClient.signMessage({ message: messageToSign });

      return {
        signedMessage: messageToSign,
        signature: signature
      };
    } catch {
      throw new Error('Failed to sign message. Please approve the signature request in MetaMask.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedIssuer || !selectedTopic) {
      setError('Please select an issuer and claim topic');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Step 1: Sign the message with MetaMask
      const { signedMessage, signature } = await signMessage();

      // Step 2: Create the claim request (the document is not part of this payload)
      const createdRequest = await createClaimRequest.mutateAsync({
        requesterAddress: userAddress,
        issuerAddress: selectedIssuer,
        claimTopic: selectedTopic,
        message,
        signedMessage,
        signature,
      });

      // Step 3: Attach the document to the created request
      const claimRequestId: string | undefined = createdRequest?._id;
      if (!claimRequestId) {
        throw new Error('The claim request was created without an identifier');
      }

      if (file) {
        try {
          await uploadFile(claimRequestId);
        } catch (uploadErr) {
          throw new Error(
            `The claim request was created successfully, but the document could not be uploaded: ${
              uploadErr instanceof Error ? uploadErr.message : 'unknown error'
            }`
          );
        }
      }

      // Reset form
      setSelectedIssuer('');
      setSelectedTopic('');
      setMessage('');
      setFile(null);
      
      // Reset file input
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }

      alert('Claim request submitted successfully!');
      onSuccess();
    } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to submit claim request');
    } finally {
      setLoading(false);
    }
  };

  if (loadingIssuers) {
    return (
      <div className="rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800">
        <p className="text-center text-gray-600 dark:text-gray-400">
          Loading trusted issuers...
        </p>
      </div>
    );
  }

  if (issuers.length === 0) {
    return (
      <div className="rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800">
        <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
          Request Claim
        </h2>
        {issuersError || error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <p className="text-sm font-semibold text-red-800 dark:text-red-400 mb-2">
              Error loading trusted issuers:
            </p>
            <p className="text-sm text-red-700 dark:text-red-300">
              {issuersError instanceof Error ? issuersError.message : error}
            </p>
            <details className="mt-3 text-xs text-red-600 dark:text-red-400">
              <summary className="cursor-pointer font-medium">Debug Information</summary>
              <div className="mt-2 font-mono">
                <p>Contract Address: {TRUSTED_ISSUERS_REGISTRY_ADDRESS}</p>
                <p>RPC URL: {NETWORK_CONFIG.rpcUrl}</p>
                <p>Chain ID: {NETWORK_CONFIG.chainId}</p>
              </div>
            </details>
          </div>
        ) : (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
            <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-400 mb-2">
              No trusted issuers available
            </p>
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
              The TrustedIssuersRegistry contract does not have any issuers configured. 
              The contract owner needs to add trusted issuers using the <code className="bg-yellow-100 dark:bg-yellow-900 px-1 py-0.5 rounded">addTrustedIssuer</code> function.
            </p>
            <details className="mt-3 text-xs text-yellow-600 dark:text-yellow-400">
              <summary className="cursor-pointer font-medium">Contract Information</summary>
              <div className="mt-2 font-mono">
                <p>Contract Address: {TRUSTED_ISSUERS_REGISTRY_ADDRESS}</p>
                <p>RPC URL: {NETWORK_CONFIG.rpcUrl}</p>
                <p>Chain ID: {NETWORK_CONFIG.chainId}</p>
              </div>
            </details>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800">
      <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
        Request Claim
      </h2>

      {error && (
        <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Issuer Selection */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Select Issuer *
          </label>
          <select
            value={selectedIssuer}
            onChange={(e) => setSelectedIssuer(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            required
          >
            <option value="">-- Select an issuer --</option>
            {issuers.map((issuer) => (
              <option key={issuer.address} value={issuer.address}>
                {issuer.name || issuer.address}
              </option>
            ))}
          </select>
        </div>

        {/* Claim Topic Selection */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Select Claim Topic *
          </label>
          <select
            value={selectedTopic}
            onChange={(e) => setSelectedTopic(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            required
            disabled={!selectedIssuer}
          >
            <option value="">-- Select a claim topic --</option>
            {availableTopics.map((topic) => (
              <option key={topic.toString()} value={topic.toString()}>
                Topic {topic.toString()}
              </option>
            ))}
          </select>
          {!selectedIssuer && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Please select an issuer first
            </p>
          )}
        </div>

        {/* Message */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Message (Optional)
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            placeholder="Additional information about your claim request..."
            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>

        {/* File Upload */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Attach Document (Optional)
          </label>
          <input
            id="file-input"
            type="file"
            onChange={handleFileChange}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          />
          {file && (
            <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
              Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
            </p>
          )}
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Max file size: 10MB. Supported formats: PDF, DOC, DOCX, JPG, PNG
          </p>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || uploading}
          className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? uploading
              ? 'Uploading file...'
              : 'Submitting...'
            : 'Submit Claim Request'}
        </button>
      </form>
    </div>
  );
}

