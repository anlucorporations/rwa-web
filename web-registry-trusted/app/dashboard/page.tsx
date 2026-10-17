'use client';

import { useEffect, useState, useCallback } from 'react';
import { ethers, BrowserProvider } from 'ethers';
import {
  TRUSTED_ISSUERS_REGISTRY_ADDRESS,
  TRUSTED_ISSUERS_REGISTRY_ABI,
  NETWORK_CONFIG,
  CONTRACT_OWNER,
} from '@/lib/contracts';
import { CANONICAL_CHAIN_ID, DEMO_ACCOUNTS, getRpcUrl } from '@rwa/shared/network';
import IssuerRequestsList from '@/components/IssuerRequestsList';
import RequestDetailModal from '@/components/RequestDetailModal';
import { ClaimRequest } from '@/types/claim-request';

interface IssuerData {
  address: string;
  claimTopics: bigint[];
  isTrusted: boolean;
}

/**
 * RPC que se muestra en la guía de configuración. `getRpcUrl()` es perezoso y
 * lanza si el entorno no define `NEXT_PUBLIC_RPC_URL`; la guía no debe romperse
 * por eso, solo avisar de la configuración pendiente.
 */
function getRpcUrlForDisplay(): string {
  try {
    return getRpcUrl();
  } catch {
    return 'No configurada: define NEXT_PUBLIC_RPC_URL en .env.local';
  }
}

