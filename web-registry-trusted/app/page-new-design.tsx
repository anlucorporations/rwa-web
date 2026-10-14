'use client';

import { useEffect, useState, useCallback } from 'react';
import { ethers, BrowserProvider } from 'ethers';
import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import FeaturesSection from '@/components/FeaturesSection';
import IssuersShowcase from '@/components/IssuersShowcase';
import Footer from '@/components/Footer';
import IssuerRequestsList from '@/components/IssuerRequestsList';
import RequestDetailModal from '@/components/RequestDetailModal';
import {
  TRUSTED_ISSUERS_REGISTRY_ADDRESS,
  TRUSTED_ISSUERS_REGISTRY_ABI,
  NETWORK_CONFIG,
  CONTRACT_OWNER,
} from '@/lib/contracts';
import { ClaimRequest } from '@/types/claim-request';
import { IssuerInfo } from '@/types/issuer';

interface IssuerData {
  address: string;
  claimTopics: bigint[];
  isTrusted: boolean;
  name?: string;
}

export default function Home() {
  const [issuers, setIssuers] = useState<string[]>([]);
  const [issuerDetails, setIssuerDetails] = useState<IssuerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [account, setAccount] = useState<string>('');
  const [isOwner, setIsOwner] = useState(false);
  const [isIssuer, setIsIssuer] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);

  // Form states
  const [newIssuerAddress, setNewIssuerAddress] = useState('');
  const [newIssuerName, setNewIssuerName] = useState('');
  const [claimTopicsInput, setClaimTopicsInput] = useState('1,7,9');
  const [addingIssuer, setAddingIssuer] = useState(false);
  const [showSetupGuide, setShowSetupGuide] = useState(false);

  // Request modal states
  const [selectedRequest, setSelectedRequest] = useState<ClaimRequest | null>(null);
  const [requestsRefreshTrigger, setRequestsRefreshTrigger] = useState(0);

  const handleAccountsChanged = useCallback((accounts: unknown) => {
    const accountsArray = accounts as string[];
    if (accountsArray.length === 0) {
      setAccount('');
      setIsOwner(false);
      console.log('Wallet disconnected');
    } else {
      const newAccount = accountsArray[0];
      setAccount(newAccount);
      const isNewOwner = newAccount.toLowerCase() === CONTRACT_OWNER.toLowerCase();
      setShowDashboard(true);
    }
  }, []);

  const handleChainChanged = useCallback(() => {
    console.log('Network changed, reloading page...');
    window.location.reload();
  }, []);

  const setupAccountListener = useCallback(() => {
    if (typeof window !== 'undefined' && window.ethereum && window.ethereum.on) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
    }
  }, [handleAccountsChanged, handleChainChanged]);

  useEffect(() => {
    loadTrustedIssuers();
    checkMetaMask();
    setupAccountListener();

    return () => {
      if (typeof window !== 'undefined' && window.ethereum && window.ethereum.removeListener) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, [setupAccountListener, handleAccountsChanged, handleChainChanged]);

  useEffect(() => {
    if (account) {
      setIsOwner(account.toLowerCase() === CONTRACT_OWNER.toLowerCase());
      checkIfIssuer(account);
    }
  }, [account]);

  const checkIfIssuer = async (address: string) => {
    try {
      const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
      const contract = new ethers.Contract(
        TRUSTED_ISSUERS_REGISTRY_ADDRESS,
        TRUSTED_ISSUERS_REGISTRY_ABI,
        provider
      );
      const isTrusted = await contract.isTrustedIssuer(address);
      setIsIssuer(isTrusted);
    } catch (err) {
      console.error('Error checking issuer status:', err);
      setIsIssuer(false);
    }
  };

  const handleRequestUpdate = () => {
    setRequestsRefreshTrigger((prev) => prev + 1);
  };

  const disconnectWallet = () => {
    setAccount('');
    setIsOwner(false);
    setShowDashboard(false);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert(`${label} copiado al portapapeles!`);
    });
  };

  const checkMetaMask = async () => {
    if (typeof window !== 'undefined' && typeof window.ethereum !== 'undefined') {
      try {
        const provider = new BrowserProvider(window.ethereum);
        const accounts = await provider.listAccounts();
        if (accounts.length > 0) {
          const signer = await provider.getSigner();
          const address = await signer.getAddress();
          setAccount(address);
          setShowDashboard(true);
        }
      } catch (err) {
        console.error('Error checking MetaMask:', err);
      }
    }
  };

  const connectWallet = async () => {
    if (typeof window === 'undefined' || typeof window.ethereum === 'undefined') {
      alert('Please install MetaMask to interact with this application');
      return;
    }

    try {
      const provider = new BrowserProvider(window.ethereum);
      await provider.send('eth_requestAccounts', []);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      setAccount(address);
      setShowDashboard(true);

      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${NETWORK_CONFIG.chainId.toString(16)}` }],
        });
      } catch (switchError: unknown) {
        if ((switchError as { code?: number }).code === 4902) {
          alert(`Please add network ${NETWORK_CONFIG.chainName} to MetaMask manually`);
        }
      }
    } catch (err) {
      console.error('Error connecting wallet:', err);
      setError(err instanceof Error ? err.message : 'Error connecting wallet');
    }
  };

  const loadTrustedIssuers = async () => {
    try {
      setLoading(true);
      setError(null);

      const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
      const contract = new ethers.Contract(
        TRUSTED_ISSUERS_REGISTRY_ADDRESS,
        TRUSTED_ISSUERS_REGISTRY_ABI,
        provider
      );

      const issuerAddresses = await contract.getTrustedIssuers();
      setIssuers(issuerAddresses);

      const issuerNamesResponse = await fetch('/api/issuers/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addresses: issuerAddresses }),
      });

      const issuerNamesResult = await issuerNamesResponse.json();
      const issuerNamesMap: Record<string, string> = {};

      if (issuerNamesResult.success && issuerNamesResult.data) {
        Object.values(issuerNamesResult.data).forEach((issuer: IssuerInfo) => {
          issuerNamesMap[issuer.address.toLowerCase()] = issuer.name;
        });
      }

      const details = await Promise.all(
        issuerAddresses.map(async (address: string) => {
          const claimTopics = await contract.getIssuerClaimTopics(address);
          const isTrusted = await contract.isTrustedIssuer(address);
          const name = issuerNamesMap[address.toLowerCase()];

          return {
            address,
            claimTopics,
            isTrusted,
            name,
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

  const addTrustedIssuer = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!account) {
      alert('Please connect your wallet first');
      return;
    }

    if (!isOwner) {
      alert('Only the contract owner can add trusted issuers');
      return;
    }

    if (!ethers.isAddress(newIssuerAddress)) {
      alert('Please enter a valid Ethereum address');
      return;
    }

    try {
      setAddingIssuer(true);
      setError(null);

      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(
        TRUSTED_ISSUERS_REGISTRY_ADDRESS,
        TRUSTED_ISSUERS_REGISTRY_ABI,
        signer
      );

      const claimTopics = claimTopicsInput
        .split(',')
        .map((topic) => topic.trim())
        .filter((topic) => topic !== '')
        .map((topic) => BigInt(topic));

      if (claimTopics.length === 0) {
        alert('Please enter at least one claim topic');
        return;
      }

      const tx = await contract.addTrustedIssuer(newIssuerAddress, claimTopics);
      await tx.wait();

      if (newIssuerName.trim()) {
        try {
          await fetch('/api/issuers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              address: newIssuerAddress,
              name: newIssuerName.trim(),
            }),
          });
        } catch (err) {
          console.error('Error saving issuer name:', err);
        }
      }

      alert('Trusted issuer added successfully!');

      setNewIssuerAddress('');
      setNewIssuerName('');
      setClaimTopicsInput('1');

      await loadTrustedIssuers();
    } catch (err) {
      console.error('Error adding trusted issuer:', err);
      setError(err instanceof Error ? err.message : 'Error adding trusted issuer');
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setAddingIssuer(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col">
      {/* Header */}
      <Header
        account={account}
        isConnected={!!account}
        onConnectWallet={connectWallet}
        onDisconnect={disconnectWallet}
      />

      {/* Main Content */}
      <main className="flex-1">
        {!showDashboard || !account ? (
          <>
            {/* Hero Section */}
            <HeroSection isConnected={!!account} onConnectWallet={connectWallet} />

            {/* Features Section */}
            <FeaturesSection />

            {/* Issuers Showcase */}
            <IssuersShowcase
              stats={{
                totalIssuers: issuers.length,
                activeIssuers: issuers.length,
                verifiedClaims: 1234,
                networkUptime: 100,
              }}
            />
          </>
        ) : (
          /* Dashboard Section */
          <div className="py-8 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-gray-50/50 dark:from-gray-950 dark:to-gray-900/50 min-h-screen">
            <div className="mx-auto max-w-7xl">
              {/* Page Header */}
              <div className="mb-8">
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                  Registry Dashboard
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                  Manage trusted issuers and verify claims
                </p>
              </div>

              {/* Error Display */}
              {error && (
                <div className="mb-6 rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
                  <h3 className="text-lg font-semibold text-red-800 dark:text-red-400">Error</h3>
                  <p className="text-red-600 dark:text-red-300">{error}</p>
                  <button
                    onClick={loadTrustedIssuers}
                    className="mt-2 rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
                  >
                    Retry
                  </button>
                </div>
              )}

              <div className="grid gap-6 lg:grid-cols-3">
                {/* Add Issuer Form - only for owner */}
                {isOwner && (
                  <div className="lg:col-span-1">
                    <div className="rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800">
                      <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
                        Add Trusted Issuer
                      </h2>

                      <form onSubmit={addTrustedIssuer} className="space-y-4">
                        <div>
                          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Nombre del Issuer
                          </label>
                          <input
                            type="text"
                            value={newIssuerName}
                            onChange={(e) => setNewIssuerName(e.target.value)}
                            placeholder="Ej: KYC Provider, AML Provider..."
                            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            required
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Issuer Address
                          </label>
                          <input
                            type="text"
                            value={newIssuerAddress}
                            onChange={(e) => setNewIssuerAddress(e.target.value)}
                            placeholder="0x..."
                            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            required
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Claim Topics (comma-separated)
                          </label>
                          <input
                            type="text"
                            value={claimTopicsInput}
                            onChange={(e) => setClaimTopicsInput(e.target.value)}
                            placeholder="1, 2, 3"
                            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            required
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={addingIssuer}
                          className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {addingIssuer ? 'Adding...' : 'Add Trusted Issuer'}
                        </button>
                      </form>
                    </div>
                  </div>
                )}

                {/* Issuers List */}
                <div className={isOwner ? 'lg:col-span-2' : 'lg:col-span-3'}>
                  <div className="rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800">
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        Trusted Issuers ({issuers.length})
                      </h2>
                      <button
                        onClick={loadTrustedIssuers}
                        disabled={loading}
                        className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-300 disabled:opacity-50 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                      >
                        {loading ? 'Loading...' : 'Refresh'}
                      </button>
                    </div>

                    {loading ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="text-lg text-gray-600 dark:text-gray-400">
                          Loading trusted issuers...
                        </div>
                      </div>
                    ) : issuers.length === 0 ? (
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-900">
                        <p className="text-gray-600 dark:text-gray-400">
                          No trusted issuers registered yet.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {issuerDetails.map((issuer, index) => (
                          <div
                            key={index}
                            className="rounded-lg border border-gray-200 bg-gray-50 p-4 transition-all hover:border-blue-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-900"
                          >
                            <div className="mb-3 flex items-start justify-between">
                              <div className="flex-1">
                                {issuer.name && (
                                  <div className="mb-2">
                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                      Nombre
                                    </p>
                                    <p className="text-base font-semibold text-gray-900 dark:text-white">
                                      {issuer.name}
                                    </p>
                                  </div>
                                )}
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                  Address
                                </p>
                                <code className="block break-all text-sm text-gray-900 dark:text-white">
                                  {issuer.address}
                                </code>
                              </div>
                              <span className="ml-2 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800 dark:bg-green-900 dark:text-green-200">
                                ✓ Trusted
                              </span>
                            </div>

                            <div>
                              <p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                                Claim Topics
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {issuer.claimTopics.map((topic, idx) => (
                                  <span
                                    key={idx}
                                    className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                  >
                                    Topic {topic.toString()}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Issuer Requests Section */}
              {isIssuer && (
                <div className="mt-8">
                  <div className="mb-4 rounded-lg border-2 border-purple-300 bg-purple-50 p-4 dark:border-purple-800 dark:bg-purple-900/20">
                    <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-300">
                      🎫 Issuer Panel
                    </h3>
                    <p className="mt-1 text-sm text-purple-800 dark:text-purple-400">
                      You are a trusted issuer. Review and approve claim requests sent to your
                      address.
                    </p>
                  </div>

                  <IssuerRequestsList
                    key={requestsRefreshTrigger}
                    issuerAddress={account}
                    onSelectRequest={setSelectedRequest}
                  />
                </div>
              )}

              {selectedRequest && (
                <RequestDetailModal
                  request={selectedRequest}
                  issuerAddress={account}
                  onClose={() => setSelectedRequest(null)}
                  onUpdate={handleRequestUpdate}
                />
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
