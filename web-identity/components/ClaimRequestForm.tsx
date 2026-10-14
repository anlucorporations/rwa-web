/**
 * Claim Request Form Component
 * 
 * Form to request a claim from a trusted issuer
 */

'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '@/contexts/WalletContext';
import {
  TRUSTED_ISSUERS_REGISTRY_ADDRESS,
  TRUSTED_ISSUERS_REGISTRY_ABI,
  NETWORK_CONFIG,
} from '@/contracts/TrustedIssuersRegistry';

interface Issuer {
  address: string;
  claimTopics: bigint[];
  name?: string;
}

interface ClaimRequestFormProps {
  userAddress: string;
  onSuccess: () => void;
}

export default function ClaimRequestForm({ userAddress, onSuccess }: ClaimRequestFormProps) {
  const { provider: walletProvider } = useWallet();
  const [issuers, setIssuers] = useState<Issuer[]>([]);
  const [selectedIssuer, setSelectedIssuer] = useState<string>('');
  const [availableTopics, setAvailableTopics] = useState<bigint[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [message, setMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loadingIssuers, setLoadingIssuers] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadIssuers();
  }, [walletProvider]);

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

  const loadIssuers = async () => {
    try {
      setLoadingIssuers(true);
      setError(null);

      console.log('Loading trusted issuers from contract:', TRUSTED_ISSUERS_REGISTRY_ADDRESS);
      
      // Use wallet provider if available, otherwise fall back to JsonRpcProvider
      const provider = walletProvider || new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
      console.log('Using provider:', walletProvider ? 'Wallet provider' : `JsonRpcProvider (${NETWORK_CONFIG.rpcUrl})`);
      const contract = new ethers.Contract(
        TRUSTED_ISSUERS_REGISTRY_ADDRESS,
        TRUSTED_ISSUERS_REGISTRY_ABI,
        provider
      );

      // First check if contract exists by getting the count
      let issuersCount: bigint;
      try {
        issuersCount = await contract.getTrustedIssuersCount();
        console.log('Trusted issuers count:', issuersCount.toString());
      } catch (countError: any) {
        console.error('Error getting issuers count:', countError);
        throw new Error(`Failed to connect to TrustedIssuersRegistry contract at ${TRUSTED_ISSUERS_REGISTRY_ADDRESS}. Error: ${countError.message}`);
      }

      if (issuersCount === 0n) {
        console.warn('No trusted issuers found in the registry');
        setIssuers([]);
        setError('No trusted issuers have been configured in the registry. The contract owner needs to add issuers using addTrustedIssuer().');
        return;
      }

      const issuerAddresses = await contract.getTrustedIssuers();
      console.log('Found issuer addresses:', issuerAddresses);
      
      if (!issuerAddresses || issuerAddresses.length === 0) {
        console.warn('getTrustedIssuers returned empty array');
        setIssuers([]);
        setError('No trusted issuers found. The contract may not have any issuers configured.');
        return;
      }
      
      // Get issuer names from MongoDB
      let issuerNamesMap: Record<string, string> = {};
      try {
        const issuerNamesResponse = await fetch('/api/issuers/batch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ addresses: issuerAddresses }),
        });

        const issuerNamesResult = await issuerNamesResponse.json();
        
        if (issuerNamesResult.success && issuerNamesResult.data) {
          Object.values(issuerNamesResult.data).forEach((issuer: any) => {
            issuerNamesMap[issuer.address.toLowerCase()] = issuer.name;
          });
        }
      } catch (nameError) {
        console.warn('Error loading issuer names from MongoDB:', nameError);
        // Continue without names if API fails
      }
      
      const issuersData = await Promise.all(
        issuerAddresses.map(async (address: string) => {
          try {
            const claimTopics = await contract.getIssuerClaimTopics(address);
            console.log(`Issuer ${address} has topics:`, claimTopics);
            const name = issuerNamesMap[address.toLowerCase()];
            return {
              address,
              claimTopics,
              name,
            };
          } catch (topicError: any) {
            console.error(`Error loading topics for issuer ${address}:`, topicError);
            // Return issuer with empty topics array if we can't load them
            const name = issuerNamesMap[address.toLowerCase()];
            return {
              address,
              claimTopics: [],
              name,
            };
          }
        })
      );

      console.log('Loaded issuers data:', issuersData);
      setIssuers(issuersData);
      setError(null);
    } catch (err: any) {
      console.error('Error loading issuers:', err);
      const errorMessage = err.message || 'Failed to load trusted issuers';
      setError(errorMessage);
      setIssuers([]);
    } finally {
      setLoadingIssuers(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const uploadFile = async (): Promise<{
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
      console.error('Error uploading file:', err);
      throw err;
    } finally {
      setUploading(false);
    }
  };

  const signMessage = async (): Promise<{ signedMessage: string; signature: string }> => {
    try {
      if (typeof window === 'undefined' || !window.ethereum) {
        throw new Error('MetaMask not available');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // Create message with requester address + timestamp
      const timestamp = new Date().toISOString();
      const messageToSign = `Claim Request Verification\n\nRequester: ${userAddress}\nTimestamp: ${timestamp}\n\nI hereby request verification of my claim from the selected trusted issuer.`;
      
      // Request signature from MetaMask
      const signature = await signer.signMessage(messageToSign);
      
      return {
        signedMessage: messageToSign,
        signature: signature
      };
    } catch (err) {
      console.error('Error signing message:', err);
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

      // Step 2: Upload file if exists
      let documentData: {
        fileId: string;
        filename: string;
        contentType: string;
        size: number;
      } | null = null;
      if (file) {
        documentData = await uploadFile();
      }

      // Step 3: Create claim request with signature
      const requestBody = {
        requesterAddress: userAddress,
        issuerAddress: selectedIssuer,
        claimTopic: selectedTopic,
        message,
        documentFileId: documentData?.fileId,
        documentName: documentData?.filename,
        documentContentType: documentData?.contentType,
        documentSize: documentData?.size,
        signedMessage,
        signature,
      };

      const response = await fetch('/api/claim-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to create claim request');
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
      console.error('Error submitting claim request:', err);
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
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <p className="text-sm font-semibold text-red-800 dark:text-red-400 mb-2">
              Error loading trusted issuers:
            </p>
            <p className="text-sm text-red-700 dark:text-red-300">
              {error}
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

