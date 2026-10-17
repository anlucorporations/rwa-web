/**
 * Capa de datos PostgreSQL del frontend RWA (`packages/shared`).
 *
 * Un único pool por proceso, consultas parametrizadas y un repositorio por tabla.
 * Sustituye las 3 copias de `lib/mongodb.ts` (O0.2/O0.3, D-095).
 */

export { getPool, query, queryWith, withTransaction, ping, closePool } from './pool';
export { isAddress, normalizeAddress, normalizeAddressOrUndefined } from './address';
export { translatePgError } from './pg-errors';
export * from './types';

export { ClaimTopicsRepository } from './repositories/claim-topics';
export { IssuersRepository, type UpsertIssuerResult } from './repositories/issuers';
export {
  ClaimRequestsRepository,
  type ClaimRequestFilter,
  type CreateClaimRequestInput,
  type ReviewClaimRequestInput,
  type ClaimPayloadFields,
} from './repositories/claim-requests';
export {
  DocumentFilesRepository,
  type CreateDocumentFileInput,
} from './repositories/document-files';
export {
  TokensRepository,
  type CreateTokenInput,
  type TokenStats,
  type TokenWithRelations,
} from './repositories/tokens';
export { SessionsRepository, type CreateSessionInput } from './repositories/sessions';
export { AuditLogRepository, type RecordAuditInput } from './repositories/audit-log';

import { AuditLogRepository } from './repositories/audit-log';
import { ClaimRequestsRepository } from './repositories/claim-requests';
import { ClaimTopicsRepository } from './repositories/claim-topics';
import { DocumentFilesRepository } from './repositories/document-files';
import { IssuersRepository } from './repositories/issuers';
import { SessionsRepository } from './repositories/sessions';
import { TokensRepository } from './repositories/tokens';

/**
 * Instancias listas para usar. Todas comparten el mismo pool singleton.
 *
 *   import { repos } from '@rwa/shared/db';
 *   const claims = await repos.claimRequests.list({ requesterAddress });
 */
export const repos = {
  claimTopics: new ClaimTopicsRepository(),
  issuers: new IssuersRepository(),
  claimRequests: new ClaimRequestsRepository(),
  documentFiles: new DocumentFilesRepository(),
  tokens: new TokensRepository(),
  sessions: new SessionsRepository(),
  auditLog: new AuditLogRepository(),
} as const;

export type Repositories = typeof repos;
