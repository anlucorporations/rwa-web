import { ethers } from 'ethers';
import {
  IdentityCloneFactoryAbi,
  IdentityRegistryAbi,
  getContractAddress,
} from '@rwa/shared/contracts';
import { CANONICAL_CHAIN_ID, ZERO_ADDRESS, getRpcUrl } from '@rwa/shared/network';

/**
 * Direcciones canónicas de los contratos: fuente única generada desde `rwa-sc`
 * (RF-W-09). Se conservan los nombres históricos para no romper los imports.
 */
export const IDENTITY_REGISTRY_ADDRESS = getContractAddress('IdentityRegistry');
export const IDENTITY_FACTORY_ADDRESS = getContractAddress('IdentityCloneFactory');

/** chainId canónico en formato hex, el que exigen los métodos `wallet_*` (EIP-1193). */
function canonicalChainIdHex(): string {
  return `0x${CANONICAL_CHAIN_ID.toString(16)}`;
}

/**
 * Get an ethers provider for the canonical network.
 * `getRpcUrl()` se evalúa de forma perezosa (no en el nivel superior del módulo).
 */
export function getProvider() {
  return new ethers.JsonRpcProvider(getRpcUrl());
}

/**
 * Get the preferred wallet provider
 * @internal Used by WalletContext
 */
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

/**
 * Add or switch to the canonical network in the connected wallet.
 *
 * El nombre `setupBesuNetwork` se conserva por compatibilidad con los imports
 * existentes; la red operativa es `CANONICAL_CHAIN_ID`.
 */
export async function setupBesuNetwork() {
  const provider = getPreferredProvider();
  if (!provider) {
    throw new Error('No crypto wallet detected');
  }

  const walletName = getWalletName();
  const chainId = canonicalChainIdHex();

  try {
    // Try to switch to the canonical network
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId }],
    });
  } catch (switchError) {
    const error = switchError as { code?: number; message?: string };
    // This error code indicates that the chain has not been added to the wallet
    if (error.code === 4902) {
      try {
        await provider.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId,
              chainName: 'RWA Canonical (Anvil)',
              nativeCurrency: {
                name: 'Ethereum',
                symbol: 'ETH',
                decimals: 18,
              },
              rpcUrls: [getRpcUrl()],
            },
          ],
        });
      } catch {
        throw new Error(`Failed to add the canonical network to ${walletName}`);
      }
    } else {
      throw error;
    }
  }
}

/**
 * Detect which wallet is installed
 */
export function getWalletName(): string {
  const provider = getPreferredProvider();
  if (!provider) {
    return 'None';
  }
  if (provider.isMetaMask) {
    return 'MetaMask';
  }
  if (provider.isCoinbaseWallet) {
    return 'Coinbase Wallet';
  }
  return 'Unknown Wallet';
}

/**
 * Debug function to see what wallets are available
 */
export function debugWallets() {
  if (typeof window === 'undefined') {
    return 'Not in browser';
  }
  
  const info: {
    hasEthereum: boolean;
    ethereum?: {
      isMetaMask?: boolean;
      isCoinbaseWallet?: boolean;
      hasProviders: boolean;
      providersCount: number;
    };
  } = {
    hasEthereum: !!window.ethereum,
  };

  if (window.ethereum) {
    info.ethereum = {
      isMetaMask: window.ethereum.isMetaMask,
      isCoinbaseWallet: window.ethereum.isCoinbaseWallet,
      hasProviders: !!window.ethereum.providers,
      providersCount: window.ethereum.providers?.length || 0,
    };
  }

  console.log('🔍 Wallet Debug Info:', info);
  return info;
}

/**
 * Get the IdentityRegistry contract instance
 * @param signerOrProvider - Optional signer or provider. If not provided, uses read-only provider
 */
export function getIdentityRegistryContract(signerOrProvider?: ethers.Signer | ethers.Provider) {
  const provider = signerOrProvider || getProvider();
  return new ethers.Contract(
    IDENTITY_REGISTRY_ADDRESS,
    IdentityRegistryAbi,
    provider
  );
}

/**
 * Get the IdentityCloneFactory contract instance
 * @param signerOrProvider - Optional signer or provider. If not provided, uses read-only provider
 */
export function getIdentityCloneFactoryContract(signerOrProvider?: ethers.Signer | ethers.Provider) {
  const provider = signerOrProvider || getProvider();
  return new ethers.Contract(
    IDENTITY_FACTORY_ADDRESS,
    IdentityCloneFactoryAbi,
    provider
  );
}

/**
 * Check if an address is registered in the IdentityRegistry
 */
export async function isAddressRegistered(address: string): Promise<boolean> {
  try {
    const registry = getIdentityRegistryContract();
    const result = await registry.isRegistered(address);
    return result;
  } catch (error) {
    console.error('Error calling isRegistered:', error);
    // If the contract call fails, assume not registered
    return false;
  }
}

/**
 * Get the identity contract address for a wallet address
 */
export async function getIdentityAddress(walletAddress: string): Promise<string> {
  try {
    const registry = getIdentityRegistryContract();
    const result = await registry.getIdentity(walletAddress);
    return result;
  } catch (error) {
    console.error('Error calling getIdentity:', error);
    return ZERO_ADDRESS;
  }
}
