import { describe, expect, it } from 'vitest';
import { encodeAbiParameters, encodeEventTopics, type Log } from 'viem';
import { TokenCloneableAbi } from '@rwa/shared/contracts';

import {
  EVENT_BY_TOPIC,
  INDEXED_EVENTS,
  decodeChainLog,
  eventRisk,
  normalizeArgs,
} from './catalog';

const TOKEN = '0x7d5dC0378b776A63D479869d22711df1b20672c9';
const ALICE = '0x1111111111111111111111111111111111111111';
const BOB = '0x2222222222222222222222222222222222222222';
const ZERO = '0x0000000000000000000000000000000000000000';
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

function transferLog(from: string, to: string, value: bigint): Log {
  const topics = encodeEventTopics({
    abi: TokenCloneableAbi,
    eventName: 'Transfer',
    args: { from: from as `0x${string}`, to: to as `0x${string}` },
  } as never) as [`0x${string}`, ...`0x${string}`[]];
  const data = encodeAbiParameters([{ type: 'uint256' }], [value]);
  return {
    address: TOKEN,
    topics,
    data,
    blockNumber: 5n,
    blockHash: `0x${'ab'.repeat(32)}`,
    transactionHash: `0x${'cd'.repeat(32)}`,
    transactionIndex: 0,
    logIndex: 3,
    removed: false,
  } as unknown as Log;
}

describe('catálogo de eventos', () => {
  it('incluye los eventos exigidos por RNF-401', () => {
    const names = new Set(INDEXED_EVENTS.map((definition) => definition.name));
    for (const required of [
      'Transfer',
      'ClaimAdded',
      'ClaimRevoked',
      'ClaimRemoved',
      'ComplianceModuleAdded',
      'ComplianceModuleRemoved',
      'ModuleAdded',
      'ModuleRemoved',
      'IdentityRegistered',
      'IdentityRemoved',
    ]) {
      expect(names.has(required), `falta ${required}`).toBe(true);
    }
    expect(INDEXED_EVENTS.length).toBeGreaterThan(30);
  });

  it('calcula el topic0 canónico de Transfer', () => {
    expect(EVENT_BY_TOPIC.has(TRANSFER_TOPIC)).toBe(true);
    expect(EVENT_BY_TOPIC.get(TRANSFER_TOPIC)?.name).toBe('Transfer');
  });

  it('decodifica un Transfer con direcciones normalizadas y value como string', () => {
    const decoded = decodeChainLog(transferLog(ALICE, BOB, 1_000n));
    expect(decoded).not.toBeNull();
    expect(decoded?.eventName).toBe('Transfer');
    expect(decoded?.args.from).toBe(ALICE);
    expect(decoded?.args.to).toBe(BOB);
    expect(decoded?.args.value).toBe('1000');
    expect(decoded?.logIndex).toBe(3);
    expect(decoded?.removed).toBe(false);
  });

  it('devuelve null para logs de eventos no catalogados', () => {
    const log = transferLog(ALICE, BOB, 1n);
    const unknown = { ...log, topics: [`0x${'00'.repeat(32)}`] } as unknown as Log;
    expect(decodeChainLog(unknown)).toBeNull();
  });
});

describe('riesgo y normalización', () => {
  it('mint/burn (from/to cero) es riesgo alto', () => {
    expect(eventRisk('Transfer', { from: ZERO, to: BOB, value: '1' })).toBe('high');
    expect(eventRisk('Transfer', { from: ALICE, to: ZERO, value: '1' })).toBe('high');
    expect(eventRisk('Transfer', { from: ALICE, to: BOB, value: '1' })).toBe('info');
  });

  it('eventos privilegiados y de configuración tienen su nivel', () => {
    expect(eventRisk('RoleGranted', {})).toBe('high');
    expect(eventRisk('ComplianceModuleRemoved', {})).toBe('high');
    expect(eventRisk('MaxBalanceSet', {})).toBe('medium');
    expect(eventRisk('ClaimTopicAdded', {})).toBe('medium');
    expect(eventRisk('IdentityRegistered', {})).toBe('info');
  });

  it('normalizeArgs convierte bigint, anida arrays y baja direcciones', () => {
    const normalized = normalizeArgs({
      amount: 42n,
      wallet: '0xABCDEFabcdefABCDEFabcdefABCDEFabcdefABCD',
      topics: [1n, 2n],
      meta: { flag: true },
    });
    expect(normalized).toEqual({
      amount: '42',
      wallet: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      topics: ['1', '2'],
      meta: { flag: true },
    });
  });
});
