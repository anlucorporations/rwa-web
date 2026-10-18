'use client';

import { useState } from 'react';
import { ethers } from 'ethers';
import {
  TOKEN_CLONE_FACTORY_ADDRESS,
  NETWORK_CONFIG,
  GAS_SAVINGS,
} from '@/lib/contracts';
import CreateTokenForm from '@/components/CreateTokenForm';
import TokensList from '@/components/TokensList';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';

import { getInjectedEip1193, isInjectedWalletAvailable } from '@rwa/shared/web3';
export default function FactoryPage() {
  const [connected, setConnected] = useState(false);
  const [userAddress, setUserAddress] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleTokenCreated = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const connectWallet = async () => {
    if (!isInjectedWalletAvailable()) {
      alert('Por favor instala MetaMask para continuar!');
      return;
    }

    try {
      const eip1193 = await getInjectedEip1193();
      if (!eip1193) throw new Error('Wallet no disponible');
      const provider = new ethers.BrowserProvider(eip1193 as ethers.Eip1193Provider);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      setUserAddress(address);
      setConnected(true);

          } catch (err) {
            alert('Error al conectar la wallet');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <Header />

      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 py-12 px-4 font-sans pt-24">
        <div className="mx-auto max-w-6xl">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-4xl font-bold text-white">
              🚀 RWA Token Factory
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Contract: {TOKEN_CLONE_FACTORY_ADDRESS}
            </p>
            <p className="text-lg text-slate-300 mt-2">
              Create compliant security tokens with automated investor verification
            </p>
          </div>

          {/* Wallet Connection */}
          <div className="mb-6 flex items-center justify-between rounded-lg border border-slate-700 bg-gradient-to-r from-slate-800/50 to-slate-900/50 p-4 shadow-md backdrop-blur-sm">
            <div>
              <p className="text-sm text-slate-400">Wallet Status</p>
              {connected ? (
                <p className="font-mono text-sm font-semibold text-emerald-400">
                  ✓ Connected: {userAddress.slice(0, 10)}...{userAddress.slice(-8)}
                </p>
              ) : (
                <p className="text-sm text-slate-500">Not connected</p>
              )}
            </div>
            {!connected && (
              <button
                onClick={connectWallet}
                className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-md font-semibold transition"
              >
                Connect Wallet
              </button>
            )}
          </div>

          {/* Gas Savings Info */}
          <div className="mb-6 rounded-lg border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 p-4 backdrop-blur-sm">
            <h3 className="mb-2 flex items-center gap-2 font-semibold text-emerald-300">
              ⚡ Gas Efficiency with EIP-1167 Clone Pattern
            </h3>
            <div className="grid gap-3 text-sm md:grid-cols-3">
              <div className="rounded-lg bg-white/5 p-3 border border-white/10">
                <p className="text-emerald-300">Clone Deployment:</p>
                <p className="text-xl font-bold text-emerald-400">{GAS_SAVINGS.cloneDeployment}</p>
              </div>
              <div className="rounded-lg bg-white/5 p-3 border border-white/10">
                <p className="text-emerald-300">Normal Deployment:</p>
                <p className="text-xl font-bold text-emerald-400">{GAS_SAVINGS.fullDeployment}</p>
              </div>
              <div className="rounded-lg bg-white/5 p-3 border border-white/10">
                <p className="text-emerald-300">Savings:</p>
                <p className="text-xl font-bold text-emerald-400">{GAS_SAVINGS.savings}</p>
              </div>
            </div>
          </div>

          {connected && (
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Create Token Form */}
              <div>
                <CreateTokenForm
                  userAddress={userAddress}
                  onSuccess={handleTokenCreated}
                />
              </div>

              {/* Tokens List */}
              <div>
                <TokensList
                  adminAddress={userAddress}
                  refreshTrigger={refreshTrigger}
                />
              </div>
            </div>
          )}

          {!connected && (
            <div className="rounded-lg border border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-blue-600/10 p-8 text-center backdrop-blur-sm">
              <p className="text-lg text-blue-300">
                👆 Connect your wallet to start creating RWA tokens
              </p>
            </div>
          )}

          {/* Info Footer */}
          <div className="mt-6 rounded-lg border border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-blue-600/10 p-4 backdrop-blur-sm">
            <h4 className="mb-2 font-semibold text-blue-300">
              💡 About RWA Tokens
            </h4>
            <p className="mb-3 text-sm text-blue-200">
              Create compliant Real World Asset (RWA) tokens using the EIP-1167 Minimal Proxy pattern.
              Each token includes automated compliance checks and investor claim requirements.
            </p>
            <ul className="list-inside list-disc space-y-1 text-sm text-blue-200">
              <li>98.3% gas savings with clone pattern</li>
              <li>Automated compliance verification</li>
              <li>Investor claim requirements (KYC, Accreditation, Jurisdiction)</li>
              <li>Integrates with Compliance Aggregator</li>
              <li>MongoDB storage for easy querying</li>
            </ul>
            <div className="mt-3 text-xs text-blue-300">
              <p>Factory: <code className="font-mono">{TOKEN_CLONE_FACTORY_ADDRESS}</code></p>
              <p>Network: {NETWORK_CONFIG.chainName} (Chain ID: {NETWORK_CONFIG.chainId})</p>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
