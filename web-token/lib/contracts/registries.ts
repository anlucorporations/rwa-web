/**
 * Registry Contract Addresses
 * 
 * Shared registry contracts used across all tokens
 * These are deployed once and shared by all tokens
 */

import { ClaimTopicsRegistryAbi, getContractAddress } from '@rwa/shared/contracts';

// Identity Registry - Shared across all tokens (dirección del artefacto de despliegue)
export const IDENTITY_REGISTRY_ADDRESS = getContractAddress('IdentityRegistry');

// Trusted Issuers Registry - Shared across all tokens
export const TRUSTED_ISSUERS_REGISTRY_ADDRESS = getContractAddress('TrustedIssuersRegistry');

// Identity Clone Factory
export const IDENTITY_CLONE_FACTORY_ADDRESS = getContractAddress('IdentityCloneFactory');

/**
 * ABI del ClaimTopicsRegistry — fuente única en `@rwa/shared/contracts`.
 */
export const CLAIM_TOPICS_REGISTRY_ABI = ClaimTopicsRegistryAbi;