export default function Home() {
  const [issuers, setIssuers] = useState<string[]>([]);
  const [issuerDetails, setIssuerDetails] = useState<IssuerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [account, setAccount] = useState<string>('');
  const [isOwner, setIsOwner] = useState(false);
  const [isIssuer, setIsIssuer] = useState(false);
  
  // Form states
  const [newIssuerAddress, setNewIssuerAddress] = useState('');
  const [claimTopicsInput, setClaimTopicsInput] = useState('1,7,9');
  const [addingIssuer, setAddingIssuer] = useState(false);
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  
  // Request modal states
  const [selectedRequest, setSelectedRequest] = useState<ClaimRequest | null>(null);
  const [requestsRefreshTrigger, setRequestsRefreshTrigger] = useState(0);

  const handleAccountsChanged = useCallback((accounts: unknown) => {
    const accountsArray = accounts as string[];
    if (accountsArray.length === 0) {
      // User disconnected their wallet
      setAccount('');
      setIsOwner(false);
      console.log('Wallet disconnected');
      alert('Wallet disconnected');
    } else {
      // User switched accounts
      const newAccount = accountsArray[0];
      setAccount(newAccount);
      console.log('Account changed to:', newAccount);
      
      // Show notification
      const isNewOwner = newAccount.toLowerCase() === CONTRACT_OWNER.toLowerCase();
      alert(`Account changed to: ${newAccount}\n${isNewOwner ? '✓ You are the contract owner' : '✗ You are not the owner'}`);
    }
  }, []);

  const handleChainChanged = useCallback(() => {
    // When the network changes, reload the page
    console.log('Network changed, reloading page...');
    window.location.reload();
  }, []);

  const setupAccountListener = useCallback(() => {
    if (typeof window !== 'undefined' && window.ethereum && window.ethereum.on) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
      console.log('Account and chain change listeners setup');
    }
  }, [handleAccountsChanged, handleChainChanged]);

  useEffect(() => {
    loadTrustedIssuers();
    checkMetaMask();
    setupAccountListener();
    
    // Cleanup function
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
    setRequestsRefreshTrigger(prev => prev + 1);
  };

  const disconnectWallet = () => {
    setAccount('');
    setIsOwner(false);
    console.log('Wallet disconnected manually');
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert(`${label} copiado al portapapeles!`);
    }).catch(() => {
      alert('Error al copiar. Por favor, copia manualmente.');
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

      // Switch to the correct network
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${NETWORK_CONFIG.chainId.toString(16)}` }],
        });
      } catch (switchError: unknown) {
        // This error code indicates that the chain has not been added to MetaMask
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

      // Parse claim topics from input (comma-separated numbers)
      const claimTopics = claimTopicsInput
        .split(',')
        .map(topic => topic.trim())
        .filter(topic => topic !== '')
        .map(topic => BigInt(topic));

      if (claimTopics.length === 0) {
        alert('Please enter at least one claim topic');
        return;
      }

      console.log('Adding trusted issuer:', newIssuerAddress, 'with claim topics:', claimTopics);

      const tx = await contract.addTrustedIssuer(newIssuerAddress, claimTopics);
      console.log('Transaction sent:', tx.hash);
      
      await tx.wait();
      console.log('Transaction confirmed');

      alert('Trusted issuer added successfully!');
      
      // Reset form
      setNewIssuerAddress('');
      setClaimTopicsInput('1');
      
      // Reload issuers
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Setup Guide Modal */}
        {showSetupGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  🔧 Configuración de MetaMask
                </h2>
                <button
                  onClick={() => setShowSetupGuide(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                {/* Step 1 */}
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
                  <h3 className="mb-2 font-semibold text-blue-900 dark:text-blue-300">
                    Paso 1: Agregar Red Anvil Local
                  </h3>
                  <ol className="list-inside list-decimal space-y-1 text-sm text-blue-800 dark:text-blue-300">
                    <li>Abre MetaMask</li>
                    <li>Haz clic en el selector de redes (arriba)</li>
                    <li>Selecciona &quot;Add network manually&quot;</li>
                    <li>Completa los datos:</li>
                  </ol>
                  <div className="mt-3 rounded bg-white p-3 font-mono text-xs dark:bg-gray-900">
                    <div><strong>Network Name:</strong> {NETWORK_CONFIG.chainName}</div>
                    <div><strong>RPC URL:</strong> {getRpcUrlForDisplay()}</div>
                    <div><strong>Chain ID:</strong> {CANONICAL_CHAIN_ID}</div>
                    <div><strong>Currency Symbol:</strong> ETH</div>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
                  <h3 className="mb-2 font-semibold text-green-900 dark:text-green-300">
                    Paso 2: Importar Cuenta Owner
                  </h3>
                  <p className="mb-2 text-sm text-green-800 dark:text-green-300">
                    Para agregar issuers, necesitas importar la cuenta owner
                    ({DEMO_ACCOUNTS[0].role}):
                  </p>
                  <div className="rounded bg-white p-3 dark:bg-gray-900">
                    <div className="mb-3">
                      <div className="mb-1 flex items-center justify-between">
                        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                          Address:
                        </p>
                        <button
                          onClick={() => copyToClipboard(DEMO_ACCOUNTS[0].address, 'Address')}
                          className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300"
                        >
                          📋 Copiar
                        </button>
                      </div>
                      <code className="block break-all text-xs text-gray-900 dark:text-white">
                        {DEMO_ACCOUNTS[0].address}
                      </code>
                    </div>
                    <div>
                      <div className="mb-1 flex items-center justify-between">
                        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                          Private Key:
                        </p>
                        <button
                          onClick={() => copyToClipboard(DEMO_ACCOUNTS[0].privateKey, 'Private Key')}
                          className="rounded bg-green-100 px-2 py-1 text-xs text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-300"
                        >
                          📋 Copiar
                        </button>
                      </div>
                      <code className="block break-all text-xs text-gray-900 dark:text-white">
                        {DEMO_ACCOUNTS[0].privateKey}
                      </code>
                    </div>
                  </div>
                  <ol className="mt-3 list-inside list-decimal space-y-1 text-sm text-green-800 dark:text-green-300">
                    <li>En MetaMask, haz clic en tu icono de cuenta</li>
                    <li>Selecciona &quot;Import account&quot;</li>
                    <li>Pega la Private Key</li>
                    <li>Haz clic en &quot;Import&quot;</li>
                  </ol>
                </div>

                {/* Additional Accounts */}
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/50">
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-gray-300">
                    Cuentas Adicionales (para testing)
                  </h3>
                  <div className="space-y-2 text-xs">
                    {DEMO_ACCOUNTS.slice(1).map((demoAccount) => (
                      <div key={demoAccount.address} className="rounded bg-white p-2 dark:bg-gray-800">
                        <p className="font-semibold">{demoAccount.role}:</p>
                        <code className="block break-all">{demoAccount.address}</code>
                        <code className="block break-all text-gray-500">PK: {demoAccount.privateKey}</code>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Warning */}
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
                  <h3 className="mb-2 font-semibold text-red-900 dark:text-red-300">
                    ⚠️ IMPORTANTE
                  </h3>
                  <p className="text-sm text-red-800 dark:text-red-300">
                    NUNCA uses estas private keys en redes reales (mainnet, testnets). 
                    Son solo para desarrollo local con Anvil.
                  </p>
                </div>

                <button
                  onClick={() => setShowSetupGuide(false)}
                  className="w-full rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Trusted Issuers Registry
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Contract: {TRUSTED_ISSUERS_REGISTRY_ADDRESS}
            </p>
          </div>
          
          {!account ? (
            <div className="flex gap-2">
              <button
                onClick={connectWallet}
                className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
              >
                Connect Wallet
              </button>
              <button
                onClick={() => setShowSetupGuide(true)}
                className="rounded-lg border-2 border-blue-600 bg-transparent px-4 py-3 font-semibold text-blue-600 transition-colors hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-900/20"
                title="¿Necesitas ayuda para configurar MetaMask?"
              >
                ℹ️ Ayuda
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="rounded-lg bg-white px-4 py-3 shadow-md dark:bg-gray-800">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Connected Account:</p>
                <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                  {account}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  {isOwner ? (
                    <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800 dark:bg-green-900 dark:text-green-200">
                      ✓ Contract Owner
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                      Regular User
                    </span>
                  )}
                  <button
                    onClick={disconnectWallet}
                    className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            </div>
          )}
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

        {/* Owner Only Section - Add Issuer & List */}
        {account && isOwner && (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left Column - Add Issuer Form */}
            <div className="lg:col-span-1">
              <div className="rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800">
                <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
                  Add Trusted Issuer
                </h2>

                <form onSubmit={addTrustedIssuer} className="space-y-4">
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
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Example: 1, 2, 3 or just 1
                    </p>
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

            {/* Right Column - Issuers List */}
            <div className="lg:col-span-2">
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
        )}

        {/* Issuer Requests Section - Only show if connected account is an issuer */}
        {account && isIssuer && (
          <div className="mt-8">
            <div className="mb-4 rounded-lg border-2 border-purple-300 bg-purple-50 p-4 dark:border-purple-800 dark:bg-purple-900/20">
              <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-300">
                🎫 Issuer Panel
              </h3>
              <p className="mt-1 text-sm text-purple-800 dark:text-purple-400">
                You are a trusted issuer. Review and approve claim requests sent to your address.
              </p>
            </div>

            <IssuerRequestsList 
              key={requestsRefreshTrigger}
              issuerAddress={account}
              onSelectRequest={setSelectedRequest}
            />
          </div>
        )}

        {/* Request Detail Modal */}
        {selectedRequest && (
          <RequestDetailModal
            request={selectedRequest}
            issuerAddress={account}
            onClose={() => setSelectedRequest(null)}
            onUpdate={handleRequestUpdate}
          />
        )}

        {/* Info Box */}
        <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="font-semibold text-blue-900 dark:text-blue-400">
              ℹ️ Información
            </h4>
            <button
              onClick={() => setShowSetupGuide(true)}
              className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700"
            >
              📖 Guía de Configuración
            </button>
          </div>
          <ul className="list-inside list-disc space-y-1 text-sm text-blue-800 dark:text-blue-300">
            <li>Conecta tu wallet para interactuar con el contrato</li>
            <li>Solo el owner del contrato puede agregar issuers</li>
            <li>Los issuers pueden ver y aprobar peticiones de claims</li>
            <li>Asegúrate de estar conectado a {NETWORK_CONFIG.chainName}</li>
            <li>Los claim topics son números que representan diferentes tipos de claims</li>
            <li>Si no tienes cuentas en MetaMask, haz clic en &quot;Guía de Configuración&quot;</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
