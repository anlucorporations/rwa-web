/**
 * Configuración web3 única (RT-W-02, O4.6): **wagmi + viem**.
 *
 * Módulo seguro para cliente. La cadena canónica y el RPC salen de la configuración
 * compartida (`@rwa/shared/network`), nunca de literales.
 */

import { defineChain } from 'viem';
import { createConfig, http, injected } from 'wagmi';

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
