/**
 * TrustedIssuersRegistry Contract Configuration
 *
 * La dirección, el ABI y la configuración de red proceden de la fuente única
 * generada en `@rwa/shared` (RF-W-08/RF-W-09): no se escriben literales de red
 * en este fichero. El ABI es el real de `rwa-sc` (19 entradas), incluida
 * `getTrustedIssuersPaginated`.
 */

import { TrustedIssuersRegistryAbi, getContractAddress } from '@rwa/shared/contracts';
import { CANONICAL_CHAIN_ID, DEMO_ACCOUNTS, getRpcUrl } from '@rwa/shared/network';

/** Dirección canónica del registro, leída del artefacto de despliegue (no literal). */
export const TRUSTED_ISSUERS_REGISTRY_ADDRESS = getContractAddress('TrustedIssuersRegistry');

/** ABI real del contrato, generado desde `rwa-sc/sc/abis`. */
export const TRUSTED_ISSUERS_REGISTRY_ABI = TrustedIssuersRegistryAbi;

/**
 * Configuración de red expuesta a la UI.
 * `rpcUrl` es un getter: `getRpcUrl()` solo se evalúa cuando se usa (no al importar).
 */
export const NETWORK_CONFIG = {
  chainId: CANONICAL_CHAIN_ID,
  get chainName(): string {
    return 'Anvil de GCP';
  },
  get rpcUrl(): string {
    return getRpcUrl();
  },
} as const;

/**
 * Cuenta owner del despliegue canónico: la cuenta admin por defecto de Anvil
 * (`DEMO_ACCOUNTS[0]`, pública por diseño) es la que firma el despliegue y queda
 * como owner del contrato. Solo se usa en la UI (guía de ayuda y distinción de
 * owner); si el ownership se transfiere, la verdad está en `owner()` en cadena.
 */
export const CONTRACT_OWNER: string = DEMO_ACCOUNTS[0].address;
