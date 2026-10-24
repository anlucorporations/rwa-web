/**
 * Catálogo de eventos on-chain indexados (H-12/H-21, RNF-401/402).
 *
 * Se construye a partir de las **ABIs canónicas generadas desde `rwa-sc`**
 * (`@rwa/shared/contracts`): no hay firmas ni direcciones escritas a mano. El mapa
 * `topic0 → definición` permite decodificar también eventos de **clones creados
 * dinámicamente** (identidades, tokens y claim-topics registries), porque la firma
 * del evento identifica el tipo con independencia de la dirección.
 */

import {
  ClaimTopicsRegistryAbi,
  ClaimTopicsRegistryCloneFactoryAbi,
  ClaimTopicsRegistryCloneableAbi,
  ComplianceAggregatorAbi,
  GovernanceMultisigAbi,
  IdentityCloneFactoryAbi,
  IdentityCloneableAbi,
  IdentityRegistryAbi,
  MaxBalanceComplianceAbi,
  MaxHoldersComplianceAbi,
  TokenCloneFactoryAbi,
  TokenCloneableAbi,
  TransferLockComplianceAbi,
  TrustedIssuersRegistryAbi,
} from '@rwa/shared/contracts';
import { decodeEventLog, toEventSelector, type Abi, type AbiEvent, type Hex, type Log } from 'viem';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const ABIS: Record<string, Abi> = {
  TokenCloneable: TokenCloneableAbi as unknown as Abi,
  IdentityCloneable: IdentityCloneableAbi as unknown as Abi,
  IdentityRegistry: IdentityRegistryAbi as unknown as Abi,
  TrustedIssuersRegistry: TrustedIssuersRegistryAbi as unknown as Abi,
  ClaimTopicsRegistry: ClaimTopicsRegistryAbi as unknown as Abi,
  ClaimTopicsRegistryCloneable: ClaimTopicsRegistryCloneableAbi as unknown as Abi,
  ComplianceAggregator: ComplianceAggregatorAbi as unknown as Abi,
  IdentityCloneFactory: IdentityCloneFactoryAbi as unknown as Abi,
  TokenCloneFactory: TokenCloneFactoryAbi as unknown as Abi,
  ClaimTopicsRegistryCloneFactory: ClaimTopicsRegistryCloneFactoryAbi as unknown as Abi,
  GovernanceMultisig: GovernanceMultisigAbi as unknown as Abi,
  MaxBalanceCompliance: MaxBalanceComplianceAbi as unknown as Abi,
  MaxHoldersCompliance: MaxHoldersComplianceAbi as unknown as Abi,
  TransferLockCompliance: TransferLockComplianceAbi as unknown as Abi,
};

