/**
 * Identity Claims Utilities
 * 
 * Functions to add and read claims from identity contracts
 */

import { ethers } from 'ethers';

// Minimal ABI for Identity contract claims functions
export const IDENTITY_CLAIM_ABI = [
  {
    "type": "function",
    "name": "addClaim",
    "inputs": [
      { "name": "_topic", "type": "uint256" },
      { "name": "_scheme", "type": "uint256" },
      { "name": "_issuer", "type": "address" },
      { "name": "_signature", "type": "bytes" },
      { "name": "_data", "type": "bytes" },
      { "name": "_uri", "type": "string" }
    ],
    "outputs": [{ "name": "", "type": "bytes32" }],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getClaim",
    "inputs": [
      { "name": "_topic", "type": "uint256" },
      { "name": "_issuer", "type": "address" }
    ],
    "outputs": [
      { "name": "topic", "type": "uint256" },
      { "name": "scheme", "type": "uint256" },
      { "name": "issuer", "type": "address" },
      { "name": "signature", "type": "bytes" },
      { "name": "data", "type": "bytes" },
      { "name": "uri", "type": "string" }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "claimExists",
    "inputs": [
      { "name": "_topic", "type": "uint256" },
      { "name": "_issuer", "type": "address" }
    ],
    "outputs": [{ "name": "", "type": "bool" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getClaimIssuersForTopic",
    "inputs": [{ "name": "_topic", "type": "uint256" }],
    "outputs": [{ "name": "", "type": "address[]" }],
    "stateMutability": "view"
  }
] as const;

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

    console.log('Adding claim to identity:', {
      topic,
      scheme,
      issuer,
      signatureLength: issuerSignature.length,
      dataLength: data.length,
      uri
    });

    const tx = await identityContract.addClaim(
      topic,
      scheme,
      issuer,
      issuerSignature,
      data,
      uri
    );

    console.log('Transaction sent:', tx.hash);
    await tx.wait();
    console.log('Claim added successfully!');

    return {
      success: true,
      txHash: tx.hash
    };
  } catch (error) {
    console.error('Error adding claim to identity:', error);
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
        console.log(`Topic ${topic} has ${issuers.length} issuer(s)`);
        
        for (const issuer of issuers) {
          try {
            // First check if claim exists
            const exists = await identityContract.claimExists(topic, issuer);
            if (!exists) {
              console.warn(`Claim does not exist for topic ${topic} and issuer ${issuer}`);
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
            console.log(`✅ Found claim: topic ${topic}, issuer ${issuer}`);
          } catch (err) {
            console.warn(`Error getting claim for topic ${topic} and issuer ${issuer}:`, err);
          }
        }
      } catch (err) {
        console.warn(`Error getting issuers for topic ${topic}:`, err);
      }
    }

    return claims;
  } catch (error) {
    console.error('Error getting identity claims:', error);
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
    console.error('Error checking claim existence:', error);
    return false;
  }
}

export const CLAIM_TOPIC_NAMES: Record<number, string> = {
  1: "KYC - Know Your Customer",
  7: "Accreditation - Accredited Investor",
  9: "Jurisdiction - Geographic Compliance",
};

