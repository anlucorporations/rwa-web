#!/usr/bin/env bash
# =============================================================================
# ci_local.sh — Ensayo local del pipeline de CI de `rwa-web` (O3.5)
# =============================================================================
# Uso:
#   ./scripts/ci_local.sh            # pipeline completo (incluye builds)
#   CI_SKIP_BUILD=1 ./scripts/ci_local.sh   # sin builds (más rápido)
#
# Orden: gates de integridad (literales · deriva · datos) → typecheck → lint →
#        build → a11y/perf/docker → cabeceras → test.
# Falla en el primer paso que falle (set -e).
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

step() { printf '\n\033[1;34m▶ %s\033[0m\n' "$1"; }

step "1/8 · Gates de literales de red y claves privadas"
bash scripts/check-network-literals.sh
bash scripts/check-no-private-keys.sh

step "2/8 · Gate de deriva de ABIs (requiere ../rwa-sc)"
bash scripts/check-contract-drift.sh

step "3/8 · Gate de sincronización de artefactos de datos (D-102, H-04)"
bash RepoTecnico/check_sincronizacion_datos.sh --check

step "4/8 · TypeScript (tsc --noEmit)"
pnpm -r --workspace-concurrency=1 --if-present typecheck

step "5/8 · ESLint"
pnpm -r --workspace-concurrency=1 --if-present lint

if [ "${CI_SKIP_BUILD:-0}" = "1" ]; then
  step "6/8 · Build (OMITIDO por CI_SKIP_BUILD=1)"
else
  step "6/8 · Build de producción"
  pnpm -r --workspace-concurrency=1 --if-present build
fi

step "7/8 · Accesibilidad, rendimiento y assets Docker"
node scripts/a11y_o5.mjs
node scripts/perf_budget_o5.mjs
node scripts/docker_validate_o5.mjs

if [ -d apps/identity/.next ] && [ -d apps/issuer/.next ] && [ -d apps/token/.next ]; then
  step "7b/8 · Cabeceras de seguridad y correlación (build servido)"
  node scripts/serve_o5.mjs
  trap 'node scripts/serve_o5.mjs --stop >/dev/null 2>&1 || true' EXIT
  node scripts/headers_o5.mjs
  node scripts/serve_o5.mjs --stop
  trap - EXIT
else
  step "7b/8 · Cabeceras de seguridad (OMITIDO: falta el build)"
fi

step "8/8 · Tests"
pnpm -r --workspace-concurrency=1 --if-present test

printf '\n\033[1;32m✓ CI local en verde\033[0m\n'
