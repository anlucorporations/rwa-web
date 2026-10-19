#!/usr/bin/env bash
# =============================================================================
# ci_local.sh — Ensayo local del pipeline de CI de `rwa-web` (O3.5)
# =============================================================================
# Uso:
#   ./scripts/ci_local.sh            # pipeline completo (incluye builds)
#   CI_SKIP_BUILD=1 ./scripts/ci_local.sh   # sin builds (más rápido)
#
# Orden: gates de integridad → typecheck → lint → build → test.
# Falla en el primer paso que falle (set -e).
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

step() { printf '\n\033[1;34m▶ %s\033[0m\n' "$1"; }

step "1/7 · Gate de literales de red"
bash scripts/check-network-literals.sh

step "2/7 · Gate de deriva de ABIs (requiere ../rwa-sc)"
bash scripts/check-contract-drift.sh

step "3/7 · TypeScript (tsc --noEmit)"
pnpm -r --workspace-concurrency=1 --if-present typecheck

step "4/7 · ESLint"
pnpm -r --workspace-concurrency=1 --if-present lint

if [ "${CI_SKIP_BUILD:-0}" = "1" ]; then
  step "5/7 · Build (OMITIDO por CI_SKIP_BUILD=1)"
else
  step "5/7 · Build de producción"
  pnpm -r --workspace-concurrency=1 --if-present build
fi

step "6/7 · Accesibilidad estática (axe) y presupuesto de rendimiento"
node scripts/a11y_o5.mjs
node scripts/perf_budget_o5.mjs

step "7/7 · Tests"
pnpm -r --workspace-concurrency=1 --if-present test

printf '\n\033[1;32m✓ CI local en verde\033[0m\n'
