/**
 * Identity Claims Utilities
 * 
 * Functions to add and read claims from identity contracts
 */

import { ethers } from 'ethers';
import { IdentityCloneableAbi } from '@rwa/shared/contracts';

// ABI única desde el artefacto generado (O2.2)
export const IDENTITY_CLAIM_ABI = IdentityCloneableAbi;

export interface IdentityClaim {
  topic: bigint;
  scheme: bigint;
  issuer: string;
  signature: string;
  data: string;
  uri: string;
}

/**
 * Add a claim to an identity contract
 */
export async function addClaimToIdentity(
  identityAddress: string,
  topic: number,
  issuer: string,
  issuerSignature: string,
  requestData: any,
  expiresAt: bigint | number,
  signer: ethers.Signer
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const identityContract = new ethers.Contract(
      identityAddress,
      IDENTITY_CLAIM_ABI,
      signer
    );

    // Prepare claim data
    const scheme = 1; // ECDSA signature scheme
    const data = ethers.AbiCoder.defaultAbiCoder().encode(
      ['address', 'uint256', 'string'],
      [issuer, topic, JSON.stringify(requestData)]
    );
    const uri = `ipfs://claim-${topic}-${issuer}`; // Could be IPFS hash in production

    
    const tx = await identityContract.addClaim(
      topic,
      scheme,
      issuer,
      issuerSignature,
      data,
      uri,
      BigInt(expiresAt)
    );

        await tx.wait();
    
    return {
      success: true,
      txHash: tx.hash
    };
  } catch (error) {
        return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get all claims for an identity
 */
export async function getIdentityClaims(
  identityAddress: string,
  topics: number[],
  provider: ethers.Provider | ethers.Signer
): Promise<IdentityClaim[]> {
  try {
    const identityContract = new ethers.Contract(
      identityAddress,
      IDENTITY_CLAIM_ABI,
      provider
    );

    const claims: IdentityClaim[] = [];

    for (const topic of topics) {
      try {
        // Get all issuers for this topic
        const issuers = await identityContract.getClaimIssuersForTopic(topic);
                
        for (const issuer of issuers) {
          try {
            // First check if claim exists
            const exists = await identityContract.claimExists(topic, issuer);
            if (!exists) {
                            continue;
            }
            
            // Get the full claim data
            const claim = await identityContract.getClaim(topic, issuer);
            claims.push({
              topic: claim.topic,
              scheme: claim.scheme,
              issuer: claim.issuer,
              signature: claim.signature,
              data: claim.data,
              uri: claim.uri,
            });
                      } catch (err) {
                      }
        }
      } catch (err) {
              }
    }

    return claims;
  } catch (error) {
        return [];
  }
}

/**
 * Check if a specific claim exists
 */
export async function claimExists(
  identityAddress: string,
  topic: number,
  issuer: string,
  provider: ethers.Provider | ethers.Signer
): Promise<boolean> {
  try {
    const identityContract = new ethers.Contract(
      identityAddress,
      IDENTITY_CLAIM_ABI,
      provider
    );

    return await identityContract.claimExists(topic, issuer);
  } catch (error) {
        return false;
  }
}

export const CLAIM_TOPIC_NAMES: Record<number, string> = {
  1: "KYC - Know Your Customer",
  7: "Accreditation - Accredited Investor",
  9: "Jurisdiction - Geographic Compliance",
};

