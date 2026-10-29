#!/usr/bin/env bash
# =============================================================================
# deploy_gcp.sh — Aprovisiona y despliega la plataforma RWA en GCP
# =============================================================================
# Usa los SERVICIOS GLOBALES de la plataforma (NO crea duplicados):
#   · Foundry/Anvil global : Cloud Run `mcc-foundry-anvil` (chain 31337)
#   · PostgreSQL global    : Cloud SQL `truekeate-main:southamerica-east1:truekeate-db-dev`
#                            (esquema `rwa`, D-095/D-097/D-101; socket unix en Cloud Run)
#
# Qué hace (idempotente), subcomandos:
#   provision  → APIs, service account, secretos (copia desde truekeate-main) e IAM
#   build      → construye las 4 imágenes (3 apps + indexer) con Cloud Build
#   deploy     → Cloud Run: rwa-identity / rwa-issuer / rwa-token + Cloud Run Job rwa-indexer
#   verify     → healthchecks /api/health (valida RPC global + PostgreSQL global) y job
#   all        → provision + build + deploy + verify
#
# Uso:
#   ./scripts/deploy_gcp.sh all
#   TAG=20261028-1200 ./scripts/deploy_gcp.sh deploy
#   REFRESH_SECRETS=1 ./scripts/deploy_gcp.sh provision
#
# Reglas: sin secretos en disco; no imprime valores de secretos; sin `git push`.
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export PATH="$HOME/bin:$HOME/google-cloud-sdk/bin:$PATH"

PROJECT="${GCP_PROJECT_ID:-mcc-ecommerce}"
REGION="${GCP_REGION_RUN:-europe-west1}"
DB_PROJECT="${GCP_DB_PROJECT:-truekeate-main}"
SQL_CONN="${GCP_SQL_CONN:-truekeate-main:southamerica-east1:truekeate-db-dev}"
RPC_URL="${RPC_URL:-https://mcc-foundry-anvil-1095249147821.europe-west1.run.app}"
REPO="${AR_REPO:-cloud-run-source-deploy}"
SA_NAME="${SA_NAME:-rwa-web-run}"
SA_EMAIL="${SA_NAME}@${PROJECT}.iam.gserviceaccount.com"
TAG="${TAG:-$(date -u +%Y%m%d-%H%M%S)}"
APPS=(identity issuer token)
SECRETS=(DATABASE_URL SIWE_SESSION_SECRET KYC_ENCRYPTION_KEY)

log()  { printf '\n\033[1;36m[deploy_gcp] %s\033[0m\n' "$*"; }
ok()   { printf '  \033[1;32m✓\033[0m %s\n' "$*"; }
warn() { printf '  \033[1;33m!\033[0m %s\n' "$*"; }
die()  { printf '\n\033[1;31m[deploy_gcp] ✗ %s\033[0m\n' "$*" >&2; exit 1; }

g() { gcloud --project "$PROJECT" --quiet "$@"; }

# ---------------------------------------------------------------------------
# provision
# ---------------------------------------------------------------------------
ensure_apis() {
  log "APIs necesarias en $PROJECT"
  local need=(run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com \
              secretmanager.googleapis.com sqladmin.googleapis.com)
  local enabled
  enabled="$(gcloud services list --enabled --project "$PROJECT" --format='value(config.name)' 2>/dev/null || true)"
  for api in "${need[@]}"; do
    if grep -qx "$api" <<<"$enabled"; then
      ok "$api ya habilitada"
    else
      gcloud services enable "$api" --project "$PROJECT" --quiet
      ok "$api habilitada"
    fi
  done
}

ensure_sa() {
  log "Service account de ejecución: $SA_EMAIL"
  if gcloud iam service-accounts describe "$SA_EMAIL" --project "$PROJECT" >/dev/null 2>&1; then
    ok "ya existe"
  else
    gcloud iam service-accounts create "$SA_NAME" \
      --project "$PROJECT" \
      --display-name="RWA web Cloud Run" \
      --description="Runtime de las apps RWA (identity/issuer/token) y del indexer" >/dev/null
    ok "creada"
  fi
}

