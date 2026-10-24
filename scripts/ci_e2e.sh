#!/usr/bin/env bash
# =============================================================================
# ci_e2e.sh — Wrapper de CI para el E2E contrato→interfaz (H-06)
# =============================================================================
# Uso (CI):  DATABASE_URL=postgresql://... bash scripts/ci_e2e.sh
# Uso local: ./scripts/ci_e2e.sh   (usa scripts/gcp-env.sh si falta DATABASE_URL)
#
# Preflight explícito y, si todo está, ejecuta `scripts/e2e_local_o5.sh`
# (Anvil efímero + despliegue de rwa-sc + build ×3 + apps + claim-flow E2E).
#
# Requisitos: node, pnpm, jq, foundry (anvil/forge/cast), Playwright/Chromium y
# DATABASE_URL apuntando a PostgreSQL con el esquema `rwa` aplicado.
# =============================================================================
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
export PATH="$HOME/.foundry/bin:$PATH"

MISSING=()
for tool in node pnpm jq anvil forge cast; do
  command -v "$tool" >/dev/null 2>&1 || MISSING+=("$tool")
done

if [ "${#MISSING[@]}" -gt 0 ]; then
  echo "✗ ci_e2e: faltan herramientas en el runner: ${MISSING[*]}" >&2
  echo "  El job e2e:claim-flow usa la imagen de Playwright e instala Foundry y jq." >&2
  exit 1
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "✗ ci_e2e: DATABASE_URL no está definida." >&2
  echo "  Define la variable de CI E2E_DATABASE_URL (PostgreSQL con el esquema rwa aplicado)." >&2
  exit 1
fi

if ! node -e "require.resolve('playwright')" >/dev/null 2>&1; then
  echo "✗ ci_e2e: falta la dependencia 'playwright' (pnpm install) o sus navegadores." >&2
  exit 1
fi

bash scripts/e2e_local_o5.sh
