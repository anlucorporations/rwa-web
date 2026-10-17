import { describe, expect, it } from 'vitest';

import { toClaimRequestDto, toIssuerDto, toTokenDto } from './serializers';
import type {
  ClaimRequestRow,
  DocumentFileMetaRow,
  IssuerRow,
  TokenComplianceModuleRow,
  TokenRequiredClaimRow,
  TokenRow,
} from '../db/types';

const baseClaim: ClaimRequestRow = {
  id: 'aaaaaaaa-1111-2222-3333-444444444444',
  requester_address: '0x1111111111111111111111111111111111111111',
  issuer_address: '0x2222222222222222222222222222222222222222',
  claim_topic_id: 1,
  message: 'hola',
  status: 'approved',
  signed_message: 'msg',
  signature: '0xsig',
  review_note: 'ok',
  issuer_signed_message: '{"claim":true}',
  issuer_signature: '0xclaimsig',
  reviewed_by: '0x2222222222222222222222222222222222222222',
  reviewed_at: new Date('2026-01-01T00:00:00Z'),
  identity_address: '0x3333333333333333333333333333333333333333',
  claim_chain_id: 31337,
  claim_scheme: 1,
  claim_wallet_owner: '0x1111111111111111111111111111111111111111',
  claim_nonce: '0',
  claim_expires_at: '0',
  claim_data: '0x1234',
  claim_uri: 'rwa://test',
  claim_uri_hash: '0xabc',
  claim_data_hash: '0xdef',
  claim_signature: '0xclaimsig',
  created_at: new Date('2026-01-01T00:00:00Z'),
  updated_at: new Date('2026-01-01T00:00:00Z'),
};

const doc: DocumentFileMetaRow = {
  id: 'bbbbbbbb-1111-2222-3333-444444444444',
  claim_request_id: baseClaim.id,
  original_name: 'dni.pdf',
  content_type: 'application/pdf',
  size_bytes: '1024',
  sha256: Buffer.from('x'),
  encryption_algo: 'none',
  encryption_nonce: null,
  uploaded_by: baseClaim.requester_address,
  created_at: new Date('2026-01-01T00:00:00Z'),
};

describe('serializadores del contrato heredado', () => {
  it('mapea la solicitud con documento y payload EIP-712', () => {
    const dto = toClaimRequestDto(baseClaim, doc);
    expect(dto._id).toBe(baseClaim.id);
    expect(dto.claimTopic).toBe('1');
    expect(dto.documentFileId).toBe(doc.id);
    expect(dto.documentName).toBe('dni.pdf');
    expect(dto.documentSize).toBe(1024);
    expect(dto.claimPayload).toEqual({
      chainId: 31337,
      identityAddress: baseClaim.identity_address,
      walletOwner: baseClaim.claim_wallet_owner,
      topic: '1',
      scheme: 1,
      data: '0x1234',
      uri: 'rwa://test',
      expiresAt: '0',
      nonce: '0',
    });
    expect(dto.claimSignature).toBe('0xclaimsig');
  });

  it('omite el payload si la solicitud aún no se aprobó', () => {
    const dto = toClaimRequestDto(
      { ...baseClaim, status: 'pending', claim_signature: null, reviewed_by: null, reviewed_at: null },
      null,
    );
    expect(dto.claimPayload).toBeNull();
    expect(dto.documentFileId).toBeUndefined();
  });

  it('mapea el emisor', () => {
    const row: IssuerRow = {
      id: 'cccccccc-1111-2222-3333-444444444444',
      address: '0x2222222222222222222222222222222222222222',
      name: 'Emisor',
      verified: true,
      verified_at: null,
      created_at: new Date('2026-01-01T00:00:00Z'),
      updated_at: new Date('2026-01-01T00:00:00Z'),
    };
    expect(toIssuerDto(row)).toMatchObject({ _id: row.id, address: row.address, name: 'Emisor' });
  });

  it('mapea el token con relaciones y evita parseFloat en price', () => {
    const token: TokenRow = {
      id: 'dddddddd-1111-2222-3333-444444444444',
      token_address: '0x4444444444444444444444444444444444444444',
      admin_address: '0x1111111111111111111111111111111111111111',
      name: 'Token',
      symbol: 'TKN',
      decimals: 18,
      max_total_supply: null,
      total_supply: '1000',
      identity_registry: '0x5555555555555555555555555555555555555555',
      trusted_issuers_registry: '0x6666666666666666666666666666666666666666',
      claim_topics_registry: '0x7777777777777777777777777777777777777777',
      compliance_address: '0x8888888888888888888888888888888888888888',
      price: '1.5',
      description: null,
      transaction_hash: null,
      block_number: '10',
      created_at: new Date('2026-01-01T00:00:00Z'),
      updated_at: new Date('2026-01-01T00:00:00Z'),
    };
    const requiredClaims: TokenRequiredClaimRow[] = [
      { token_id: token.id, claim_topic_id: 1, created_at: new Date() },
      { token_id: token.id, claim_topic_id: 7, created_at: new Date() },
    ];
    const modules: TokenComplianceModuleRow[] = [
      {
        token_id: token.id,
        module_address: '0x9999999999999999999999999999999999999999',
        is_primary: true,
        created_at: new Date(),
      },
    ];
    const dto = toTokenDto(token, { requiredClaims, complianceModules: modules });
    expect(dto._id).toBe(token.id);
    expect(dto.requiredClaims).toEqual([1, 7]);
    expect(dto.complianceModules).toEqual(['0x9999999999999999999999999999999999999999']);
    expect(dto.price).toBe(1.5);
    expect(dto.blockNumber).toBe(10);
  });
});
