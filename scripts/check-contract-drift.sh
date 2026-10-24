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

# --- Preflight H-01: el artefacto de despliegue debe estar VERSIONADO en rwa-sc ----
SC_DEPLOYMENTS="$ROOT/../rwa-sc/sc/deployments"
DEP_ARTIFACT="$(ls "$SC_DEPLOYMENTS"/*.json 2>/dev/null | sort | tail -1 | xargs -r basename)"
if [ -z "$DEP_ARTIFACT" ]; then
  echo "✗ check-contract-drift: no hay artefactos de despliegue en rwa-sc" >&2
  exit 1
fi
if ! git -C "$ROOT/../rwa-sc" ls-files --error-unmatch "sc/deployments/$DEP_ARTIFACT" >/dev/null 2>&1; then
  echo "✗ check-contract-drift: el artefacto de despliegue $DEP_ARTIFACT NO está versionado en rwa-sc (H-01)" >&2
  echo "  Versiona el artefacto en rwa-sc antes de consumirlo desde @web." >&2
  exit 1
fi
if ! grep -qF "$DEP_ARTIFACT" "$ROOT/.env.example"; then
  echo "✗ check-contract-drift: .env.example no referencia el artefacto canónico $DEP_ARTIFACT (H-01/H-03)" >&2
  exit 1
fi
# --- Gate documental H-03: la doc viva de @sc debe citar el artefacto canónico ----
SC_DOC="$ROOT/../rwa-sc/RepoTecnico/entornos_globales.md"
if [ -f "$SC_DOC" ] && ! grep -qF "$DEP_ARTIFACT" "$SC_DOC"; then
  echo "✗ check-contract-drift: rwa-sc/RepoTecnico/entornos_globales.md no cita el artefacto canónico $DEP_ARTIFACT (H-03)" >&2
  exit 1
fi
echo "✓ check-contract-drift: artefacto de despliegue versionado, referenciado y documentado ($DEP_ARTIFACT)"

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
