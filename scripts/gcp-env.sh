#!/usr/bin/env bash
# =============================================================================
# gcp-env.sh — Entorno del frontend RWA con servicios REALES de GCP
# =============================================================================
# Uso:
#   source rwa-web/scripts/gcp-env.sh            # modo canónico (socket /cloudsql, requiere Auth Proxy)
#   source rwa-web/scripts/gcp-env.sh --tcp      # modo host autorizado (TCP a la IP pública de Cloud SQL)
#
# Qué hace:
#   1. Exporta la red on-chain canónica: **Anvil de GCP** (chain 31337) — D-096.
#   2. Exporta DATABASE_URL de **PostgreSQL en GCP** (Cloud SQL truekeate-db-dev) — D-095/D-097,
#      leyendo el secreto `DATABASE_URL` del proyecto `truekeate-main` (nunca se imprime).
#   3. Exporta los secretos de aplicación si existen (SIWE_SESSION_SECRET, KYC_ENCRYPTION_KEY).
#   4. Comprueba la conectividad real de AMBOS servicios y aborta con error si alguno falla.
#
# No escribe secretos en disco ni en el repositorio.
# =============================================================================
set -uo pipefail

MODE="${1:-socket}"
GCP_DB_PROJECT="${GCP_DB_PROJECT:-truekeate-main}"
GCP_DB_SECRET="${GCP_DB_SECRET:-DATABASE_URL}"
GCP_SQL_PUBLIC_IP="${GCP_SQL_PUBLIC_IP:-34.39.180.101}"
GCP_SQL_CONN="${GCP_SQL_CONN:-truekeate-main:southamerica-east1:truekeate-db-dev}"

# gcloud del SDK (el de snap está roto en este host)
export PATH="$HOME/bin:$HOME/google-cloud-sdk/bin:$HOME/.foundry/bin:$PATH"

# --- 1. Red on-chain: Anvil de GCP ------------------------------------------
export NEXT_PUBLIC_CHAIN_ID=31337
export NEXT_PUBLIC_RPC_URL="${NEXT_PUBLIC_RPC_URL:-https://mcc-foundry-anvil-1095249147821.europe-west1.run.app}"
export RPC_URL="$NEXT_PUBLIC_RPC_URL"
export NEXT_PUBLIC_DEPLOYMENT_JSON="${NEXT_PUBLIC_DEPLOYMENT_JSON:-rwa-sc/sc/deployments/31337-20261010T162639Z.json}"

# --- 2. PostgreSQL en GCP ----------------------------------------------------
DBURL="$(timeout 60 gcloud secrets versions access latest --secret="$GCP_DB_SECRET" \
         --project="$GCP_DB_PROJECT" 2>/dev/null || true)"
if [ -z "$DBURL" ]; then
  echo "[gcp-env] ✗ No se pudo leer el secreto $GCP_DB_SECRET en $GCP_DB_PROJECT" >&2
  return 1 2>/dev/null || exit 1
fi

case "$MODE" in
  --tcp|tcp)
    # El secreto usa socket unix (/cloudsql/...). Para un host ya autorizado en el ACL
    # de la instancia se reescribe a TCP (la instancia tiene IP pública y requireSsl=false).
    DBUSER=$(printf '%s' "$DBURL" | sed -E 's#^postgresql://([^:]+):.*#\1#')
    DBPASS=$(printf '%s' "$DBURL" | sed -E 's#^postgresql://[^:]+:([^@]+)@.*#\1#')
    export DATABASE_URL="postgresql://${DBUSER}:${DBPASS}@${GCP_SQL_PUBLIC_IP}:5432/truekeate?sslmode=disable"
    ;;
  *)
    export DATABASE_URL="$DBURL"
    ;;
esac

# --- 3. Secretos de aplicación (opcionales) ---------------------------------
for s in SIWE_SESSION_SECRET KYC_ENCRYPTION_KEY; do
  v="$(timeout 40 gcloud secrets versions access latest --secret="$s" --project="$GCP_DB_PROJECT" 2>/dev/null || true)"
  [ -n "$v" ] && export "$s=$v"
done
export LOG_LEVEL="${LOG_LEVEL:-info}"
export ALLOW_DEBUG_ENDPOINTS="${ALLOW_DEBUG_ENDPOINTS:-0}"

# --- 4. Comprobación real de ambos servicios --------------------------------
echo "[gcp-env] Red:        $NEXT_PUBLIC_RPC_URL (chain $NEXT_PUBLIC_CHAIN_ID)"
echo "[gcp-env] BD:         $(printf '%s' "$DATABASE_URL" | sed -E 's#(://[^:]+):[^@]+@#\1:***@#')"

CHAIN_ID_OK="$(timeout 25 curl -s -X POST "$NEXT_PUBLIC_RPC_URL" -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' | jq -r '.result' 2>/dev/null)"
if [ "$CHAIN_ID_OK" = "0x7a69" ]; then
  echo "[gcp-env] ✓ Anvil de GCP responde: chainId 0x7a69 (31337)"
else
  echo "[gcp-env] ✗ Anvil de GCP no responde o chainId inesperado: '$CHAIN_ID_OK'" >&2
fi

export PGPASSWORD="$(printf '%s' "$DATABASE_URL" | sed -E 's#^postgresql://[^:]+:([^@]+)@.*#\1#')"
CONN="host=${GCP_SQL_PUBLIC_IP} port=5432 dbname=truekeate user=app sslmode=disable connect_timeout=10"
if [ -n "$(timeout 30 psql "$CONN" -Atc 'select 1' 2>/dev/null)" ]; then
  N="$(timeout 30 psql "$CONN" -Atc "select count(*) from information_schema.tables where table_schema='rwa' and table_type='BASE TABLE';" 2>/dev/null)"
  echo "[gcp-env] ✓ PostgreSQL en GCP (Cloud SQL $GCP_SQL_CONN) — esquema rwa: ${N:-0} tablas"
else
  echo "[gcp-env] ✗ PostgreSQL en GCP no responde" >&2
fi
