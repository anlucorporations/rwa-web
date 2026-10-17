import { describe, expect, it } from 'vitest';
import { privateKeyToAccount } from 'viem/accounts';

import {
  assertClaimPayloadConsistent,
  buildClaimTypedData,
  claimDataHash,
  claimUriHash,
  recoverClaimIssuer,
  type ClaimPayload,
} from './eip712';

// Cuenta de Anvil #1 (pública por diseño, solo testnet local).
const ISSUER_KEY = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d';
const issuer = privateKeyToAccount(ISSUER_KEY);

const payload: ClaimPayload = {
  chainId: 31337,
  identityAddress: '0x1111111111111111111111111111111111111111',
  walletOwner: '0x2222222222222222222222222222222222222222',
  topic: '1',
  scheme: 1,
  data: '0x1234',
  uri: 'rwa://test/claim',
  expiresAt: '0',
  nonce: '0',
};

describe('EIP-712 del claim (O2.3)', () => {
  it('construye el dominio canónico', () => {
    const typed = buildClaimTypedData(payload);
    expect(typed.domain).toEqual({
      name: 'RWA-Identity',
      version: '1',
      chainId: 31337,
      verifyingContract: payload.identityAddress,
    });
    expect(typed.primaryType).toBe('Claim');
  });

  it('declara los 7 campos del Claim en el orden del contrato', () => {
    const fields = buildClaimTypedData(payload).types.Claim.map((f) => `${f.name}:${f.type}`);
    expect(fields).toEqual([
      'walletOwner:address',
      'topic:uint256',
      'scheme:uint256',
      'dataHash:bytes32',
      'expiresAt:uint256',
      'nonce:uint256',
      'uriHash:bytes32',
    ]);
  });

  it('deriva dataHash y uriHash como keccak', () => {
    const typed = buildClaimTypedData(payload);
    expect(typed.message.dataHash).toBe(claimDataHash('0x1234'));
    expect(typed.message.uriHash).toBe(claimUriHash('rwa://test/claim'));
    expect(claimDataHash('0x')).toBe('0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470');
  });

  it('recupera al emisor que firmó el typed data', async () => {
    const typed = buildClaimTypedData(payload);
    const signature = await issuer.signTypedData({
      domain: typed.domain,
      types: typed.types,
      primaryType: 'Claim',
      message: typed.message,
    });
    const recovered = await recoverClaimIssuer(typed, signature);
    expect(recovered.toLowerCase()).toBe(issuer.address.toLowerCase());
  });

  it('rechaza payloads incoherentes con la solicitud', () => {
    const anchor = { requesterAddress: payload.walletOwner, topic: 1 };
    expect(() => assertClaimPayloadConsistent(payload, anchor, 31337)).not.toThrow();
    expect(() => assertClaimPayloadConsistent(payload, anchor, 1)).toThrow(/chainId/);
    expect(() =>
      assertClaimPayloadConsistent(payload, { ...anchor, topic: 7 }, 31337),
    ).toThrow(/topic/);
    expect(() =>
      assertClaimPayloadConsistent(
        payload,
        { requesterAddress: '0x3333333333333333333333333333333333333333', topic: 1 },
        31337,
      ),
    ).toThrow(/walletOwner/);
  });

  it('rechaza una firma mal formada', async () => {
    const typed = buildClaimTypedData(payload);
    await expect(recoverClaimIssuer(typed, '0xdeadbeef')).rejects.toThrow(/firma/i);
  });
});
