#!/usr/bin/env bash
# =============================================================================
# provision_txb.sh — Provisión idempotente del Metaplace v3 en tx barlovento
# =============================================================================
# Proyecto destino : barloventasv2 (BarloVentasV2)
# Servicios globales reutilizados:
#   · Foundry (Anvil) global: mcc-foundry-anvil  (chain 31337)
#   · PostgreSQL global:      truekeate-db-dev   (base dedicada txbarlovento)
#
# Uso:
#   DRY_RUN=1 bash provision_txb.sh     # por defecto: sólo muestra comandos
#   DRY_RUN=0 bash provision_txb.sh     # ejecuta (requiere gate G0 superado)
#
# Variables de control:
#   BUILD=1        construye y publica la imagen (Cloud Build)
#   DEPLOY=1       despliega Cloud Run + jobs + scheduler
#   SKIP_RPC=1     no exige que el Foundry global responda (no recomendado)
#   FORCE=1        continúa aunque fallen las comprobaciones de gate
# =============================================================================
set -euo pipefail

export PATH="$HOME/bin:$HOME/google-cloud-sdk/bin:$HOME/.foundry/bin:$PATH"

PROJECT="${TXB_PROJECT:-barloventasv2}"
REGION="${TXB_REGION:-europe-west1}"
SERVICE="${TXB_SERVICE:-txb-metaplace}"
DB_NAME="${TXB_DB_NAME:-txbarlovento}"
DB_USER="${TXB_DB_USER:-txb_app}"
PG_PROJECT="${TXB_GLOBAL_PG_PROJECT:-truekeate-main}"
PG_INSTANCE="${TXB_GLOBAL_PG_INSTANCE:-truekeate-db-dev}"
CLOUD_SQL_CONN="${TXB_CLOUD_SQL_CONN:-truekeate-main:southamerica-east1:truekeate-db-dev}"
FOUNDRY_PROJECT="${TXB_GLOBAL_FOUNDRY_PROJECT:-mcc-ecommerce}"
FOUNDRY_SERVICE="${TXB_GLOBAL_FOUNDRY_SERVICE:-mcc-foundry-anvil}"
RPC_URL="${NEXT_PUBLIC_RPC_URL:-https://mcc-foundry-anvil-slzlptbcla-ew.a.run.app}"
SA_RUNTIME="txb-metaplace@${PROJECT}.iam.gserviceaccount.com"
SA_JOBS="txb-jobs@${PROJECT}.iam.gserviceaccount.com"
AR_REPO="txb"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT}/${AR_REPO}/${SERVICE}:latest"
DRY_RUN="${DRY_RUN:-1}"

run() {
  if [ "$DRY_RUN" = "1" ]; then
    echo "[dry-run] $*"
  else
    echo "[exec] $*"
    "$@"
  fi
}

fail_gate() {
  echo "✗ Gate no superado: $1" >&2
  if [ "${FORCE:-0}" = "1" ]; then
    echo "  (FORCE=1: se continúa bajo responsabilidad del operador)" >&2
  else
    exit 1
  fi
}

echo "== G0 · comprobaciones previas"
gcloud projects describe "$PROJECT" >/dev/null 2>&1 || fail_gate "proyecto $PROJECT inaccesible/billing"
gcloud sql instances describe "$PG_INSTANCE" --project="$PG_PROJECT" >/dev/null 2>&1 \
  || fail_gate "PostgreSQL global $PG_INSTANCE inaccesible"

