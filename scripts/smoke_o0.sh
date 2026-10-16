#!/usr/bin/env bash
# =============================================================================
# smoke_o0.sh — Gate reproducible del ciclo O0 (O0.7)
# =============================================================================
# Uso:
#   ./scripts/smoke_o0.sh
#
# Carga el entorno real de GCP (Anvil de GCP + Cloud SQL) y ejecuta la prueba de
# humo de la capa de datos compartida. Sale ≠ 0 si algo falla.
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# shellcheck disable=SC1091
source "$ROOT/scripts/gcp-env.sh" --tcp

pnpm --filter @rwa/shared smoke
