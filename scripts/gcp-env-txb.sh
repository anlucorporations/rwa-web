#!/usr/bin/env bash
# =============================================================================
# gcp-env-txb.sh — Entorno del Metaplace v3 en **tx barlovento** (barloventasv2)
# =============================================================================
# Reutiliza los servicios GLOBALES de la cuenta:
#   · Foundry/Anvil global  (mcc-foundry-anvil, chain 31337)
#   · PostgreSQL global     (truekeate-main:southamerica-east1:truekeate-db-dev)
#
# Uso:
#   source rwa-web/scripts/gcp-env-txb.sh
#
# No escribe secretos en disco ni los imprime. Si el secreto DATABASE_URL de txb
# no es accesible (billing), informa y deja las variables sin definir.
# =============================================================================
set -uo pipefail

export PATH="$HOME/bin:$HOME/google-cloud-sdk/bin:$HOME/.foundry/bin:$PATH"

# --- Proyecto destino (tx barlovento) ---------------------------------------
export TXB_PROJECT="${TXB_PROJECT:-barloventasv2}"
export TXB_REGION="${TXB_REGION:-europe-west1}"
export TXB_SERVICE="${TXB_SERVICE:-txb-metaplace}"
export TXB_DB_NAME="${TXB_DB_NAME:-txbarlovento}"
export TXB_DB_USER="${TXB_DB_USER:-txb_app}"

# --- Servicios globales reutilizados ----------------------------------------
export TXB_GLOBAL_PG_PROJECT="${TXB_GLOBAL_PG_PROJECT:-truekeate-main}"
export TXB_GLOBAL_PG_INSTANCE="${TXB_GLOBAL_PG_INSTANCE:-truekeate-db-dev}"
export TXB_GLOBAL_PG_REGION="${TXB_GLOBAL_PG_REGION:-southamerica-east1}"
export TXB_CLOUD_SQL_CONN="${TXB_CLOUD_SQL_CONN:-truekeate-main:southamerica-east1:truekeate-db-dev}"
export TXB_GLOBAL_FOUNDRY_PROJECT="${TXB_GLOBAL_FOUNDRY_PROJECT:-mcc-ecommerce}"
export TXB_GLOBAL_FOUNDRY_SERVICE="${TXB_GLOBAL_FOUNDRY_SERVICE:-mcc-foundry-anvil}"

# URL canónica actual del Foundry global (se consulta en caliente si es posible).
FOUNDRY_URL_FALLBACK="https://mcc-foundry-anvil-slzlptbcla-ew.a.run.app"
export RPC_URL="${NEXT_PUBLIC_RPC_URL:-$FOUNDRY_URL_FALLBACK}"
export NEXT_PUBLIC_RPC_URL="$RPC_URL"
export NEXT_PUBLIC_CHAIN_ID=31337

# --- Secretos (nombres; los valores viven en Secret Manager) ----------------
export TXB_SECRET_DB="txb-database-url"
export TXB_SECRET_SIWE="txb-siwe-session-secret"
export TXB_SECRET_KYC="txb-kyc-encryption-key"

# --- Service accounts objetivo ----------------------------------------------
export TXB_SA_RUNTIME="${TXB_SA_RUNTIME:-txb-metaplace@${TXB_PROJECT}.iam.gserviceaccount.com}"
export TXB_SA_JOBS="${TXB_SA_JOBS:-txb-jobs@${TXB_PROJECT}.iam.gserviceaccount.com}"

echo "[gcp-env-txb] proyecto=$TXB_PROJECT region=$TXB_REGION"
echo "[gcp-env-txb] foundry global=$TXB_GLOBAL_FOUNDRY_PROJECT/$TXB_GLOBAL_FOUNDRY_SERVICE ($RPC_URL)"
echo "[gcp-env-txb] postgres global=$TXB_CLOUD_SQL_CONN · base=$TXB_DB_NAME"

# --- Comprobaciones (informativas; no abortan el source) --------------------
if command -v gcloud >/dev/null 2>&1; then
  if ! gcloud projects describe "$TXB_PROJECT" >/dev/null 2>&1; then
    echo "[gcp-env-txb] ⚠ no se pudo describir el proyecto $TXB_PROJECT (permisos/billing)" >&2
  fi
  if ! gcloud sql instances describe "$TXB_GLOBAL_PG_INSTANCE" --project="$TXB_GLOBAL_PG_PROJECT" >/dev/null 2>&1; then
    echo "[gcp-env-txb] ⚠ no se pudo describir la instancia global $TXB_GLOBAL_PG_INSTANCE" >&2
  fi
else
  echo "[gcp-env-txb] ⚠ gcloud no disponible en PATH" >&2
fi

if command -v curl >/dev/null 2>&1; then
  CHAIN_ID="$(curl -s -m 15 -X POST -H 'Content-Type: application/json' \
      --data '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}' "$RPC_URL" 2>/dev/null | head -c 200)"
  if echo "$CHAIN_ID" | grep -q '0x7a69'; then
    echo "[gcp-env-txb] ✓ Foundry global responde chainId 0x7a69"
  else
    echo "[gcp-env-txb] ⚠ Foundry global NO responde (gate G2): ${CHAIN_ID:0:60}" >&2
  fi
fi

# DATABASE_URL: se lee del secreto si es accesible; nunca se imprime.
if command -v gcloud >/dev/null 2>&1; then
  DBURL="$(timeout 30 gcloud secrets versions access latest --secret="$TXB_SECRET_DB" \
           --project="$TXB_PROJECT" 2>/dev/null || true)"
  if [ -n "$DBURL" ]; then
    export DATABASE_URL="$DBURL"
    echo "[gcp-env-txb] ✓ DATABASE_URL cargada desde Secret Manager"
  else
    echo "[gcp-env-txb] ⚠ DATABASE_URL no disponible (crear secreto $TXB_SECRET_DB; gate G1)" >&2
  fi
fi

export SIWE_SESSION_SECRET="${SIWE_SESSION_SECRET:-}"
export KYC_ENCRYPTION_KEY="${KYC_ENCRYPTION_KEY:-}"
export MARKETPLACE_ADDRESS="${MARKETPLACE_ADDRESS:-}"
export CHAIN_VERIFY_TX="${CHAIN_VERIFY_TX:-1}"
export ALLOWED_ORIGINS="${ALLOWED_ORIGINS:-}"
export ALLOWED_HOSTS="${ALLOWED_HOSTS:-}"
export SESSION_COOKIE_NAME="${SESSION_COOKIE_NAME:-__Host-rwa_session}"
export COOKIE_SECURE="${COOKIE_SECURE:-1}"
export SESSION_TTL_HOURS="${SESSION_TTL_HOURS:-24}"
export SESSION_ROLLING="${SESSION_ROLLING:-1}"

unset DBURL
