#!/usr/bin/env bash
# =============================================================================
# check-contract-drift.sh — Gate de deriva de ABIs/direcciones (RF-W-09, O2.6)
# =============================================================================
# Uso:
#   ./scripts/check-contract-drift.sh
#
# Regenera el módulo de contratos en un directorio temporal y lo compara con el
# versionado. Falla (exit 1) si hay cualquier diferencia: eso significa que
# `rwa-sc` cambió y `rwa-web` no se ha regenerado.
# =============================================================================
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMMITTED="$ROOT/packages/shared/src/contracts"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

if ! "$ROOT/scripts/sync-contracts.sh" "$TMP/contracts" >/dev/null 2>&1; then
  echo "✗ check-contract-drift: fallo la generación" >&2
  exit 1
fi

if diff -r "$COMMITTED" "$TMP/contracts" >/tmp/contract_drift.diff 2>&1; then
  echo "✓ check-contract-drift: ABIs y direcciones sincronizados con rwa-sc"
  exit 0
fi

echo "✗ check-contract-drift: deriva detectada entre rwa-web y rwa-sc" >&2
echo "  Regenera con: ./scripts/sync-contracts.sh" >&2
head -40 /tmp/contract_drift.diff >&2
exit 1
