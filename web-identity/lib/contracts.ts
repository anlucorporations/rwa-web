import { ethers } from 'ethers';
import IdentityRegistryABI from '../contracts/IdentityRegistry.abi.json';
import IdentityCloneFactoryABI from '../contracts/IdentityCloneFactory.abi.json';

// Contract addresses from smart_contract.txt
export const IDENTITY_REGISTRY_ADDRESS = '0xDD75370cd0cd9810E164B5935AadbD31b8609A8b';
export const IDENTITY_FACTORY_ADDRESS = '0x7210f8bF14C4a00a8E7bD67D35495913039d34c4';

// Besu RPC URL 
export const BESU_RPC_URL = 'https://besu1.proyectos.codecrypto.academy';
export const BESU_CHAIN_ID = '0x13D52'; // 81234 in hex

/**
 * Get an ethers provider for the Besu network
 */
export function getProvider() {
  return new ethers.JsonRpcProvider(BESU_RPC_URL);
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
 * Add or switch to Besu network in the connected wallet
 */
export async function setupBesuNetwork() {
  const provider = getPreferredProvider();
  if (!provider) {
    throw new Error('No crypto wallet detected');
  }

  const walletName = getWalletName();

  try {
    // Try to switch to Besu network
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: BESU_CHAIN_ID }],
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
              chainId: BESU_CHAIN_ID,
              chainName: 'Besu CodeCrypto',
              nativeCurrency: {
                name: 'Ethereum',
                symbol: 'ETH',
                decimals: 18,
              },
              rpcUrls: [BESU_RPC_URL],
            },
          ],
        });
      } catch {
        throw new Error(`Failed to add Besu network to ${walletName}`);
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
    IdentityRegistryABI,
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
    IdentityCloneFactoryABI,
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
    return '0x0000000000000000000000000000000000000000';
  }
}

