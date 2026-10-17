/**
 * Configuración de red **segura para cliente** (RF-W-08, O2.5).
 *
 * Este módulo no importa APIs de Node: puede usarse en componentes cliente. Es la
 * única fuente permitida de `chainId`, RPC y dirección cero; el gate
 * `check-network-literals.sh` prohíbe el resto de literales en el código.
 *
 * Las **direcciones de contratos** no viven aquí: proceden del artefacto generado
 * en `@rwa/shared/contracts` (`getContractAddress`).
 */

import { getNetworkConfig } from '../config/index';
import { TrustedIssuersRegistryAbi, getContractAddress } from '../contracts/index';
import { ConfigError, ValidationError } from '../errors';

/** chainId canónico del frontend: Anvil de GCP (D-096). */
export const CANONICAL_CHAIN_ID = 31337;

/** Dirección cero de EVM (comparaciones de "sin configurar"). */
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

/** RPC canónico desde `NEXT_PUBLIC_RPC_URL` (lazy: no rompe el build si falta). */
export function getRpcUrl(): string {
  const url = process.env.NEXT_PUBLIC_RPC_URL;
  if (!url) {
    throw new ConfigError(
      'NEXT_PUBLIC_RPC_URL no está configurada. Añádela a .env.local o exporta el entorno de GCP (scripts/gcp-env.sh).',
    );
  }
  return url;
}

/** Configuración de red validada (chainId canónico + RPC). Para servidor; en cliente usa `getRpcUrl`. */
export function getClientNetwork(): { chainId: number; rpcUrl: string } {
  return { chainId: CANONICAL_CHAIN_ID, rpcUrl: getRpcUrl() };
}

export function isCanonicalChain(chainId: number): boolean {
  return chainId === CANONICAL_CHAIN_ID;
}

/** Lanza un `ValidationError` claro si la wallet no está en la red canónica (O2.5). */
export function assertCanonicalChain(chainId: number): void {
  if (!isCanonicalChain(chainId)) {
    throw new ValidationError(
      `Red incorrecta: la wallet está en chain ${chainId}; la red canónica es ${CANONICAL_CHAIN_ID}. ` +
        'Cambia la red en tu wallet (Anvil de GCP).',
      'chainId',
    );
  }
}

/** Red canónica completa (solo servidor: usa `getNetworkConfig` para validar el entorno). */
export function getCanonicalNetwork(): { chainId: number; rpcUrl: string; deploymentJson?: string } {
  return getNetworkConfig();
}

export type DemoAccount = {
  role: string;
  address: string;
  privateKey: string;
};

/**
 * Cuentas por defecto de Anvil, **públicas por diseño** (claves conocidas de testnet
 * local). Solo para la UI de desarrollo del panel de emisor; nunca para producción.
 */
export const DEMO_ACCOUNTS: readonly DemoAccount[] = [
  {
    role: 'Admin/Owner',
    address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
  },
  {
    role: 'User 1 / Issuer',
    address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    privateKey: '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
  },
  {
    role: 'User 2',
    address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    privateKey: '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a',
  },
];


// ---------------------------------------------------------------------------
// Helpers del TrustedIssuersRegistry compartidos por las apps (O4.3)
// ---------------------------------------------------------------------------

/** Dirección canónica del registro (desde el artefacto generado, sin literales). */
export const TRUSTED_ISSUERS_REGISTRY_ADDRESS = getContractAddress('TrustedIssuersRegistry');

/** ABI real del contrato (generado desde `rwa-sc/sc/abis`). */
export const TRUSTED_ISSUERS_REGISTRY_ABI = TrustedIssuersRegistryAbi;

/** Configuración de red expuesta a la UI (getters perezosos). */
export const TRUSTED_ISSUERS_NETWORK_CONFIG = {
  chainId: CANONICAL_CHAIN_ID,
  get chainName(): string {
    return 'Anvil de GCP';
  },
  get rpcUrl(): string {
    return getRpcUrl();
  },
} as const;

/**
 * Owner del despliegue canónico (cuenta admin por defecto de Anvil, pública por
 * diseño). Solo para la UI; la verdad está en `owner()` on-chain.
 */
export const TRUSTED_ISSUERS_CONTRACT_OWNER: string = DEMO_ACCOUNTS[0].address;
