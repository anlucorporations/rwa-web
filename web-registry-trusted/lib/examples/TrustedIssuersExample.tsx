/**
 * Example Component: Displaying Trusted Issuers
 * 
 * This is an example component demonstrating how to interact with
 * the TrustedIssuersRegistry contract in a React component.
 * 
 * To use this in your app:
 * 1. Install ethers.js: npm install ethers
 * 2. Import and use this component in your pages
 */

'use client';

import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import {
  TRUSTED_ISSUERS_REGISTRY_ADDRESS,
  TRUSTED_ISSUERS_REGISTRY_ABI,
  NETWORK_CONFIG,
} from '@/lib/contracts';

interface IssuerData {
  address: string;
  claimTopics: bigint[];
  isTrusted: boolean;
}

export default function TrustedIssuersExample() {
  const [issuers, setIssuers] = useState<string[]>([]);
  const [issuerDetails, setIssuerDetails] = useState<IssuerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTrustedIssuers();
  }, []);

  const loadTrustedIssuers = async () => {
    try {
      setLoading(true);
      setError(null);

      // Create provider
      const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
      
      // Create contract instance
      const contract = new ethers.Contract(
        TRUSTED_ISSUERS_REGISTRY_ADDRESS,
        TRUSTED_ISSUERS_REGISTRY_ABI,
        provider
      );

      // Get all trusted issuers
      const issuerAddresses = await contract.getTrustedIssuers();
      setIssuers(issuerAddresses);

      // Get details for each issuer
      const details = await Promise.all(
        issuerAddresses.map(async (address: string) => {
          const claimTopics = await contract.getIssuerClaimTopics(address);
          const isTrusted = await contract.isTrustedIssuer(address);
          
          return {
            address,
            claimTopics,
            isTrusted,
          };
        })
      );

      setIssuerDetails(details);
    } catch (err) {
      console.error('Error loading trusted issuers:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const checkIssuer = async (address: string) => {
    try {
      const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
      const contract = new ethers.Contract(
        TRUSTED_ISSUERS_REGISTRY_ADDRESS,
        TRUSTED_ISSUERS_REGISTRY_ABI,
        provider
      );

      const isTrusted = await contract.isTrustedIssuer(address);
      alert(`Address ${address} is ${isTrusted ? 'TRUSTED' : 'NOT TRUSTED'}`);
    } catch (err) {
      console.error('Error checking issuer:', err);
      alert('Error checking issuer status');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">Loading trusted issuers...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-300 bg-red-50 p-4">
        <h3 className="text-lg font-semibold text-red-800">Error</h3>
        <p className="text-red-600">{error}</p>
        <button
          onClick={loadTrustedIssuers}
          className="mt-2 rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Trusted Issuers Registry</h2>
        <button
          onClick={loadTrustedIssuers}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-4">
          <p className="text-sm text-gray-600">Contract Address:</p>
          <code className="text-xs">{TRUSTED_ISSUERS_REGISTRY_ADDRESS}</code>
        </div>
        <div>
          <p className="text-sm text-gray-600">Network:</p>
          <code className="text-xs">{NETWORK_CONFIG.chainName}</code>
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-xl font-semibold">
          Trusted Issuers ({issuers.length})
        </h3>

        {issuers.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
            <p className="text-gray-600">No trusted issuers registered yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {issuerDetails.map((issuer, index) => (
              <div
                key={index}
                className="rounded-lg border border-gray-200 bg-white p-4 hover:border-blue-300"
              >
                <div className="mb-2 flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-700">Address:</p>
                    <code className="text-xs break-all">{issuer.address}</code>
                  </div>
                  <span
                    className={`ml-2 rounded px-2 py-1 text-xs font-medium ${
                      issuer.isTrusted
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {issuer.isTrusted ? 'Trusted' : 'Not Trusted'}
                  </span>
                </div>

                <div className="mt-2">
                  <p className="text-sm font-medium text-gray-700">Claim Topics:</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {issuer.claimTopics.map((topic, idx) => (
                      <span
                        key={idx}
                        className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-800"
                      >
                        Topic {topic.toString()}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => checkIssuer(issuer.address)}
                  className="mt-3 text-sm text-blue-600 hover:text-blue-800"
                >
                  Check Status
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <h4 className="mb-2 font-semibold text-blue-900">
          💡 Development Note
        </h4>
        <p className="text-sm text-blue-800">
          This is a read-only interface. To add or remove trusted issuers, use
          the contract owner account via a wallet or script. See the contract
          documentation in <code>lib/contracts/README.md</code> for more details.
        </p>
      </div>
    </div>
  );
}