if [ "${SKIP_RPC:-0}" != "1" ]; then
  CHAIN_ID="$(curl -s -m 20 -X POST -H 'Content-Type: application/json' \
      --data '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}' "$RPC_URL" \
      | sed -n 's/.*"result":"\([^"]*\)".*/\1/p' || true)"
  [ "$CHAIN_ID" = "0x7a69" ] || fail_gate "Foundry global ($RPC_URL) no responde chainId 0x7a69"
  echo "  ✓ Foundry global chainId 0x7a69"
fi

echo "== F1 · APIs habilitadas"
for api in run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com \
           secretmanager.googleapis.com sqladmin.googleapis.com cloudscheduler.googleapis.com \
           logging.googleapis.com monitoring.googleapis.com billingbudgets.googleapis.com; do
  run gcloud services enable "$api" --project="$PROJECT"
done

echo "== F2 · Service accounts e IAM mínimo"
run gcloud iam service-accounts create txb-metaplace --display-name="txb metaplace runtime" --project="$PROJECT"
run gcloud iam service-accounts create txb-jobs --display-name="txb jobs" --project="$PROJECT"
for sa in "$SA_RUNTIME" "$SA_JOBS"; do
  run gcloud projects add-iam-policy-binding "$PROJECT" --member="serviceAccount:$sa" \
    --role="roles/cloudsql.client"
  run gcloud projects add-iam-policy-binding "$PROJECT" --member="serviceAccount:$sa" \
    --role="roles/secretmanager.secretAccessor" --condition=None
done

echo "== F3 · Artifact Registry"
run gcloud artifacts repositories describe "$AR_REPO" --location="$REGION" --project="$PROJECT" \
  2>/dev/null || run gcloud artifacts repositories create "$AR_REPO" \
  --repository-format=docker --location="$REGION" --project="$PROJECT" --description="Metaplace v3 txb"

echo "== F4 · Base de datos dedicada (PostgreSQL global)"
run gcloud sql databases describe "$DB_NAME" --instance="$PG_INSTANCE" --project="$PG_PROJECT" \
  2>/dev/null || run gcloud sql databases create "$DB_NAME" --instance="$PG_INSTANCE" --project="$PG_PROJECT"
if [ "$DRY_RUN" = "0" ] && [ "${SKIP_DB_USER:-0}" != "1" ]; then
  PGPASS="$(openssl rand -base64 24)"
  gcloud sql users create "$DB_USER" --instance="$PG_INSTANCE" --project="$PG_PROJECT" --password="$PGPASS" || \
    gcloud sql users set-password "$DB_USER" --instance="$PG_INSTANCE" --project="$PG_PROJECT" --password="$PGPASS"
  echo "  · Usuario $DB_USER creado/actualizado. Guarda la URL en el secreto txb-database-url."
  echo "  DATABASE_URL=postgresql://${DB_USER}:<password>@/${DB_NAME}?host=/cloudsql/${CLOUD_SQL_CONN}"
  unset PGPASS
fi

echo "== F5 · Secretos (placeholders; los valores los inyecta el operador)"
for secret in txb-database-url txb-siwe-session-secret txb-kyc-encryption-key; do
  run gcloud secrets describe "$secret" --project="$PROJECT" 2>/dev/null || \
    run gcloud secrets create "$secret" --replication-policy=automatic --project="$PROJECT"
done

echo "== F6 · Imagen (opcional: BUILD=1)"
if [ "${BUILD:-0}" = "1" ]; then
  run gcloud builds submit rwa-web/apps/metaplace --tag "$IMAGE" \
    --project="$PROJECT" --region="$REGION"
else
  echo "[dry-run] BUILD=0: omitido (imagen esperada en $IMAGE)"
fi

echo "== F7 · Cloud Run (opcional: DEPLOY=1)"
if [ "${DEPLOY:-0}" = "1" ]; then
  run gcloud run deploy "$SERVICE" --image="$IMAGE" --project="$PROJECT" --region="$REGION" \
    --service-account="$SA_RUNTIME" --allow-unauthenticated \
    --add-cloudsql-instances="$CLOUD_SQL_CONN" \
    --set-env-vars="NEXT_PUBLIC_CHAIN_ID=31337,NEXT_PUBLIC_RPC_URL=${RPC_URL},RPC_URL=${RPC_URL},CHAIN_VERIFY_TX=1,SESSION_COOKIE_NAME=__Host-rwa_session,COOKIE_SECURE=1,SESSION_ROLLING=1" \
    --set-secrets="DATABASE_URL=txb-database-url:latest,SIWE_SESSION_SECRET=txb-siwe-session-secret:latest,KYC_ENCRYPTION_KEY=txb-kyc-encryption-key:latest" \
    --memory=512Mi --cpu=1 --concurrency=80 --min-instances=0 --max-instances=10 --timeout=60
else
  echo "[dry-run] DEPLOY=0: omitido"
fi

echo "== G3 · verificación"
if [ "$DRY_RUN" = "0" ] && [ "${DEPLOY:-0}" = "1" ]; then
  URL="$(gcloud run services describe "$SERVICE" --project="$PROJECT" --region="$REGION" --format='value(status.url)')"
  echo "  URL: $URL"
  curl -s -m 20 "$URL/api/health" || true
  echo
fi

echo "== Provisión finalizada (DRY_RUN=$DRY_RUN)"
