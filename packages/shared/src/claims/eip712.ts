/**
 * Firma EIP-712 del claim (`IdentityCloneable.addClaim`) — O2.3, RF-W-10, D-020/D-083.
 *
 * Especificación exacta del contrato (`rwa-sc/sc/src/IdentityCloneable.sol`):
 *   domain = { name: "RWA-Identity", version: "1", chainId, verifyingContract: <clon de identidad> }
 *   Claim(address walletOwner, uint256 topic, uint256 scheme, bytes32 dataHash,
 *         uint256 expiresAt, uint256 nonce, bytes32 uriHash)
 *   dataHash = keccak256(_data) · uriHash = keccak256(bytes(_uri))
 *   nonce    = claimNonce(topic, issuer) leído justo antes de firmar
 *   walletOwner = owner() del clon (el inversor, si la identidad se creó con `createIdentity`)
 *
 * Módulo **seguro para cliente**: solo depende de `viem` (sin APIs de Node), de modo
 * que el panel de emisor puede firmar con `signTypedData` y el inversor puede construir
 * la misma estructura antes de llamar a `addClaim`.
 */

import { keccak256, recoverTypedDataAddress, toBytes, type Address, type Hex } from 'viem';

import { ValidationError } from '../errors';

export const CLAIM_DOMAIN_NAME = 'RWA-Identity' as const;
export const CLAIM_DOMAIN_VERSION = '1' as const;
/** Único scheme soportado por el contrato (`require(_scheme == 1)`). */
export const CLAIM_SCHEME = 1;

export const CLAIM_TYPES = {
  Claim: [
    { name: 'walletOwner', type: 'address' },
    { name: 'topic', type: 'uint256' },
    { name: 'scheme', type: 'uint256' },
    { name: 'dataHash', type: 'bytes32' },
    { name: 'expiresAt', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'uriHash', type: 'bytes32' },
  ],
} as const;

export type ClaimDomain = {
  name: typeof CLAIM_DOMAIN_NAME;
  version: typeof CLAIM_DOMAIN_VERSION;
  chainId: number;
  verifyingContract: Address;
};

export type ClaimMessage = {
  walletOwner: Address;
  topic: bigint;
  scheme: bigint;
  dataHash: Hex;
  expiresAt: bigint;
  nonce: bigint;
  uriHash: Hex;
};

export type ClaimTypedData = {
  domain: ClaimDomain;
  types: typeof CLAIM_TYPES;
  primaryType: 'Claim';
  message: ClaimMessage;
};

/**
 * Payload del claim tal y como viaja por la API. Los enteros de 256 bits van como
 * **strings decimales** (JSON no admite `bigint` y no se pierde precisión).
 */
export type ClaimPayload = {
  chainId: number;
  /** Clon de identidad del inversor: es el `verifyingContract` del dominio. */
  identityAddress: Address;
  /** `owner()` del clon = inversor. */
  walletOwner: Address;
  /** Topic del claim (1 KYC · 7 Accreditation · 9 Jurisdiction). */
  topic: string;
  scheme: number;
  /** Bytes del claim en hex (`0x…`). */
  data: Hex;
  /** Referencia documental; se firma su hash (D-083). */
  uri: string;
  /** Unix seconds; `0` = perpetuo (D-038). */
  expiresAt: string;
  /** `claimNonce(topic, issuer)` en el instante de la firma. */
  nonce: string;
};

export function claimDataHash(data: Hex): Hex {
  return keccak256(data);
}

export function claimUriHash(uri: string): Hex {
  return keccak256(toBytes(uri));
}

/** Construye la estructura EIP-712 lista para `signTypedData` / verificación. */
export function buildClaimTypedData(payload: ClaimPayload): ClaimTypedData {
  return {
    domain: {
      name: CLAIM_DOMAIN_NAME,
      version: CLAIM_DOMAIN_VERSION,
      chainId: payload.chainId,
      verifyingContract: payload.identityAddress,
    },
    types: CLAIM_TYPES,
    primaryType: 'Claim',
    message: {
      walletOwner: payload.walletOwner,
      topic: BigInt(payload.topic),
      scheme: BigInt(payload.scheme),
      dataHash: claimDataHash(payload.data),
      expiresAt: BigInt(payload.expiresAt),
      nonce: BigInt(payload.nonce),
      uriHash: claimUriHash(payload.uri),
    },
  };
}

/** Recupera la dirección del emisor que firmó el claim (EIP-712). */
export async function recoverClaimIssuer(typedData: ClaimTypedData, signature: Hex): Promise<Address> {
  return recoverTypedDataAddress({
    domain: typedData.domain,
    types: typedData.types,
    primaryType: typedData.primaryType,
    message: typedData.message,
    signature,
  });
}

/** Datos mínimos del claim on-chain con los que debe cuadrar el payload firmado. */
export type ClaimAnchor = {
  requesterAddress: string;
  topic: number;
};

/**
 * Comprueba que el payload firmado corresponde a la solicitud y a la red canónica.
 * Lanza `ValidationError` con un mensaje explícito si algo no cuadra (RF-W-03).
 */
export function assertClaimPayloadConsistent(
  payload: ClaimPayload,
  anchor: ClaimAnchor,
  canonicalChainId: number,
): void {
  if (payload.chainId !== canonicalChainId) {
    throw new ValidationError(
      `El chainId firmado (${payload.chainId}) no es el canónico (${canonicalChainId})`,
      'claim.chainId',
    );
  }
  if (payload.scheme !== CLAIM_SCHEME) {
    throw new ValidationError(`scheme ${payload.scheme} no soportado (solo ${CLAIM_SCHEME})`, 'claim.scheme');
  }
  if (payload.walletOwner.toLowerCase() !== anchor.requesterAddress.toLowerCase()) {
    throw new ValidationError('El walletOwner firmado no coincide con el solicitante', 'claim.walletOwner');
  }
  if (Number(payload.topic) !== anchor.topic) {
    throw new ValidationError(
      `El topic firmado (${payload.topic}) no coincide con el de la solicitud (${anchor.topic})`,
      'claim.topic',
    );
  }
}