grant_iam() {
  log "IAM: Cloud SQL cliente en $DB_PROJECT + Secret Accessor en $PROJECT"
  gcloud projects add-iam-policy-binding "$DB_PROJECT" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/cloudsql.client" \
    --condition=None --quiet >/dev/null
  ok "roles/cloudsql.client en $DB_PROJECT (Cloud SQL global)"

  # Logs del build (Cloud Build usa el SA por defecto de Compute Engine)
  local cb_sa
  cb_sa="$(gcloud projects describe "$PROJECT" --format='value(projectNumber)')-compute@developer.gserviceaccount.com"
  gcloud projects add-iam-policy-binding "$PROJECT" \
    --member="serviceAccount:${cb_sa}" \
    --role="roles/logging.logWriter" \
    --condition=None --quiet >/dev/null
  ok "roles/logging.logWriter para Cloud Build ($cb_sa)"

  for s in "${SECRETS[@]}"; do
    gcloud secrets add-iam-policy-binding "$s" \
      --project "$PROJECT" \
      --member="serviceAccount:${SA_EMAIL}" \
      --role="roles/secretmanager.secretAccessor" --quiet >/dev/null
    ok "secretAccessor sobre $s"
  done
}

ensure_secrets() {
  log "Secretos de runtime en $PROJECT (canónico: $DB_PROJECT)"
  for s in "${SECRETS[@]}"; do
    if gcloud secrets describe "$s" --project "$PROJECT" >/dev/null 2>&1; then
      if [[ "${REFRESH_SECRETS:-0}" == "1" ]]; then
        local val
        val="$(gcloud secrets versions access latest --secret "$s" --project "$DB_PROJECT" 2>/dev/null)" \
          || die "no se pudo leer $s desde $DB_PROJECT"
        printf '%s' "$val" | gcloud secrets versions add "$s" --project "$PROJECT" --data-file=- --quiet >/dev/null
        ok "$s: nueva versión copiada desde $DB_PROJECT (valor no impreso)"
      else
        ok "$s ya existe (usa REFRESH_SECRETS=1 para refrescarla)"
      fi
    else
      local val
      val="$(gcloud secrets versions access latest --secret "$s" --project "$DB_PROJECT" 2>/dev/null)" \
        || die "no se pudo leer $s desde $DB_PROJECT"
      printf '%s' "$val" | gcloud secrets create "$s" --project "$PROJECT" \
        --replication-policy=automatic --data-file=- --quiet >/dev/null
      ok "$s creado en $PROJECT (valor no impreso)"
    fi
  done
}

cmd_provision() {
  ensure_apis
  ensure_sa
  ensure_secrets
  grant_iam
  log "Aprovisionamiento completado (proyecto $PROJECT, SA $SA_EMAIL)"
}

# ---------------------------------------------------------------------------
# build
# ---------------------------------------------------------------------------
cmd_build() {
  log "Cloud Build de las 4 imágenes (tag $TAG)"
  ( cd "$ROOT" && gcloud builds submit \
      --project "$PROJECT" \
      --config cloudbuild.yaml \
      --substitutions="_TAG=${TAG},_RPC_URL=${RPC_URL}" \
      --quiet . ) | tail -20
  for app in "${APPS[@]}" indexer; do
    ok "imagen rwa-${app}:${TAG}"
  done
}

# ---------------------------------------------------------------------------
# deploy
# ---------------------------------------------------------------------------
image_for() { printf '%s-docker.pkg.dev/%s/%s/rwa-%s:%s' "$REGION" "$PROJECT" "$REPO" "$1" "$TAG"; }

