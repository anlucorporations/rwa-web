/**
 * TrustedIssuersRegistry Contract Configuration
 *
 * La dirección, el ABI y la configuración de red proceden de la fuente única
 * generada en `@rwa/shared` (RF-W-08/RF-W-09): no hay literales en este fichero.
 */

import { TrustedIssuersRegistryAbi, getContractAddress } from '@rwa/shared/contracts';
import { CANONICAL_CHAIN_ID, getRpcUrl } from '@rwa/shared/network';

export const TRUSTED_ISSUERS_REGISTRY_ADDRESS = getContractAddress('TrustedIssuersRegistry');

export const TRUSTED_ISSUERS_REGISTRY_ABI = TrustedIssuersRegistryAbi;

/**
 * Configuración de red expuesta a la UI.
 * `rpcUrl` es un getter: `getRpcUrl()` solo se evalúa cuando se usa (no al importar).
 */
export const NETWORK_CONFIG = {
  chainId: CANONICAL_CHAIN_ID,
  get rpcUrl(): string {
    return getRpcUrl();
  },
} as const;
