/**
 * Compliance Aggregator Configuration
 * 
 * Deployed on: Besu Network (https://besu1.proyectos.codecrypto.academy)
 * Address: 0xDD75370cd0cd9810E164B5935AadbD31b8609A8b
 */

import { ComplianceAggregatorAbi, TokenCloneableAbi, getContractAddress } from '@rwa/shared/contracts';
import { CANONICAL_CHAIN_ID, getRpcUrl } from '@rwa/shared/network';

export const COMPLIANCE_AGGREGATOR_ADDRESS = getContractAddress('ComplianceAggregator');

// Minimal ABI for ModularCompliance contract interactions
/** ABIs únicas desde el artefacto generado (O2.2). */
export const MODULAR_COMPLIANCE_ABI = ComplianceAggregatorAbi;

// Token ABI for setCompliance
export const TOKEN_COMPLIANCE_ABI = TokenCloneableAbi;

/**
 * Investment Claim Topics
 * 
 * These claim topics are required for investors to hold and transfer tokens
 */
export const INVESTMENT_CLAIM_TOPICS = {
  KYC: 1,                    // Know Your Customer verification
  ACCREDITATION: 7,          // Accredited investor status
  JURISDICTION: 9,           // Jurisdiction compliance
} as const;

export const CLAIM_TOPIC_NAMES: Record<number, string> = {
  1: "KYC - Know Your Customer",
  7: "Accreditation - Accredited Investor",
  9: "Jurisdiction - Geographic Compliance",
};

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

