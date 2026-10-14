import { createPublicClient, createWalletClient, custom, http, PublicClient, WalletClient, defineChain } from 'viem';
import { ANVIL_RPC_URL, ANVIL_CHAIN_ID } from './contracts';

const besuChain = defineChain({
  id: ANVIL_CHAIN_ID,
  name: 'Besu Network',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: [ANVIL_RPC_URL] },
  },
});

let publicClient: PublicClient | null = null;

export const getPublicClient = (): PublicClient => {
  if (!publicClient) {
    publicClient = createPublicClient({
      chain: besuChain,
      transport: http(ANVIL_RPC_URL),
    });
  }
  return publicClient;
};

export const getWalletClient = async (): Promise<WalletClient> => {
  if (typeof window !== 'undefined' && (window as any).ethereum) {
    return createWalletClient({
      chain: besuChain,
      transport: custom((window as any).ethereum),
    });
  }
  throw new Error('MetaMask not available');
};

export const switchToBesuNetwork = async () => {
  if (typeof window !== 'undefined' && (window as any).ethereum) {
    try {
      const chainIdHex = `0x${ANVIL_CHAIN_ID.toString(16)}`;
      await (window as any).ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainIdHex }],
      });
    } catch (error: any) {
      if (error.code === 4902) {
        const chainIdHex = `0x${ANVIL_CHAIN_ID.toString(16)}`;
        await (window as any).ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: chainIdHex,
              chainName: 'Besu Network',
              rpcUrls: [ANVIL_RPC_URL],
              nativeCurrency: {
                name: 'Ether',
                symbol: 'ETH',
                decimals: 18,
              },
            },
          ],
        });
      }
    }
  }
};
