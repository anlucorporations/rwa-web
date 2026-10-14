'use client';

import { useState, useEffect } from 'react';
import { ethers, BrowserProvider } from 'ethers';
import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import FeaturesSection from '@/components/FeaturesSection';
import IssuersShowcase from '@/components/IssuersShowcase';
import Footer from '@/components/Footer';
import {
  TRUSTED_ISSUERS_REGISTRY_ADDRESS,
  TRUSTED_ISSUERS_REGISTRY_ABI,
  NETWORK_CONFIG,
} from '@/lib/contracts';

export default function LandingPage() {
  const [account, setAccount] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [issuersCount, setIssuersCount] = useState(0);

  useEffect(() => {
    checkMetaMask();
    loadIssuersCount();
  }, []);

  const checkMetaMask = async () => {
    if (typeof window !== 'undefined' && typeof window.ethereum !== 'undefined') {
      try {
        const provider = new BrowserProvider(window.ethereum);
        const accounts = await provider.listAccounts();
        if (accounts.length > 0) {
          const signer = await provider.getSigner();
          const address = await signer.getAddress();
          setAccount(address);
          setIsConnected(true);
        }
      } catch (err) {
        console.error('Error checking MetaMask:', err);
      }
    }
  };

  const loadIssuersCount = async () => {
    try {
      const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
      const contract = new ethers.Contract(
        TRUSTED_ISSUERS_REGISTRY_ADDRESS,
        TRUSTED_ISSUERS_REGISTRY_ABI,
        provider
      );
      const count = await contract.getTrustedIssuersCount();
      setIssuersCount(Number(count));
    } catch (err) {
      console.error('Error loading issuers count:', err);
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
      setIsConnected(true);

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
      alert(err instanceof Error ? err.message : 'Error connecting wallet');
    }
  };

  const disconnectWallet = () => {
    setAccount('');
    setIsConnected(false);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col">
      {/* Header */}
      <Header
        account={account}
        isConnected={isConnected}
        onConnectWallet={connectWallet}
        onDisconnect={disconnectWallet}
      />

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Section */}
        <HeroSection isConnected={isConnected} onConnectWallet={connectWallet} />

        {/* Dashboard Navigation - Show if wallet is connected */}
        {isConnected && (
          <div className="flex justify-center py-6">
            <a
              href="/dashboard"
              className="rounded-lg bg-blue-600 px-8 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
            >
              Go to Dashboard
            </a>
          </div>
        )}

        {/* Features Section */}
        <FeaturesSection />

        {/* Issuers Showcase */}
        <IssuersShowcase
          stats={{
            totalIssuers: issuersCount,
            activeIssuers: issuersCount,
            verifiedClaims: 1234,
            networkUptime: 100,
          }}
        />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
