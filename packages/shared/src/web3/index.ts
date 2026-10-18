/**
 * Configuración web3 única (RT-W-02, O4.6): **wagmi + viem**.
 *
 * Módulo seguro para cliente. La cadena canónica y el RPC salen de la configuración
 * compartida (`@rwa/shared/network`), nunca de literales.
 */

import { defineChain } from 'viem';
import { createConfig, http, injected } from 'wagmi';
import { getAccount } from 'wagmi/actions';

import { CANONICAL_CHAIN_ID, getRpcUrl } from '../network';

/** Cadena canónica del proyecto (Anvil de GCP). El RPC se inyecta por transporte. */
export const anvilGcpChain = defineChain({
  id: CANONICAL_CHAIN_ID,
  name: 'Anvil de GCP',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [] } },
});

function rpcTransport() {
  try {
    return http(getRpcUrl());
  } catch {
    // Sin NEXT_PUBLIC_RPC_URL el transporte falla al usarse, no al crear la config.
    return http();
  }
}

/** Configuración wagmi con el conector inyectado (MetaMask o compatible). */
export function createWagmiConfig() {
  return createConfig({
    chains: [anvilGcpChain],
    connectors: [injected()],
    transports: { [anvilGcpChain.id]: rpcTransport() },
    ssr: true,
  });
}

export type WagmiConfig = ReturnType<typeof createWagmiConfig>;


let cachedConfig: WagmiConfig | null = null;

/** Config singleton: los hooks (WagmiProvider) y los helpers comparten la misma instancia. */
export function getWagmiConfig(): WagmiConfig {
  if (!cachedConfig) {
    cachedConfig = createWagmiConfig();
  }
  return cachedConfig;
}

/** ¿Hay una wallet inyectada disponible? (sustituye a la comprobación directa del proveedor global). */
export function isInjectedWalletAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return getWagmiConfig().connectors.some((connector) => connector.id === 'injected');
  } catch {
    return false;
  }
}

export type Eip1193Like = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
};

/** Proveedor EIP-1193 del conector inyectado (sustituye al proveedor global inyectado). */
export async function getInjectedEip1193(): Promise<Eip1193Like | null> {
  if (typeof window === 'undefined') return null;
  const config = getWagmiConfig();
  const account = getAccount(config);
  const connector = account.connector ?? config.connectors.find((item) => item.id === 'injected');
  if (!connector) return null;
  try {
    return (await connector.getProvider()) as unknown as Eip1193Like;
  } catch {
    return null;
  }
}
