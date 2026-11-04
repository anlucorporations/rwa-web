#!/usr/bin/env bash
# =============================================================================
# provision_c0.sh — Aprovisionamiento de infraestructura del ciclo C0 (RWA v3)
# =============================================================================
# Qué hace (idempotente):
#   1. Backup/PITR de Cloud SQL (7 días + logs de transacción).
#   2. Verifica los secretos de rol de BRLT en Secret Manager (creados en C0).
#   3. Concede secretAccessor a la SA de runtime (si existe).
#   4. Crea el Cloud Run Job `rwa-jobs` (expiración/purga) si falta.
#   5. Crea/reactiva los Cloud Scheduler `rwa-jobs-expire` (5 min) y `rwa-jobs-purge` (03:00).
#   6. Imprime un resumen de verificación.
#
# Uso:
#   DRY_RUN=1 ./provision_c0.sh          # por defecto: solo imprime los comandos
#   DRY_RUN=0 JOBS_IMAGE=<imagen> ./provision_c0.sh
#
# Variables: GCP_PROJECT_ID (mcc-ecommerce), GCP_DB_PROJECT (truekeate-main),
#            GCP_REGION_RUN (europe-west1), JOBS_IMAGE (requerida para el job).
# =============================================================================
set -euo pipefail
export PATH="$HOME/bin:$HOME/google-cloud-sdk/bin:$PATH"

PROJECT="${GCP_PROJECT_ID:-mcc-ecommerce}"
DB_PROJECT="${GCP_DB_PROJECT:-truekeate-main}"
REGION="${GCP_REGION_RUN:-europe-west1}"
SA_EMAIL="${SA_EMAIL:-rwa-web-run@${PROJECT}.iam.gserviceaccount.com}"
SCHED_SA="${SCHED_SA:-rwa-scheduler@${PROJECT}.iam.gserviceaccount.com}"
JOBS_IMAGE="${JOBS_IMAGE:-}"
DRY_RUN="${DRY_RUN:-1}"

log() { printf '\n\033[1;36m[provision_c0] %s\033[0m\n' "$*"; }
run() {
  if [ "$DRY_RUN" = "1" ]; then
    printf '  DRY-RUN: %s\n' "$*"
  else
    "$@"
  fi
}

log "1) Backup + PITR de Cloud SQL ($DB_PROJECT / truekeate-db-dev)"
run gcloud sql instances patch truekeate-db-dev \
  --project "$DB_PROJECT" \
  --backup-start-time 03:00 \
  --retained-backups-count 7 \
  --retained-transaction-log-days 7 \
  --quiet

log "2) Secretos de rol BRLT"
for s in BRLT_ADMIN_KEY BRLT_MINTER_KEY BRLT_PAUSER_KEY; do
  if gcloud secrets describe "$s" --project "$PROJECT" >/dev/null 2>&1; then
    echo "  OK  $s"
  else
    echo "  FALTA $s (crear con: gcloud secrets create $s --project $PROJECT --data-file=<clave>)"
    exit 1
  fi
done

log "3) IAM: secretAccessor para $SA_EMAIL"
for s in BRLT_ADMIN_KEY BRLT_MINTER_KEY BRLT_PAUSER_KEY; do
  run gcloud secrets add-iam-policy-binding "$s" \
    --project "$PROJECT" --member "serviceAccount:${SA_EMAIL}" \
    --role roles/secretmanager.secretAccessor --quiet
done

log "4) Cloud Run Job rwa-jobs"
if [ -z "$JOBS_IMAGE" ]; then
  echo "  AVISO: JOBS_IMAGE vacío; se omite la creación del job (definir imagen de la app)."
else
  if gcloud run jobs describe rwa-jobs --project "$PROJECT" --region "$REGION" >/dev/null 2>&1; then
    run gcloud run jobs update rwa-jobs --project "$PROJECT" --region "$REGION" --image "$JOBS_IMAGE" --quiet
  else
    run gcloud run jobs create rwa-jobs --project "$PROJECT" --region "$REGION" \
      --image "$JOBS_IMAGE" \
      --set-env-vars "LOG_LEVEL=info,PG_POOL_MAX=2" \
      --set-secrets "DATABASE_URL=DATABASE_URL:latest" \
      --max-retries 1 --task-timeout 10m --quiet
  fi

  log "5) Cloud Scheduler: expiración y purga"
  for spec in "rwa-jobs-expire|*/5 * * * *|/internal/jobs/expire-orders" \
              "rwa-jobs-purge|0 3 * * *|/internal/jobs/purge-documents"; do
    IFS='|' read -r name schedule path <<<"$spec"
    if gcloud scheduler jobs describe "$name" --project "$PROJECT" --location "$REGION" >/dev/null 2>&1; then
      run gcloud scheduler jobs update http "$name" --project "$PROJECT" --location "$REGION" \
        --schedule "$schedule" --uri "${JOBS_URL:-}" --oidc-service-account-email "$SCHED_SA" --quiet || true
    else
      echo "  PENDIENTE crear $name -> ${JOBS_URL:-<url del job>}${path}"
    fi
  done
fi

log "6) Verificación"
run gcloud sql instances describe truekeate-db-dev --project "$DB_PROJECT" \
  --format='value(settings.backupConfiguration.enabled,settings.backupConfiguration.pointInTimeRecoveryEnabled)'
gcloud secrets list --project "$PROJECT" --filter='name:BRLT_' --format='value(name)' || true

log "Hecho (DRY_RUN=$DRY_RUN). Para aplicar: DRY_RUN=0 JOBS_IMAGE=<imagen> $0"
