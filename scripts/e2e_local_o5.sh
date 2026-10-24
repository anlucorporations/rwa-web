#!/usr/bin/env bash
# =============================================================================
# e2e_local_o5.sh — E2E de claim-flow contra un Anvil local efímero (O3.6/O5)
#
#   ./scripts/e2e_local_o5.sh
#
# Pasos: clona rwa-sc en /tmp → levanta Anvil :8546 → despliega el stack →
# genera un `deployments.ts` temporal → build ×3 apuntando a ese RPC → arranca
# las apps en 4011/4012/4013 con la BD real (gcp-env) → ejecuta
# `scripts/e2e_claim_o5.mjs` → restaura artefactos y para todo.
#
# Prerrequisitos: foundry (anvil/forge/cast), `gcloud` con acceso al secreto
# DATABASE_URL y Chromium de Playwright con sus librerías del sistema.
# No toca `rwa-sc` (trabaja sobre una copia temporal) ni deja cambios en el repo.
# =============================================================================
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
export PATH="$HOME/.foundry/bin:$PATH"

TMP="$(mktemp -d /tmp/rwa-e2e-XXXXXX)"
RPC=http://127.0.0.1:8546
ANVIL_PID=""

cleanup() {
  node scripts/serve_o5.mjs --stop >/dev/null 2>&1 || true
  for port in 4011 4012 4013 8546; do fuser -k "${port}/tcp" 2>/dev/null || true; done
  [ -n "${ANVIL_PID}" ] && kill "${ANVIL_PID}" 2>/dev/null || true
  git checkout -- packages/shared/src/contracts/deployments.ts 2>/dev/null || true
  rm -rf "$TMP"
}
trap cleanup EXIT

echo "▶ 1/7 · Entorno GCP (DATABASE_URL) y copia temporal de rwa-sc"
if [ -z "${DATABASE_URL:-}" ]; then
  # En local se obtiene de Secret Manager; en CI se inyecta como variable (H-06).
  # shellcheck disable=SC1091
  source scripts/gcp-env.sh --tcp >/dev/null
fi
cp -a "$ROOT/../rwa-sc" "$TMP/rwa-sc"

echo "▶ 2/7 · Anvil efímero en ${RPC}"
anvil --host 127.0.0.1 --port 8546 --chain-id 31337 >"$TMP/anvil.log" 2>&1 &
ANVIL_PID=$!
for _ in $(seq 1 30); do cast chain-id --rpc-url "$RPC" >/dev/null 2>&1 && break; sleep 1; done
cast chain-id --rpc-url "$RPC" >/dev/null

echo "▶ 3/7 · Despliegue del stack canónico en el Anvil temporal"
(
  cd "$TMP/rwa-sc/sc" && \
  RPC_URL="$RPC" CHAIN_ID=31337 \
  ADMIN_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  bash script/deploy.sh
) >"$TMP/deploy.log" 2>&1 || true
DEPLOYMENT="$(ls -1 "$TMP"/rwa-sc/sc/deployments/*.json | sort | tail -1)"
if ! grep -q '"contracts"' "$DEPLOYMENT"; then
  echo "✗ no se generó el artefacto de despliegue (ver $TMP/deploy.log)" >&2
  tail -20 "$TMP/deploy.log" >&2
  exit 1
fi
echo "  artefacto: $(basename "$DEPLOYMENT")"

echo "▶ 4/7 · Módulo de contratos temporal + build ×3"
sed -e "s#^ROOT=.*#ROOT=\"$ROOT\"#" \
    -e "s#^SC_DEPLOYMENTS=.*#SC_DEPLOYMENTS=\"$TMP/rwa-sc/sc/deployments\"#" \
    scripts/sync-contracts.sh > "$TMP/sync.sh"
bash "$TMP/sync.sh" "$TMP/contracts" >/dev/null
cp "$TMP/contracts/deployments.ts" packages/shared/src/contracts/deployments.ts

export NEXT_PUBLIC_RPC_URL="$RPC"
export NEXT_PUBLIC_CHAIN_ID=31337
pnpm -r --workspace-concurrency=1 --if-present build

echo "▶ 5/7 · Apps de producción en 4011/4012/4013 contra el Anvil temporal"
node scripts/serve_o5.mjs
for _ in $(seq 1 60); do
  if curl -fsS http://127.0.0.1:4011/ >/dev/null 2>&1 \
    && curl -fsS http://127.0.0.1:4012/ >/dev/null 2>&1 \
    && curl -fsS http://127.0.0.1:4013/ >/dev/null 2>&1; then break; fi
  sleep 2
done

echo "▶ 6/7 · E2E de claim-flow"
E2E_RPC_URL="$RPC" node scripts/e2e_claim_o5.mjs
E2E_EXIT=$?

echo "▶ 7/7 · Limpieza (artefactos canónicos restaurados)"
exit "$E2E_EXIT"
