'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  getAllIssuers,
  getAllClaimTopics,
  getIssuerDetails,
  getClaimTopicDetails,
  addClaimTopicToIssuer,
  removeClaimTopicFromIssuer,
  getIssuerClaimTopics,
  isOwner,
} from '@/lib/contractCalls';
import { switchToBesuNetwork } from '@/lib/web3';

interface IssuerOption {
  address: string;
  name: string;
}

interface ClaimTopicOption {
  id: bigint;
  name: string;
}

export default function ManageIssuerClaims() {
  const [walletAddress, setWalletAddress] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [issuers, setIssuers] = useState<IssuerOption[]>([]);
  const [claimTopics, setClaimTopics] = useState<ClaimTopicOption[]>([]);
  const [selectedIssuer, setSelectedIssuer] = useState('');
  const [selectedClaimTopic, setSelectedClaimTopic] = useState('');
  const [issuerClaimTopics, setIssuerClaimTopics] = useState<bigint[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);

  // Connect wallet
  const handleConnectWallet = async () => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        await switchToBesuNetwork();
        const accounts = await (window as any).ethereum.request({
          method: 'eth_requestAccounts',
        });
        setWalletAddress(accounts[0]);
        setIsConnected(true);
        setMessage(null);
      } catch (error) {
        setMessage({ type: 'error', text: 'Failed to connect wallet' });
      }
    }
  };

  // Load issuers and claim topics
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [issuerAddresses, topicIds] = await Promise.all([
          getAllIssuers(),
          getAllClaimTopics(),
        ]);

        // Fetch issuer details
        const issuerList: IssuerOption[] = [];
        for (const address of issuerAddresses) {
          try {
            const details = await getIssuerDetails(address);
            if (details) {
              issuerList.push({ address, name: details.name });
            }
          } catch {
            issuerList.push({ address, name: 'Unknown' });
          }
        }
        setIssuers(issuerList);

        // Fetch claim topic details
        const topicList: ClaimTopicOption[] = [];
        for (const id of topicIds) {
          try {
            const details = await getClaimTopicDetails(id);
            if (details) {
              topicList.push({ id, name: details.name });
            }
          } catch {
            topicList.push({ id, name: `Topic ${id}` });
          }
        }
        setClaimTopics(topicList);
      } catch (error) {
        console.error('Failed to load options:', error);
      }
    };

    loadOptions();
  }, []);

  // Load issuer's claim topics when issuer is selected
  useEffect(() => {
    const loadIssuerClaims = async () => {
      if (!selectedIssuer) {
        setIssuerClaimTopics([]);
        return;
      }
      try {
        const topics = await getIssuerClaimTopics(selectedIssuer);
        setIssuerClaimTopics(topics);
      } catch (error) {
        console.error('Failed to load issuer claims:', error);
      }
    };

    loadIssuerClaims();
  }, [selectedIssuer]);

  // Add claim to issuer
  const handleAddClaim = async () => {
    if (!selectedIssuer || !selectedClaimTopic) {
      setMessage({ type: 'error', text: 'Please select both issuer and claim topic' });
      return;
    }

    setLoading(true);
    try {
      const hash = await addClaimTopicToIssuer(selectedIssuer, Number(selectedClaimTopic));
      setMessage({
        type: 'success',
        text: `Claim topic added successfully! Transaction: ${hash.slice(0, 10)}...`,
      });
      // Reload issuer claims
      const topics = await getIssuerClaimTopics(selectedIssuer);
      setIssuerClaimTopics(topics);
      setSelectedClaimTopic('');
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'Failed to add claim topic to issuer',
      });
    } finally {
      setLoading(false);
    }
  };

  // Remove claim from issuer
  const handleRemoveClaim = async (claimTopicId: bigint) => {
    if (!selectedIssuer) return;

    setLoading(true);
    try {
      const hash = await removeClaimTopicFromIssuer(selectedIssuer, Number(claimTopicId));
      setMessage({
        type: 'success',
        text: `Claim topic removed successfully! Transaction: ${hash.slice(0, 10)}...`,
      });
      // Reload issuer claims
      const topics = await getIssuerClaimTopics(selectedIssuer);
      setIssuerClaimTopics(topics);
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'Failed to remove claim topic from issuer',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold hover:text-gray-600">
            RegistryChain
          </Link>
          <div className="flex gap-4">
            <Link href="/dashboard" className="text-gray-700 hover:text-black">
              Dashboard
            </Link>
            <Link href="/register-issuer" className="text-gray-700 hover:text-black">
              Register Issuer
            </Link>
            <Link href="/register-claim-topic" className="text-gray-700 hover:text-black">
              Register Topic
            </Link>
            <Link href="/manage-issuer-claims" className="text-gray-700 hover:text-black font-semibold">
              Manage Claims
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-8">Manage Issuer Claims</h1>

        {!isConnected ? (
          <div className="p-6 bg-gray-50 border border-gray-200 rounded text-center">
            <p className="text-gray-700 mb-4">Connect your MetaMask wallet to manage issuer claims</p>
            <button
              onClick={handleConnectWallet}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Connect MetaMask
            </button>
          </div>
        ) : (
          <>
            {/* Wallet Info */}
            <div className="p-4 bg-gray-50 border border-gray-200 rounded mb-6">
              <p className="text-sm text-gray-600 mb-1">Connected Wallet</p>
              <code className="text-sm text-gray-700">
                {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </code>
              <div className="mt-2">
                {isOwner(walletAddress) ? (
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">✓ Owner Access</span>
                ) : (
                  <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">✗ Not Owner</span>
                )}
              </div>
            </div>

            {isOwner(walletAddress) ? (
              <>
                {/* Issuer Selection */}
                <div className="bg-white border border-gray-200 rounded p-6 mb-6">
                  <h2 className="text-xl font-bold mb-4">Select Issuer</h2>
                  <select
                    value={selectedIssuer}
                    onChange={(e) => setSelectedIssuer(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Choose an issuer...</option>
                    {issuers.map((issuer) => (
                      <option key={issuer.address} value={issuer.address}>
                        {issuer.name} ({issuer.address.slice(0, 6)}...{issuer.address.slice(-4)})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedIssuer && (
                  <>
                    {/* Current Claims */}
                    <div className="bg-white border border-gray-200 rounded p-6 mb-6">
                      <h2 className="text-xl font-bold mb-4">Current Claims ({issuerClaimTopics.length})</h2>
                      {issuerClaimTopics.length === 0 ? (
                        <p className="text-gray-600">No claim topics assigned to this issuer</p>
                      ) : (
                        <div className="space-y-2">
                          {issuerClaimTopics.map((topicId) => {
                            const topicName = claimTopics.find((t) => t.id === topicId)?.name || `Topic ${topicId}`;
                            return (
                              <div
                                key={topicId.toString()}
                                className="flex justify-between items-center p-3 bg-gray-50 border border-gray-200 rounded"
                              >
                                <div>
                                  <p className="font-semibold text-gray-900">{topicName}</p>
                                  <code className="text-xs text-gray-500">ID: {topicId.toString()}</code>
                                </div>
                                <button
                                  onClick={() => handleRemoveClaim(topicId)}
                                  disabled={loading}
                                  className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400 text-sm"
                                >
                                  Remove
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Add Claim */}
                    <div className="bg-white border border-gray-200 rounded p-6 mb-6">
                      <h2 className="text-xl font-bold mb-4">Add Claim Topic</h2>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Select Claim Topic</label>
                          <select
                            value={selectedClaimTopic}
                            onChange={(e) => setSelectedClaimTopic(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                          >
                            <option value="">Choose a claim topic...</option>
                            {claimTopics
                              .filter((topic) => !issuerClaimTopics.includes(topic.id))
                              .map((topic) => (
                                <option key={topic.id.toString()} value={topic.id.toString()}>
                                  {topic.name} (ID: {topic.id.toString()})
                                </option>
                              ))}
                          </select>
                        </div>

                        {message && (
                          <div
                            className={`p-3 rounded text-sm ${
                              message.type === 'success'
                                ? 'bg-green-100 text-green-800 border border-green-300'
                                : 'bg-red-100 text-red-800 border border-red-300'
                            }`}
                          >
                            {message.text}
                          </div>
                        )}

                        <button
                          onClick={handleAddClaim}
                          disabled={loading || !selectedClaimTopic}
                          className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                        >
                          {loading ? 'Adding...' : 'Add Claim Topic'}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="p-4 bg-yellow-50 border border-yellow-300 text-yellow-800 rounded">
                Only the contract owner can manage issuer claims.
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
