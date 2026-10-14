"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { ethers } from 'ethers';
import { 
  setupBesuNetwork, 
  getWalletName,
  debugWallets 
} from '@/lib/contracts';

interface WalletContextType {
  // State
  provider: ethers.BrowserProvider | null;
  account: string;
  walletName: string;
  isConnected: boolean;
  isConnecting: boolean;
  error: string;
  
  // Actions
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  clearError: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

// Helper to get the preferred wallet provider
function getPreferredProvider() {
  if (typeof window === 'undefined') {
    return null;
  }

  // Use window.ethereum (MetaMask or other compatible wallet)
  if (window.ethereum) {
    return window.ethereum;
  }

  return null;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [account, setAccount] = useState<string>('');
  const [walletName, setWalletName] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const isConnected = !!account && !!provider;

  // Create a BrowserProvider from the wallet
  const createBrowserProvider = useCallback(() => {
    const walletProvider = getPreferredProvider();
    if (!walletProvider) {
      return null;
    }

    // Create a custom network for Besu to avoid unnecessary RPC calls
    const besuNetwork = {
      chainId: 81234,
      name: 'besu',
    };

    return new ethers.BrowserProvider(walletProvider, besuNetwork);
  }, []);

  // Check if wallet is already connected on mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        debugWallets();
        const name = getWalletName();
        setWalletName(name);

        if (name === 'None') {
          return;
        }

        const browserProvider = createBrowserProvider();
        if (!browserProvider) {
          return;
        }

        const accounts = await browserProvider.listAccounts();
        if (accounts.length > 0) {
          setProvider(browserProvider);
          setAccount(accounts[0].address);
        }
      } catch (err) {
        console.error('Error checking wallet connection:', err);
      }
    };

    checkConnection();
  }, [createBrowserProvider]);

  // Listen for account changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const walletProvider = window.ethereum;
    if (!walletProvider) return;

    const handleAccountsChanged = (accounts: string[]) => {
      console.log('🔄 Account changed:', accounts);
      
      if (accounts.length === 0) {
        // User disconnected
        setProvider(null);
        setAccount('');
      } else {
        // Account switched - recreate provider with new account
        const newProvider = createBrowserProvider();
        setProvider(newProvider);
        setAccount(accounts[0]);
      }
    };

    const handleChainChanged = (chainId: string) => {
      console.log('🔄 Chain changed:', chainId);
      // Reload the page on chain change (common practice)
      window.location.reload();
    };

    const handleDisconnect = () => {
      console.log('🔌 Wallet disconnected');
      setProvider(null);
      setAccount('');
    };

    // Support both 'on' and 'addEventListener' patterns
    if (typeof walletProvider.on === 'function') {
      walletProvider.on('accountsChanged', handleAccountsChanged);
      walletProvider.on('chainChanged', handleChainChanged);
      walletProvider.on('disconnect', handleDisconnect);
      console.log('👂 Event listeners registered for wallet events');
    } else {
      console.warn('⚠️ Wallet provider does not support event listeners');
    }

    return () => {
      if (typeof walletProvider.removeListener === 'function') {
        walletProvider.removeListener('accountsChanged', handleAccountsChanged);
        walletProvider.removeListener('chainChanged', handleChainChanged);
        walletProvider.removeListener('disconnect', handleDisconnect);
      } else if (typeof walletProvider.removeAllListeners === 'function') {
        walletProvider.removeAllListeners('accountsChanged');
        walletProvider.removeAllListeners('chainChanged');
        walletProvider.removeAllListeners('disconnect');
      }
    };
  }, [createBrowserProvider]);

  const connectWallet = useCallback(async () => {
    setIsConnecting(true);
    setError('');

    try {
      if (typeof window === 'undefined' || !window.ethereum) {
        throw new Error('No crypto wallet detected. Please install MetaMask or a compatible wallet.');
      }

      const name = getWalletName();
      setWalletName(name);

      // Create provider
      const browserProvider = createBrowserProvider();
      if (!browserProvider) {
        throw new Error('Failed to create wallet provider');
      }

      // Request accounts from the wallet
      const accounts = await browserProvider.send('eth_requestAccounts', []);
      
      if (accounts.length === 0) {
        throw new Error('No accounts found. Please create an account in your wallet.');
      }

      // Setup/switch to Besu network
      await setupBesuNetwork();

      // Set state
      setProvider(browserProvider);
      setAccount(accounts[0]);
      
      console.log('✅ Wallet connected:', accounts[0]);
    } catch (err) {
      console.error('Error connecting wallet:', err);
      const error = err as Error;
      setError(error.message || 'Failed to connect wallet');
      
      // Clear state on error
      setProvider(null);
      setAccount('');
    } finally {
      setIsConnecting(false);
    }
  }, [createBrowserProvider]);

  const disconnectWallet = useCallback(() => {
    setProvider(null);
    setAccount('');
    setError('');
    console.log('🔌 Wallet disconnected by user');
  }, []);

  const clearError = useCallback(() => {
    setError('');
  }, []);

  const value: WalletContextType = {
    provider,
    account,
    walletName,
    isConnected,
    isConnecting,
    error,
    connectWallet,
    disconnectWallet,
    clearError,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}

