#!/usr/bin/env bash
# =============================================================================
# backup_o5.sh — backup y restauración lógica del esquema `rwa` (O5.5, RT-W-07)
#
#   ./scripts/backup_o5.sh                    # pg_dump custom a backups/
#   ./scripts/backup_o5.sh --restore <dump>   # pg_restore --clean --if-exists
#
# Requiere `pg_dump`/`pg_restore` y DATABASE_URL. Los dumps NO se versionan
# (`backups/` está en .gitignore).
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "✗ DATABASE_URL no definida (source scripts/gcp-env.sh --tcp)" >&2
  exit 1
fi

MODE="${1:-backup}"

case "${MODE}" in
  backup)
    command -v pg_dump >/dev/null 2>&1 || {
      echo "✗ pg_dump no disponible" >&2
      exit 1
    }
    mkdir -p backups
    dump="backups/rwa-$(date -u +%Y%m%dT%H%M%SZ).dump"
    pg_dump "${DATABASE_URL}" --format=custom --schema=rwa --file="${dump}"
    echo "✓ backup creado: ${dump}"
    echo "  restauración: ./scripts/backup_o5.sh --restore ${dump}"
    ;;
  --restore|restore)
    dump="${2:-}"
    if [ -z "${dump}" ] || [ ! -f "${dump}" ]; then
      echo "✗ uso: ./scripts/backup_o5.sh --restore <dump>" >&2
      exit 1
    fi
    command -v pg_restore >/dev/null 2>&1 || {
      echo "✗ pg_restore no disponible" >&2
      exit 1
    }
    pg_restore "${DATABASE_URL}" --clean --if-exists --no-owner --schema=rwa --verbose "${dump}"
    echo "✓ restauración completada desde ${dump}"
    ;;
  *)
    echo "✗ uso: ./scripts/backup_o5.sh [--restore <dump>]" >&2
    exit 1
    ;;
esac
