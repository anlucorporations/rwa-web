/**
 * Capa de datos PostgreSQL del frontend RWA (`packages/shared`).
 *
 * Un único pool por proceso, consultas parametrizadas y un repositorio por tabla.
 * Sustituye las 3 copias de `lib/mongodb.ts` (O0.2/O0.3, D-095).
 */

export { getPool, query, queryWith, withTransaction, ping, closePool } from './pool.js';
export { isAddress, normalizeAddress, normalizeAddressOrUndefined } from './address.js';
export { translatePgError } from './pg-errors.js';
export * from './types.js';

export { ClaimTopicsRepository } from './repositories/claim-topics.js';
export { IssuersRepository, type UpsertIssuerResult } from './repositories/issuers.js';
export {
  ClaimRequestsRepository,
  type ClaimRequestFilter,
  type CreateClaimRequestInput,
  type ReviewClaimRequestInput,
} from './repositories/claim-requests.js';
export {
  DocumentFilesRepository,
  type CreateDocumentFileInput,
} from './repositories/document-files.js';
export {
  TokensRepository,
  type CreateTokenInput,
  type TokenStats,
} from './repositories/tokens.js';
export { SessionsRepository, type CreateSessionInput } from './repositories/sessions.js';
export { AuditLogRepository, type RecordAuditInput } from './repositories/audit-log.js';

import { AuditLogRepository } from './repositories/audit-log.js';
import { ClaimRequestsRepository } from './repositories/claim-requests.js';
import { ClaimTopicsRepository } from './repositories/claim-topics.js';
import { DocumentFilesRepository } from './repositories/document-files.js';
import { IssuersRepository } from './repositories/issuers.js';
import { SessionsRepository } from './repositories/sessions.js';
import { TokensRepository } from './repositories/tokens.js';

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
