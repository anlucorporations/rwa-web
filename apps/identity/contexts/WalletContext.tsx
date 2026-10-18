'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { ethers, type Eip1193Provider } from 'ethers';
import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi';

import { CANONICAL_CHAIN_ID } from '@rwa/shared/network';

/**
 * Capa de wallet de la app de identidad (O4.6).
 *
 * Se apoya en **wagmi** (conector inyectado) en lugar de `window.ethereum` directo.
 * Mantiene la misma API pública que consumían los componentes, incluido el
 * `ethers.BrowserProvider` mientras dure la migración de los contratos a viem.
 */
interface WalletContextType {
  provider: ethers.BrowserProvider | null;
  account: string;
  walletName: string;
  isConnected: boolean;
  isConnecting: boolean;
  error: string;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  clearError: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const { address, isConnected, connector } = useAccount();
  const { connectAsync, connectors, isPending, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChainAsync } = useSwitchChain();

  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [error, setError] = useState('');

  // Deriva un BrowserProvider de ethers a partir del proveedor del conector wagmi.
  useEffect(() => {
    let cancelled = false;
    if (!connector) {
      setProvider(null);
      return;
    }
    void (async () => {
      try {
        const eip1193 = (await connector.getProvider()) as Eip1193Provider;
        if (!cancelled) setProvider(new ethers.BrowserProvider(eip1193));
      } catch {
        if (!cancelled) setProvider(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [connector, address]);

  useEffect(() => {
    if (connectError) setError(connectError.message);
  }, [connectError]);

  const connectWallet = useCallback(async () => {
    setError('');
    try {
      const target = connectors.find((item) => item.id === 'injected') ?? connectors[0];
      if (!target) {
        throw new Error('No se detectó una wallet. Instala MetaMask o una compatible.');
      }
      await connectAsync({ connector: target });
      try {
        await switchChainAsync({ chainId: CANONICAL_CHAIN_ID });
      } catch {
        // La wallet puede no soportar cambio de cadena; la UI lo refleja con el chainId.
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo conectar la wallet');
    }
  }, [connectAsync, connectors, switchChainAsync]);

  const disconnectWallet = useCallback(() => {
    disconnect();
    setProvider(null);
    setError('');
  }, [disconnect]);

  const clearError = useCallback(() => setError(''), []);

  const value: WalletContextType = {
    provider,
    account: address ?? '',
    walletName: connector?.name ?? '',
    isConnected,
    isConnecting: isPending,
    error,
    connectWallet,
    disconnectWallet,
    clearError,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletContextType {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
