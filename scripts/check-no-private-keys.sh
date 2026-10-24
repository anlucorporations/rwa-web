#!/usr/bin/env bash
# =============================================================================
# check-no-private-keys.sh — Gate: 0 claves privadas en código de producción (H-07)
# =============================================================================
# Uso:
#   ./scripts/check-no-private-keys.sh
#
# Escanea el código que se empaqueta en las apps y paquetes (apps/*/{app,
# components,lib,contexts} y packages/*/src) y falla si encuentra una clave
# privada (asignación privateKey/PRIVATE_KEY) o una de las claves por defecto de
# Anvil fuera de tests/fixtures.
#
# Exentos: ficheros de test (*.test.*, *.spec.*, __tests__/), fixtures y scripts/
# (los harnesses E2E usan las claves públicas por defecto de Anvil, que no son
# secretos reales, pero no deben acabar en el bundle de producción).
# =============================================================================
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

TARGETS=()
for d in apps/*/app apps/*/components apps/*/lib apps/*/contexts packages/*/src; do
  [ -d "$d" ] && TARGETS+=("$d")
done

if [ "${#TARGETS[@]}" -eq 0 ]; then
  echo "✗ check-no-private-keys: no se encontraron rutas de código" >&2
  exit 1
fi

MATCHES="$(grep -rnEi \
  --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' --include='*.mjs' \
  "(private[_-]?key)[^0-9a-fA-F]{0,24}0x[a-fA-F0-9]{64}" \
  "${TARGETS[@]}" 2>/dev/null || true)"

# Claves por defecto de Anvil (públicas de testnet) fuera de tests/fixtures: no
# deben aparecer en código de producción aunque no estén etiquetadas como privateKey.
ANVIL_KEYS="$(grep -rnE \
  --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' --include='*.mjs' \
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80|0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d|0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a" \
  "${TARGETS[@]}" 2>/dev/null | grep -vE "\.(test|spec)\.(ts|tsx|js|jsx):|/__tests__/|/fixtures?/" || true)"

MATCHES="$(printf '%s\n%s' "$MATCHES" "$ANVIL_KEYS" | grep -v '^$' || true)"

if [ -n "$MATCHES" ]; then
  echo "✗ check-no-private-keys: se encontraron claves privadas en código de producción (H-07):" >&2
  echo "$MATCHES" >&2
  echo "  Muévelas a un fixture de test o a un .env.local (ignorado por git)." >&2
  exit 1
fi

echo "✓ check-no-private-keys: 0 claves privadas en código de producción"
