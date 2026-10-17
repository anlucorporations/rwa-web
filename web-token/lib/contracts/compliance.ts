/**
 * Compliance Aggregator Configuration
 * 
 * Deployed on: Besu Network (https://besu1.proyectos.codecrypto.academy)
 * Address: 0xDD75370cd0cd9810E164B5935AadbD31b8609A8b
 */

import { getContractAddress } from '@rwa/shared/contracts';
import { CANONICAL_CHAIN_ID, getRpcUrl } from '@rwa/shared/network';

export const COMPLIANCE_AGGREGATOR_ADDRESS = getContractAddress('ComplianceAggregator');

// Minimal ABI for ModularCompliance contract interactions
export const MODULAR_COMPLIANCE_ABI = [
  {
    "type": "function",
    "name": "addModule",
    "inputs": [
      {
        "name": "_module",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "bindToken",
    "inputs": [
      {
        "name": "_token",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "unbindToken",
    "inputs": [
      {
        "name": "_token",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "isModuleBound",
    "inputs": [
      {
        "name": "_module",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getModules",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address[]",
        "internalType": "address[]"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "removeModule",
    "inputs": [
      {
        "name": "_module",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  }
] as const;

// Token ABI for setCompliance
export const TOKEN_COMPLIANCE_ABI = [
  {
    "type": "function",
    "name": "setCompliance",
    "inputs": [
      {
        "name": "_compliance",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "compliance",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "name",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "string",
        "internalType": "string"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "symbol",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "string",
        "internalType": "string"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "decimals",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint8",
        "internalType": "uint8"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "totalSupply",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  }
] as const;

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

