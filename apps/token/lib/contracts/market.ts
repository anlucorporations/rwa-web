/**
 * Funciones de mercado del token clonado (precio y compra).
 *
 * El artefacto generado en `@rwa/shared/contracts` (`TokenCloneableAbi`, O2.2) **no**
 * declara `pricePerToken`, `setPrice` ni `buyToken`: la UI de mercado es anterior a esa
 * generación de artefactos. Se declaran aquí, tipadas con viem, para poder migrar las
 * llamadas de lectura/escritura sin `ethers`; cuando el contrato de mercado se alinee
 * con `rwa-sc`, este módulo debe desaparecer y usarse el ABI generado.
 */

import { parseAbi } from 'viem';

/** Precio (wei por unidad mínima) y compra de un token clonado. */
export const TOKEN_MARKET_ABI = parseAbi([
  'function pricePerToken() view returns (uint256)',
  'function setPrice(uint256 price)',
  'function buyToken(uint256 amount) payable',
]);