deploy_service() {
  local app="$1"
  local name="rwa-${app}"
  local env_vars="NEXT_PUBLIC_CHAIN_ID=31337,NEXT_PUBLIC_RPC_URL=${RPC_URL},RPC_URL=${RPC_URL}"
  env_vars+=",PG_POOL_MAX=5,LOG_LEVEL=info,ALLOW_DEBUG_ENDPOINTS=0"

  log "Cloud Run service $name"
  gcloud run deploy "$name" \
    --project "$PROJECT" \
    --region "$REGION" \
    --platform managed \
    --image "$(image_for "$app")" \
    --service-account "$SA_EMAIL" \
    --add-cloudsql-instances "$SQL_CONN" \
    --set-env-vars "$env_vars" \
    --set-secrets "DATABASE_URL=DATABASE_URL:latest,SIWE_SESSION_SECRET=SIWE_SESSION_SECRET:latest,KYC_ENCRYPTION_KEY=KYC_ENCRYPTION_KEY:latest" \
    --allow-unauthenticated \
    --port 3000 \
    --memory 1Gi \
    --cpu 1 \
    --concurrency 80 \
    --min-instances 0 \
    --max-instances 3 \
    --quiet >/dev/null
  ok "$(gcloud run services describe "$name" --project "$PROJECT" --region "$REGION" --format='value(status.url)')"
}

deploy_job() {
  log "Cloud Run Job rwa-indexer"
  local env_vars="NEXT_PUBLIC_CHAIN_ID=31337,NEXT_PUBLIC_RPC_URL=${RPC_URL},RPC_URL=${RPC_URL}"
  env_vars+=",INDEXER_ID=default,INDEXER_SCHEMA=rwa,INDEXER_CHAIN_ID=31337,INDEXER_CONFIRMATIONS=0,LOG_LEVEL=info"

  if gcloud run jobs describe rwa-indexer --project "$PROJECT" --region "$REGION" >/dev/null 2>&1; then
    gcloud run jobs update rwa-indexer \
      --project "$PROJECT" --region "$REGION" \
      --image "$(image_for indexer)" \
      --service-account "$SA_EMAIL" \
      --set-cloudsql-instances "$SQL_CONN" \
      --set-env-vars "$env_vars" \
      --set-secrets "DATABASE_URL=DATABASE_URL:latest,KYC_ENCRYPTION_KEY=KYC_ENCRYPTION_KEY:latest" \
      --quiet >/dev/null
  else
    gcloud run jobs create rwa-indexer \
      --project "$PROJECT" --region "$REGION" \
      --image "$(image_for indexer)" \
      --service-account "$SA_EMAIL" \
      --set-cloudsql-instances "$SQL_CONN" \
      --set-env-vars "$env_vars" \
      --set-secrets "DATABASE_URL=DATABASE_URL:latest,KYC_ENCRYPTION_KEY=KYC_ENCRYPTION_KEY:latest" \
      --args="--once" \
      --max-retries 1 \
      --task-timeout 900 \
      --quiet >/dev/null
  fi
  ok "job rwa-indexer ($REGION)"
}

cmd_deploy() {
  for app in "${APPS[@]}"; do deploy_service "$app"; done
  deploy_job
}

# ---------------------------------------------------------------------------
# verify
# ---------------------------------------------------------------------------
check_health() {
  local name="$1" url json
  url="$(gcloud run services describe "$name" --project "$PROJECT" --region "$REGION" --format='value(status.url)')"
  for _ in $(seq 1 12); do
    json="$(curl -fsS -m 20 "${url}/api/health" 2>/dev/null || true)"
    if [[ -n "$json" ]] && python3 - "$json" <<'PY' >/dev/null 2>&1
import json, sys
d = json.loads(sys.argv[1])
assert d.get("success") is True
data = d.get("data", {})
assert data.get("status") == "ok"
assert data.get("chainId") == 31337
assert data.get("database") == "ok"
PY
    then
      ok "$name → ${url}/api/health (chainId 31337 + PostgreSQL ok)"
      return 0
    fi
    sleep 5
  done
  warn "$name no respondió health válido: ${json:-<sin respuesta>}"
  return 1
}