/** Catálogo curado: evento → ABI canónica de la que se toma la firma. */
const EVENT_SPEC: ReadonlyArray<readonly [eventName: string, contractType: string]> = [
  // Token (RNF-401/402): transferencias, compliance y eventos privilegiados.
  ['Transfer', 'TokenCloneable'],
  ['ComplianceModuleAdded', 'TokenCloneable'],
  ['ComplianceModuleRemoved', 'TokenCloneable'],
  ['Frozen', 'TokenCloneable'],
  ['Unfrozen', 'TokenCloneable'],
  ['Paused', 'TokenCloneable'],
  ['Unpaused', 'TokenCloneable'],
  ['DestinationAuthorized', 'TokenCloneable'],
  ['LimitsUpdated', 'TokenCloneable'],
  ['MaxSupplyUpdated', 'TokenCloneable'],
  ['ClaimTopicsRegistrySet', 'TokenCloneable'],
  ['TrustedIssuersRegistrySet', 'TokenCloneable'],
  ['IdentityRegistrySet', 'TokenCloneable'],
  ['RoleGranted', 'TokenCloneable'],
  ['RoleRevoked', 'TokenCloneable'],
  ['RoleAdminChanged', 'TokenCloneable'],
  // Identidad y claims.
  ['ClaimAdded', 'IdentityCloneable'],
  ['ClaimRevoked', 'IdentityCloneable'],
  ['ClaimRemoved', 'IdentityCloneable'],
  // Registro de identidades.
  ['IdentityRegistered', 'IdentityRegistry'],
  ['IdentityRemoved', 'IdentityRegistry'],
  ['IdentityUpdated', 'IdentityRegistry'],
  // Issuers y topics.
  ['TrustedIssuerAdded', 'TrustedIssuersRegistry'],
  ['TrustedIssuerRemoved', 'TrustedIssuersRegistry'],
  ['ClaimTopicsUpdated', 'TrustedIssuersRegistry'],
  ['ClaimTopicAdded', 'ClaimTopicsRegistry'],
  ['ClaimTopicRemoved', 'ClaimTopicsRegistry'],
  // Compliance aggregator.
  ['ModuleAdded', 'ComplianceAggregator'],
  ['ModuleRemoved', 'ComplianceAggregator'],
  ['TokenRegistered', 'ComplianceAggregator'],
  // Factories (creación de clones).
  ['IdentityCreated', 'IdentityCloneFactory'],
  ['TokenCreated', 'TokenCloneFactory'],
  ['RegistryCreated', 'ClaimTopicsRegistryCloneFactory'],
  ['RegistryCreatedForToken', 'ClaimTopicsRegistryCloneFactory'],
  // Gobernanza (RNF-402: eventos privilegiados).
  ['ProposalCreated', 'GovernanceMultisig'],
  ['ProposalApproved', 'GovernanceMultisig'],
  ['ProposalExecuted', 'GovernanceMultisig'],
  ['ProposalCancelled', 'GovernanceMultisig'],
  ['OwnerAdded', 'GovernanceMultisig'],
  ['OwnerRemoved', 'GovernanceMultisig'],
  ['ThresholdUpdated', 'GovernanceMultisig'],
  ['DelayUpdated', 'GovernanceMultisig'],
  // Módulos de compliance (configuración).
  ['MaxBalanceSet', 'MaxBalanceCompliance'],
  ['MaxHoldersSet', 'MaxHoldersCompliance'],
  ['LockPeriodSet', 'TransferLockCompliance'],
  ['TokenContractSet', 'MaxBalanceCompliance'],
  ['HolderAdded', 'MaxHoldersCompliance'],
  ['HolderRemoved', 'MaxHoldersCompliance'],
  ['TransferLocked', 'TransferLockCompliance'],
];

export interface IndexedEventDefinition {
  name: string;
  contractType: string;
  abi: Abi;
  event: AbiEvent;
  topic0: Hex;
}

function findEvent(abi: Abi, name: string): AbiEvent {
  const found = abi.find((item): item is AbiEvent => item.type === 'event' && item.name === name);
  if (!found) throw new Error(`El evento '${name}' no existe en la ABI canónica`);
  return found;
}

function buildCatalog(): IndexedEventDefinition[] {
  const byTopic = new Map<string, IndexedEventDefinition>();
  for (const [name, contractType] of EVENT_SPEC) {
    const abi = ABIS[contractType];
    if (!abi) throw new Error(`ABI desconocida en el catálogo: ${contractType}`);
    const event = findEvent(abi, name);
    const topic0 = toEventSelector(event);
    const key = topic0.toLowerCase();
    if (byTopic.has(key)) continue; // misma firma en otra ABI (p. ej. TokenContractSet en 3 módulos)
    byTopic.set(key, { name, contractType, abi, event, topic0 });
  }
  return [...byTopic.values()];
}

/** Eventos indexados (deduplicados por `topic0`). */
export const INDEXED_EVENTS: readonly IndexedEventDefinition[] = buildCatalog();

