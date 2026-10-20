#!/usr/bin/env node
/**
 * retention_o5.mjs — retención de `sessions` y `audit_log` (O5.5, RNF-W-02).
 *
 *   node scripts/retention_o5.mjs [--dry-run]
 *
 * - Borra sesiones caducadas/revocadas con más de SESSION_RETENTION_DAYS días
 *   (por defecto 7) y `audit_log` anterior a AUDIT_RETENTION_DAYS (365).
 * - No requiere `psql`: usa el pool `pg` de `@rwa/shared`.
 * - Índices de apoyo: base_datos.sql §6 (idx_sessions_expires, idx_audit_log_*).
 *
 * Entorno: DATABASE_URL (source scripts/gcp-env.sh --tcp).
 */

import pg from 'pg';

const DRY_RUN = process.argv.includes('--dry-run');
const SESSION_RETENTION_DAYS = Number(process.env.SESSION_RETENTION_DAYS ?? 7);
const AUDIT_RETENTION_DAYS = Number(process.env.AUDIT_RETENTION_DAYS ?? 365);

if (!process.env.DATABASE_URL) {
  console.error('✗ DATABASE_URL no definida (source scripts/gcp-env.sh --tcp)');
  process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

const SESSIONS_WHERE = `
  expires_at < now() - ($1 || ' days')::interval
  OR (revoked_at IS NOT NULL AND revoked_at < now() - ($1 || ' days')::interval)`;
const AUDIT_WHERE = `at < now() - ($1 || ' days')::interval`;

try {
  await client.connect();

  const sessions = await client.query(
    `SELECT count(*)::int AS total FROM rwa.sessions WHERE ${SESSIONS_WHERE}`,
    [SESSION_RETENTION_DAYS],
  );
  const audit = await client.query(
    `SELECT count(*)::int AS total FROM rwa.audit_log WHERE ${AUDIT_WHERE}`,
    [AUDIT_RETENTION_DAYS],
  );

  console.log('▶ Retención rwa (dry-run=' + DRY_RUN + ')');
  console.log(`  sessions: ${sessions.rows[0].total} (más de ${SESSION_RETENTION_DAYS} días caducadas/revocadas)`);
  console.log(`  audit_log: ${audit.rows[0].total} (más de ${AUDIT_RETENTION_DAYS} días)`);

  if (DRY_RUN) {
    console.log('✓ dry-run: no se ha borrado nada');
    process.exit(0);
  }

  await client.query('BEGIN');
  const deletedSessions = await client.query(
    `DELETE FROM rwa.sessions WHERE ${SESSIONS_WHERE}`,
    [SESSION_RETENTION_DAYS],
  );
  const deletedAudit = await client.query(
    `DELETE FROM rwa.audit_log WHERE ${AUDIT_WHERE}`,
    [AUDIT_RETENTION_DAYS],
  );
  await client.query('COMMIT');

  console.log(
    `✓ retención aplicada: ${deletedSessions.rowCount} sesiones y ${deletedAudit.rowCount} registros de auditoría eliminados`,
  );
} catch (error) {
  try {
    await client.query('ROLLBACK');
  } catch {
    /* sin transacción abierta */
  }
  console.error('✗ retención falló:', error instanceof Error ? error.message : error);
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