cmd_verify() {
  local failed=0
  for app in "${APPS[@]}"; do
    check_health "rwa-${app}" || failed=1
  done

  log "Cloud Run Job rwa-indexer (una pasada)"
  if gcloud run jobs execute rwa-indexer --project "$PROJECT" --region "$REGION" --wait --quiet >/dev/null 2>&1; then
    ok "job ejecutado y finalizado"
  else
    warn "la ejecución del job falló (revisa: gcloud run jobs executions list --job rwa-indexer --region $REGION)"
    failed=1
  fi

  if [[ "$failed" -ne 0 ]]; then die "verificación con fallos"; fi
  log "Verificación completada: apps y job usan los servicios globales (Anvil + Cloud SQL)"
}

# ---------------------------------------------------------------------------
# scheduler — ejecución periódica del indexer (Cloud Scheduler → Cloud Run Job)
# ---------------------------------------------------------------------------
cmd_scheduler() {
  local sched_sa="rwa-scheduler@${PROJECT}.iam.gserviceaccount.com"
  log "Cloud Scheduler del indexer (cada ${SCHEDULE_EVERY:-*/10 * * * *})"

  gcloud services enable cloudscheduler.googleapis.com --project "$PROJECT" --quiet
  if ! gcloud iam service-accounts describe "$sched_sa" --project "$PROJECT" >/dev/null 2>&1; then
    gcloud iam service-accounts create rwa-scheduler --project "$PROJECT" \
      --display-name="RWA scheduler (indexer)" >/dev/null
    ok "SA $sched_sa creada"
  else
    ok "SA $sched_sa ya existe"
  fi

  # Permiso para invocar el job
  gcloud run jobs add-iam-policy-binding rwa-indexer \
    --project "$PROJECT" --region "$REGION" \
    --member="serviceAccount:${sched_sa}" \
    --role="roles/run.invoker" --quiet >/dev/null
  ok "run.invoker sobre rwa-indexer"

  local uri="https://${REGION}-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/${PROJECT}/jobs/rwa-indexer:run"
  if gcloud scheduler jobs describe rwa-indexer-schedule --project "$PROJECT" --location "$REGION" >/dev/null 2>&1; then
    gcloud scheduler jobs update http rwa-indexer-schedule \
      --project "$PROJECT" --location "$REGION" \
      --schedule="${SCHEDULE_EVERY:-*/10 * * * *}" \
      --uri="$uri" --http-method=POST \
      --oauth-service-account-email="$sched_sa" \
      --oauth-token-scope="https://www.googleapis.com/auth/cloud-platform" \
      --quiet >/dev/null
  else
    gcloud scheduler jobs create http rwa-indexer-schedule \
      --project "$PROJECT" --location "$REGION" \
      --schedule="${SCHEDULE_EVERY:-*/10 * * * *}" \
      --uri="$uri" --http-method=POST \
      --oauth-service-account-email="$sched_sa" \
      --oauth-token-scope="https://www.googleapis.com/auth/cloud-platform" \
      --quiet >/dev/null
  fi
  ok "rwa-indexer-schedule (${SCHEDULE_EVERY:-*/10 * * * *})"
}

cmd_all() { cmd_provision; cmd_build; cmd_deploy; cmd_scheduler; cmd_verify; }

case "${1:-all}" in
  provision) cmd_provision ;;
  build)     cmd_build ;;
  deploy)    cmd_deploy ;;
  job)       deploy_job ;;
  scheduler) cmd_scheduler ;;
  verify)    cmd_verify ;;
  all)       cmd_all ;;
  *) die "uso: $0 {provision|build|deploy|verify|all}" ;;
esac
