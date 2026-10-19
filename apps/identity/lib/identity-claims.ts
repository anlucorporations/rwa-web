/**
 * Lectura de claims de identidad on-chain (O4.6): **viem**, sin `ethers`.
 *
 * Funciones puras de lectura sobre el RPC canónico; el ABI es el generado desde
 * `rwa-sc` (`@rwa/shared/contracts`).
 */

import { IdentityCloneableAbi } from '@rwa/shared/contracts';
import { getPublicClient } from '@rwa/shared/web3';

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

type Address = `0x${string}`;

/** Claims registrados en un contrato de identidad para los topics indicados. */
export async function getIdentityClaims(
  identityAddress: string,
  topics: number[],
): Promise<IdentityClaim[]> {
  const client = getPublicClient();
  const address = identityAddress as Address;
  const claims: IdentityClaim[] = [];

  for (const topic of topics) {
    try {
      const issuers = (await client.readContract({
        address,
        abi: IDENTITY_CLAIM_ABI,
        functionName: 'getClaimIssuersForTopic',
        args: [BigInt(topic)],
      })) as readonly string[];

      for (const issuer of issuers) {
        try {
          const exists = (await client.readContract({
            address,
            abi: IDENTITY_CLAIM_ABI,
            functionName: 'claimExists',
            args: [BigInt(topic), issuer as Address],
          })) as boolean;
          if (!exists) continue;

          // El ABI devuelve 8 salidas planas:
          // topic, scheme, issuer, signature, data, uri, expiresAt, revoked
          const claim = (await client.readContract({
            address,
            abi: IDENTITY_CLAIM_ABI,
            functionName: 'getClaim',
            args: [BigInt(topic), issuer as Address],
          })) as unknown as readonly [
            bigint,
            bigint,
            string,
            string,
            string,
            string,
            bigint,
            boolean,
          ];

          claims.push({
            topic: claim[0],
            scheme: claim[1],
            issuer: claim[2],
            signature: claim[3],
            data: claim[4],
            uri: claim[5],
          });
        } catch {
          // claim inexistente o ABI distinta: se ignora
        }
      }
    } catch {
      // topic sin emisores: se ignora
    }
  }

  return claims;
}

/** ¿Existe un claim concreto (topic + issuer) en la identidad? */
export async function claimExists(
  identityAddress: string,
  topic: number,
  issuer: string,
): Promise<boolean> {
  try {
    const client = getPublicClient();
    return (await client.readContract({
      address: identityAddress as Address,
      abi: IDENTITY_CLAIM_ABI,
      functionName: 'claimExists',
      args: [BigInt(topic), issuer as Address],
    })) as boolean;
  } catch {
    return false;
  }
}

export const CLAIM_TOPIC_NAMES: Record<number, string> = {
  1: 'KYC - Know Your Customer',
  7: 'Accreditation - Accredited Investor',
  9: 'Jurisdiction - Geographic Compliance',
};
