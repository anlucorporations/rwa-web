#!/usr/bin/env bash
# =============================================================================
# sync-contracts.sh — Genera el módulo de contratos de `@rwa/shared` desde rwa-sc
# =============================================================================
# Uso:
#   ./scripts/sync-contracts.sh [directorio-salida]
#
# Fuente de verdad (SOLO LECTURA): rwa-sc/sc/abis/*.json y el último artefacto
# rwa-sc/sc/deployments/<chainId>-<timestamp>.json.
#
# Genera:
#   packages/shared/src/contracts/abis/<Contrato>.ts   → `export const <Contrato>Abi = [...] as const`
#   packages/shared/src/contracts/deployments.ts       → direcciones + metadatos del despliegue
#   packages/shared/src/contracts/index.ts             → barrel
#
# Los ficheros generados llevan cabecera "NO EDITAR": se regeneran con este script
# y el gate `check-contract-drift.sh` falla si hay deriva.
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="${1:-$ROOT/packages/shared/src/contracts}"
SC_ABIS="$ROOT/../rwa-sc/sc/abis"
SC_DEPLOYMENTS="$ROOT/../rwa-sc/sc/deployments"

[ -d "$SC_ABIS" ] || { echo "✗ No existe $SC_ABIS" >&2; exit 1; }
[ -d "$SC_DEPLOYMENTS" ] || { echo "✗ No existe $SC_DEPLOYMENTS" >&2; exit 1; }

DEPLOYMENT_FILE="$(ls "$SC_DEPLOYMENTS"/*.json 2>/dev/null | sort | tail -1 || true)"
[ -n "$DEPLOYMENT_FILE" ] || { echo "✗ No hay artefactos de despliegue en $SC_DEPLOYMENTS" >&2; exit 1; }

rm -rf "$OUT/abis"
mkdir -p "$OUT/abis"

INDEX="$OUT/index.ts"
{
  echo "/**"
  echo " * GENERADO por scripts/sync-contracts.sh desde rwa-sc/sc/abis — NO EDITAR."
  echo " * Regenerar: ./scripts/sync-contracts.sh"
  echo " */"
  echo
} > "$INDEX"

count=0
for abi_file in "$SC_ABIS"/*.json; do
  name="$(basename "$abi_file" .json)"
  if ! [[ "$name" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
    echo "⚠ Se omite $name (no es un identificador TS válido)" >&2
    continue
  fi
  target="$OUT/abis/$name.ts"
  {
    echo "/**"
    echo " * GENERADO por scripts/sync-contracts.sh desde rwa-sc/sc/abis/$name.json — NO EDITAR."
    echo " */"
    echo
    echo "export const ${name}Abi = ("
    jq . "$abi_file"
    echo ") as const;"
  } > "$target"
  echo "export * from './abis/$name';" >> "$INDEX"
  count=$((count + 1))
done

echo "export * from './deployments';" >> "$INDEX"

DEPLOYMENTS_TS="$OUT/deployments.ts"
{
  echo "/**"
  echo " * GENERADO por scripts/sync-contracts.sh desde rwa-sc/sc/deployments/$(basename "$DEPLOYMENT_FILE") — NO EDITAR."
  echo " *"
  echo " * Fuente de verdad de direcciones (RF-W-09): no se escriben literales a mano en el código."
  echo " */"
  echo
  echo "export const DEPLOYMENT_METADATA = {"
  echo "  artifact: '$(basename "$DEPLOYMENT_FILE")',"
  jq -r '"  chainId: \(.chainId),", "  block: \(.block),", "  timestamp: \(.timestamp),"' "$DEPLOYMENT_FILE"
  echo "} as const;"
  echo
  echo "/** Direcciones de los contratos del despliegue canónico. */"
  echo "export const CONTRACT_ADDRESSES = {"
  jq -r '.contracts | to_entries[] | "  \(.key): \"\(.value)\","' "$DEPLOYMENT_FILE"
  echo "} as const;"
  echo
  echo "/** Token de demostración desplegado por DeployFullStack (registries y compliance ya configurados). */"
  echo "export const DEMO_TOKEN = {"
  jq -r '.token | to_entries[] | "  \(.key): \"\(.value)\","' "$DEPLOYMENT_FILE" | sed 's/: "\([0-9]*\)",/: \1,/'
  echo "} as const;"
  echo
  cat <<'TS'
export type ContractName = keyof typeof CONTRACT_ADDRESSES;

/** Dirección canónica de un contrato por nombre (falla en compilación si el nombre no existe). */
export function getContractAddress(name: ContractName): `0x${string}` {
  return CONTRACT_ADDRESSES[name] as `0x${string}`;
}
TS
} > "$DEPLOYMENTS_TS"

echo "✓ Generados $count ABIs + deployments.ts ($(basename "$DEPLOYMENT_FILE")) en $OUT"
