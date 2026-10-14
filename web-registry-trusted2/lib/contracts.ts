import { TRUSTED_ISSUERS_REGISTRY_2_ABI } from './abi/TrustedIssuersRegistry2';
import { CLAIM_TOPICS_REGISTRY_2_ABI } from './abi/ClaimTopicsRegistry2';

export const CONTRACTS = {
  TRUSTED_ISSUERS_REGISTRY_2: {
    address: process.env.NEXT_PUBLIC_TRUSTED_ISSUERS_REGISTRY_ADDRESS || '0x0165878A594ca255338adfa4d48449f69242Eb8F',
    abi: TRUSTED_ISSUERS_REGISTRY_2_ABI,
    name: 'TrustedIssuersRegistry2',
  },
  CLAIM_TOPICS_REGISTRY_2: {
    address: process.env.NEXT_PUBLIC_CLAIM_TOPICS_REGISTRY_ADDRESS || '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707',
    abi: CLAIM_TOPICS_REGISTRY_2_ABI,
    name: 'ClaimTopicsRegistry2',
  },
} as const;

export const OWNER_ADDRESS = process.env.NEXT_PUBLIC_OWNER_ADDRESS || '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

export const ANVIL_CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '31337', 10);
export const ANVIL_RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'http://localhost:8545';
