#!/usr/bin/env bash
# =============================================================================
# retention_o5.sh — retención de `sessions` y `audit_log` (O5.5, RNF-W-02)
#
#   ./scripts/retention_o5.sh [--dry-run]
#
# - Borra sesiones caducadas/revocadas con más de SESSION_RETENTION_DAYS días
#   (por defecto 7) desde su expiración.
# - Poda `audit_log` con más de AUDIT_RETENTION_DAYS días (por defecto 365).
# - Índices de apoyo: idx_sessions_expires, idx_audit_log_actor_at (base_datos.sql §6).
#
# Requiere `psql` y DATABASE_URL (Cloud SQL o docker compose).
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DRY_RUN=0
[ "${1:-}" = "--dry-run" ] && DRY_RUN=1

SESSION_RETENTION_DAYS="${SESSION_RETENTION_DAYS:-7}"
AUDIT_RETENTION_DAYS="${AUDIT_RETENTION_DAYS:-365}"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "✗ DATABASE_URL no definida (source scripts/gcp-env.sh --tcp)" >&2
  exit 1
fi
command -v psql >/dev/null 2>&1 || {
  echo "✗ psql no disponible" >&2
  exit 1
}

echo "▶ Retención rwa (dry-run=${DRY_RUN})"
echo "  sessions: expiradas hace > ${SESSION_RETENTION_DAYS} días"
echo "  audit_log: anteriores a ${AUDIT_RETENTION_DAYS} días"

if [ "${DRY_RUN}" -eq 1 ]; then
  psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -v sess="${SESSION_RETENTION_DAYS}" -v audit="${AUDIT_RETENTION_DAYS}" <<'SQL'
SELECT 'sessions' AS tabla, count(*) AS a_borrar
  FROM rwa.sessions
 WHERE expires_at < now() - (:'sess' || ' days')::interval
    OR (revoked_at IS NOT NULL AND revoked_at < now() - (:'sess' || ' days')::interval)
UNION ALL
SELECT 'audit_log', count(*)
  FROM rwa.audit_log
 WHERE at < now() - (:'audit' || ' days')::interval;
SQL
  echo "✓ dry-run: no se ha borrado nada"
  exit 0
fi

psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -v sess="${SESSION_RETENTION_DAYS}" -v audit="${AUDIT_RETENTION_DAYS}" <<'SQL'
BEGIN;
DELETE FROM rwa.sessions
 WHERE expires_at < now() - (:'sess' || ' days')::interval
    OR (revoked_at IS NOT NULL AND revoked_at < now() - (:'sess' || ' days')::interval);
DELETE FROM rwa.audit_log
 WHERE at < now() - (:'audit' || ' days')::interval;
COMMIT;
SQL

echo "✓ retención aplicada"