/** Mapa `topic0 → definición` para decodificar logs por firma. */
export const EVENT_BY_TOPIC: ReadonlyMap<string, IndexedEventDefinition> = new Map(
  INDEXED_EVENTS.map((def) => [def.topic0.toLowerCase(), def]),
);

export interface DecodedChainEvent {
  address: Hex;
  eventName: string;
  contractType: string;
  args: Record<string, unknown>;
  blockNumber: bigint;
  blockHash: Hex;
  txHash: Hex;
  logIndex: number;
  removed: boolean;
}

function normalizeValue(value: unknown): unknown {
  if (typeof value === 'bigint') return value.toString();
  if (Array.isArray(value)) return value.map(normalizeValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, normalizeValue(v)]),
    );
  }
  if (typeof value === 'string' && /^0x[0-9a-fA-F]{40}$/.test(value)) return value.toLowerCase();
  return value;
}

/** Normaliza argumentos para PostgreSQL/JSON: bigint→string y direcciones→minúsculas. */
export function normalizeArgs(args: unknown): Record<string, unknown> {
  if (!args || typeof args !== 'object') return {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(args as Record<string, unknown>)) {
    out[key] = normalizeValue(value);
  }
  return out;
}

/** Decodifica un log si su `topic0` pertenece al catálogo; si no, devuelve `null`. */
export function decodeChainLog(log: Log): DecodedChainEvent | null {
  if (!log.topics || log.topics.length === 0) return null;
  const topic0 = log.topics[0]?.toLowerCase();
  const definition = topic0 ? EVENT_BY_TOPIC.get(topic0) : undefined;
  if (!definition) return null;
  try {
    const decoded = decodeEventLog({
      abi: [definition.event] as unknown as Abi,
      data: log.data,
      topics: log.topics as [Hex, ...Hex[]],
    });
    return {
      address: log.address.toLowerCase() as Hex,
      eventName: definition.name,
      contractType: definition.contractType,
      args: normalizeArgs(decoded.args),
      blockNumber: log.blockNumber ?? 0n,
      blockHash: (log.blockHash ?? '0x') as Hex,
      txHash: (log.transactionHash ?? '0x') as Hex,
      logIndex: log.logIndex ?? 0,
      removed: Boolean(log.removed),
    };
  } catch {
    return null;
  }
}

const HIGH_RISK = new Set([
  'RoleGranted',
  'RoleRevoked',
  'RoleAdminChanged',
  'Frozen',
  'Unfrozen',
  'Paused',
  'Unpaused',
  'ComplianceModuleRemoved',
  'ModuleRemoved',
  'ClaimRevoked',
  'ClaimRemoved',
  'IdentityRemoved',
  'TrustedIssuerRemoved',
  'ProposalExecuted',
  'OwnerAdded',
  'OwnerRemoved',
  'ThresholdUpdated',
  'DelayUpdated',
]);

const MEDIUM_RISK = new Set([
  'DestinationAuthorized',
  'LimitsUpdated',
  'MaxSupplyUpdated',
  'TrustedIssuerAdded',
  'ClaimTopicAdded',
  'ClaimTopicRemoved',
  'ModuleAdded',
  'ComplianceModuleAdded',
  'MaxBalanceSet',
  'MaxHoldersSet',
  'LockPeriodSet',
]);

/**
 * Nivel de riesgo de un evento para las alertas (RNF-402).
 * Las transferencias con `from`/`to` en la dirección cero son acuñación (mint) o quema
 * (burn) y se marcan como `high`.
 */
export function eventRisk(eventName: string, args: Record<string, unknown>): 'high' | 'medium' | 'info' {
  if (eventName === 'Transfer') {
    const from = String(args.from ?? '');
    const to = String(args.to ?? '');
    if (from === ZERO_ADDRESS || to === ZERO_ADDRESS) return 'high';
    return 'info';
  }
  if (HIGH_RISK.has(eventName)) return 'high';
  if (MEDIUM_RISK.has(eventName)) return 'medium';
  return 'info';
}
