'use client';

import { useAccount, useConnect, useDisconnect, useReadContract } from 'wagmi';

import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import FeaturesSection from '@/components/FeaturesSection';
import IssuersShowcase from '@/components/IssuersShowcase';
import Footer from '@/components/Footer';
import {
  TRUSTED_ISSUERS_REGISTRY_ADDRESS,
  TRUSTED_ISSUERS_REGISTRY_ABI,
} from '@/lib/contracts';
import { useToast } from '@rwa/ui';

/**
 * Landing de la app de emisor. Migrada a wagmi+viem (O4.6): cuenta y conexión
 * vienen de los hooks y el contador de emisores es una lectura tipada.
 */
export default function LandingPage() {
  const toast = useToast();
  const { address, isConnected } = useAccount();
  const { connectAsync, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  const { data: issuersCountRaw } = useReadContract({
    address: TRUSTED_ISSUERS_REGISTRY_ADDRESS,
    abi: TRUSTED_ISSUERS_REGISTRY_ABI,
    functionName: 'getTrustedIssuersCount',
  });

  const issuersCount = issuersCountRaw ? Number(issuersCountRaw) : 0;

  const connectWallet = async () => {
    try {
      const target = connectors.find((connector) => connector.id === 'injected') ?? connectors[0];
      if (!target) {
        throw new Error('Please install MetaMask to interact with this application');
      }
      await connectAsync({ connector: target });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error connecting wallet');
    }
  };

  const disconnectWallet = () => {
    disconnect();
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col">
      {/* Header */}
      <Header
        account={address ?? ''}
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
