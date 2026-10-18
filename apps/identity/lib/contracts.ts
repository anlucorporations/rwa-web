import { ethers } from 'ethers';
import {
  IdentityCloneFactoryAbi,
  IdentityRegistryAbi,
  getContractAddress,
} from '@rwa/shared/contracts';
import { ZERO_ADDRESS, getRpcUrl } from '@rwa/shared/network';

/**
 * Direcciones canónicas de los contratos: fuente única generada desde `rwa-sc`
 * (RF-W-09). Se conservan los nombres históricos para no romper los imports.
 */
export const IDENTITY_REGISTRY_ADDRESS = getContractAddress('IdentityRegistry');
export const IDENTITY_FACTORY_ADDRESS = getContractAddress('IdentityCloneFactory');

/**
 * Get an ethers provider for the canonical network.
 * `getRpcUrl()` se evalúa de forma perezosa (no en el nivel superior del módulo).
 */
export function getProvider() {
  return new ethers.JsonRpcProvider(getRpcUrl());
}

/**
 * Get the IdentityRegistry contract instance
 * @param signerOrProvider - Optional signer or provider. If not provided, uses read-only provider
 */
export function getIdentityRegistryContract(signerOrProvider?: ethers.Signer | ethers.Provider) {
  const provider = signerOrProvider || getProvider();
  return new ethers.Contract(
    IDENTITY_REGISTRY_ADDRESS,
    IdentityRegistryAbi,
    provider
  );
}

/**
 * Get the IdentityCloneFactory contract instance
 * @param signerOrProvider - Optional signer or provider. If not provided, uses read-only provider
 */
export function getIdentityCloneFactoryContract(signerOrProvider?: ethers.Signer | ethers.Provider) {
  const provider = signerOrProvider || getProvider();
  return new ethers.Contract(
    IDENTITY_FACTORY_ADDRESS,
    IdentityCloneFactoryAbi,
    provider
  );
}

/**
 * Check if an address is registered in the IdentityRegistry
 */
export async function isAddressRegistered(address: string): Promise<boolean> {
  try {
    const registry = getIdentityRegistryContract();
    const result = await registry.isRegistered(address);
    return result;
  } catch (error) {
        // If the contract call fails, assume not registered
    return false;
  }
}

/**
 * Get the identity contract address for a wallet address
 */
export async function getIdentityAddress(walletAddress: string): Promise<string> {
  try {
    const registry = getIdentityRegistryContract();
    const result = await registry.getIdentity(walletAddress);
    return result;
  } catch (error) {
        return ZERO_ADDRESS;
  }
}
