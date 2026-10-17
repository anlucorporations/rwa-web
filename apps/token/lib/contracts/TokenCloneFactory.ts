/**
 * TokenCloneFactory Contract Configuration
 * 
 * This file contains the ABI and deployed addresses for the TokenCloneFactory contract
 * 
 * Deployed on: Besu Network (https://besu1.proyectos.codecrypto.academy)
 * Factory Address: 0x95Ac1Bf6ca44bC847A78936d67556701a764dA84
 */

import { TokenCloneFactoryAbi, getContractAddress } from '@rwa/shared/contracts';
import { CANONICAL_CHAIN_ID, getRpcUrl } from '@rwa/shared/network';

export const TOKEN_CLONE_FACTORY_ADDRESS = getContractAddress('TokenCloneFactory');

/** ABI única desde el artefacto generado (O2.2). */
export const TOKEN_CLONE_FACTORY_ABI = TokenCloneFactoryAbi;
export const TOKEN_IMPLEMENTATION_ADDRESS = "" as const;


// Network Configuration (fuente única: @rwa/shared/network; getters perezosos)
export const NETWORK_CONFIG = {
  get chainId(): number {
    return CANONICAL_CHAIN_ID;
  },
  get chainName(): string {
    return 'Anvil de GCP';
  },
  get rpcUrl(): string {
    return getRpcUrl();
  },
};

// Gas Savings Information
export const GAS_SAVINGS = {
  cloneDeployment: "~50k gas",
  fullDeployment: "~3M gas",
  savings: "~2.95M gas per Token (98.3% reduction)",
} as const;

