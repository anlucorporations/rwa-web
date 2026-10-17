#!/usr/bin/env bash
# =============================================================================
# check-network-literals.sh — Gate de literales de red (RF-W-08, RNF-W-07, O2.6)
# =============================================================================
# Uso:
#   ./scripts/check-network-literals.sh
#
# Falla si el código fuente de las apps o de `packages/shared` contiene:
#   - direcciones Ethereum literales         0x + 40 hex (salvo la dirección cero)
#   - URLs de servicio locales               localhost:  /  127.0.0.1:
#   - URLs http:// de servicio               http://
#   - chainIds literales de red              31337 / 81234
#
# Exentos (configuración legítima y fixtures): `packages/shared/src/config`,
# `packages/shared/src/network`, `contracts/deployments.ts` y los ficheros `*.test.ts`
# (los tests usan valores de red como datos de prueba).
# =============================================================================
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

TARGETS=(
  web-identity/app web-identity/components web-identity/contexts web-identity/lib web-identity/contracts
  web-registry-trusted/app web-registry-trusted/components web-registry-trusted/contexts web-registry-trusted/lib
  web-token/app web-token/components web-token/contexts web-token/lib
  packages/shared/src
)

FAIL=0

scan() { # etiqueta regex lineas-a-descartar
  local label=$1 regex=$2 drop=${3:-'$^'}
  local hits
  hits="$(grep -rnE "$regex" \
    --include='*.ts' --include='*.tsx' --include='*.js' --include='*.mjs' \
    --exclude-dir=node_modules --exclude-dir=.next \
    --exclude='deployments.ts' --exclude='*.test.ts' --exclude='*.test.tsx' \
    "${TARGETS[@]}" 2>/dev/null \
    | grep -vE '^\s*[^:]+:[0-9]+:\s*(\*|//)' \
    | grep -vE "$drop" || true)"
  if [ -n "$hits" ]; then
    echo "✗ $label:"
    printf '%s\n' "$hits" | sed 's/^/    /'
    FAIL=$((FAIL + 1))
  else
    echo "✓ $label"
  fi
}

CONFIG_EXEMPT='packages/shared/src/(config|network)/'
ZERO='0x0{40}'

echo "[check-network-literals] Escaneando ${#TARGETS[@]} rutas de código fuente…"
scan "Sin direcciones Ethereum literales (0x+40 hex)" '0x[0-9a-fA-F]{40}' "($ZERO|$CONFIG_EXEMPT|packages/shared/src/contracts/)"
scan "Sin 'localhost:' ni '127.0.0.1:'" '(localhost|127\.0\.0\.1):' "$CONFIG_EXEMPT"
scan "Sin URLs 'http://' de servicio" "['\"\`]http://" "$CONFIG_EXEMPT"
scan "Sin chainIds literales (31337/81234)" '\b(31337|81234)\b' "$CONFIG_EXEMPT"

echo
if [ "$FAIL" -eq 0 ]; then
  echo "[check-network-literals] ✓ 0 literales de red en el código fuente"
  exit 0
fi
echo "[check-network-literals] ✗ ${FAIL} categoría(s) con literales de red"
exit 1
