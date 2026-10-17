import { describe, expect, it } from 'vitest';

import { ValidationError } from '../errors';
import {
  createClaimRequestSchema,
  createTokenSchema,
  issuerNameSchema,
  parseBody,
  setPriceSchema,
  updateRequestSchema,
} from './index';

const ADDR = '0x1111111111111111111111111111111111111111';
const ADDR2 = '0x2222222222222222222222222222222222222222';
const SIG = `0x${'ab'.repeat(65)}`;

describe('validación zod de las rutas (RT-W-03)', () => {
  it('acepta una solicitud de claim válida', () => {
    const parsed = createClaimRequestSchema.parse({
      requesterAddress: ADDR,
      issuerAddress: ADDR2,
      claimTopic: '1',
      message: 'hola',
      signedMessage: 'msg',
      signature: '0x',
    });
    expect(parsed.claimTopic).toBe('1');
  });

  it('rechaza direcciones inválidas y campos obligatorios ausentes', () => {
    expect(() =>
      createClaimRequestSchema.parse({
        requesterAddress: '0x123',
        issuerAddress: ADDR2,
        claimTopic: '1',
        signedMessage: 'm',
        signature: '0x',
      }),
    ).toThrow();
    expect(() => createClaimRequestSchema.parse({})).toThrow();
  });

  it('valida el payload EIP-712 solo si se envía', () => {
    const base = { requestId: '11111111-2222-3333-4444-555555555555', status: 'rejected' };
    expect(updateRequestSchema.parse(base).status).toBe('rejected');
    expect(() =>
      updateRequestSchema.parse({
        ...base,
        claim: {
          chainId: 31337,
          identityAddress: ADDR,
          walletOwner: ADDR,
          topic: '1',
          scheme: 1,
          data: '0x1234',
          uri: 'rwa://x',
          expiresAt: '0',
          nonce: '0',
        },
        claimSignature: SIG,
      }),
    ).not.toThrow();
    expect(() =>
      updateRequestSchema.parse({ ...base, status: 'other' }),
    ).toThrow();
  });

  it('exige los tres registries y al menos un topic al crear token', () => {
    const base = {
      name: 'Token',
      symbol: 'TKN',
      decimals: 18,
      adminAddress: ADDR,
      tokenAddress: ADDR2,
      identityRegistry: ADDR,
      trustedIssuersRegistry: ADDR,
      claimTopicsRegistry: ADDR,
      requiredClaims: [1],
    };
    expect(createTokenSchema.parse(base).symbol).toBe('TKN');
    expect(() =>
      createTokenSchema.parse({ ...base, claimTopicsRegistry: undefined }),
    ).toThrow();
    expect(() => createTokenSchema.parse({ ...base, requiredClaims: [] })).toThrow();
    expect(() => createTokenSchema.parse({ ...base, symbol: 'tk' })).toThrow();
  });

  it('valida precio y nombre de emisor', () => {
    expect(setPriceSchema.parse({ price: '1.5' }).price).toBe('1.5');
    expect(() => setPriceSchema.parse({ price: '-1' })).toThrow();
    expect(() => setPriceSchema.parse({ price: 'NaN' })).toThrow();
    expect(issuerNameSchema.parse({ address: ADDR, name: '  Emisor  ' }).name).toBe('Emisor');
    expect(() => issuerNameSchema.parse({ address: ADDR, name: '   ' })).toThrow();
  });

  it('parseBody lanza ValidationError (400) con el campo culpable', () => {
    try {
      parseBody(createClaimRequestSchema, { requesterAddress: 'nope' });
      throw new Error('no lanzó');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).httpStatus).toBe(400);
      expect((error as ValidationError).field).toBe('requesterAddress');
    }
  });
});
