/**
 * Direcciones canónicas de los contratos de identidad (O4.6).
 *
 * Fuente única generada desde `rwa-sc` (RF-W-09); se conservan los nombres
 * históricos para no romper los imports. Las lecturas/escrituras se hacen con
 * viem desde los componentes (`usePublicClient`/`useWalletClient`).
 */

import { getContractAddress } from '@rwa/shared/contracts';

export const IDENTITY_REGISTRY_ADDRESS = getContractAddress('IdentityRegistry');
export const IDENTITY_FACTORY_ADDRESS = getContractAddress('IdentityCloneFactory');
