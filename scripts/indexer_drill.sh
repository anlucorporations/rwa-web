#!/usr/bin/env bash
# =============================================================================
# indexer_drill.sh — Drill de integración del indexer off-chain (H-12/H-21)
# =============================================================================
# 1. Anvil efímero + despliegue completo del stack (genera eventos on-chain).
# 2. Esquema PostgreSQL temporal (no toca el esquema `rwa` de producción).
# 3. Indexer --init --once --from 0: crea tablas e indexa todos los eventos.
# 4. Verificaciones: eventos esperados, estado, decodificación e IDEMPOTENCIA
#    (segunda pasada desde 0 no duplica filas).
# 5. Limpieza: drop schema temporal, anvil y artefacto de despliegue.
#
# Uso:  bash scripts/indexer_drill.sh
# Requisitos: forge/anvil/cast, psql, jq, pnpm/node y DATABASE_URL (Cloud SQL).
# =============================================================================
set -uo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
log()  { printf '%b\n' "${BLUE}▶ $*${NC}"; }
ok()   { printf '%b\n' "${GREEN}✓ $*${NC}"; }
warn() { printf '%b\n' "${YELLOW}⚠ $*${NC}"; }
fail() { printf '%b\n' "${RED}✗ $*${NC}" >&2; exit 1; }

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SC_DIR="$ROOT/../rwa-sc/sc"
cd "$ROOT" || fail "no se pudo entrar en $ROOT"
export PATH="$HOME/bin:$HOME/.foundry/bin:$PATH"

for tool in forge anvil cast psql jq pnpm; do command -v "$tool" >/dev/null || fail "falta $tool"; done

PORT="${DRILL_PORT:-8559}"
RPC="http://127.0.0.1:${PORT}"
SCHEMA="${DRILL_SCHEMA:-rwa_indexer_itest}"
TMP="$(mktemp -d /tmp/rwa-indexer-drill-XXXXXX)"
ANVIL_PID=""
DEPLOYMENT_REL="deployments/drill-indexer-$$-$(date -u +%Y%m%dT%H%M%SZ).json"
K0=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

cleanup() {
    [ -n "$ANVIL_PID" ] && kill "$ANVIL_PID" 2>/dev/null || true
    fuser -k "${PORT}/tcp" 2>/dev/null || true
    rm -rf "$TMP"
    rm -f "$SC_DIR/$DEPLOYMENT_REL"
    if [ -n "${DATABASE_URL:-}" ]; then
        psql "$DATABASE_URL" -q -c "DROP SCHEMA IF EXISTS $SCHEMA CASCADE" >/dev/null 2>&1 || true
    fi
}
trap cleanup EXIT INT TERM

# --- 0. Entorno --------------------------------------------------------------
if [ -z "${DATABASE_URL:-}" ]; then
    log "DATABASE_URL no definida; cargando entorno de GCP"
    # shellcheck disable=SC1091
    source "$ROOT/scripts/gcp-env.sh" --tcp >/dev/null || fail "no se pudo cargar el entorno de GCP"
fi
[ -n "${DATABASE_URL:-}" ] || fail "DATABASE_URL no definida"

code=$(psql "$DATABASE_URL" -tAc "SELECT 1" 2>/dev/null) || fail "PostgreSQL no accesible con DATABASE_URL"
[ "$code" = "1" ] || fail "PostgreSQL no responde"
ok "PostgreSQL accesible"

# --- 1. Anvil + despliegue ---------------------------------------------------
log "1/6 · Anvil efímero en ${RPC}"
anvil --host 127.0.0.1 --port "$PORT" --chain-id 31337 >"$TMP/anvil.log" 2>&1 &
ANVIL_PID=$!
for _ in $(seq 1 30); do cast chain-id --rpc-url "$RPC" >/dev/null 2>&1 && break; sleep 1; done
[ "$(cast chain-id --rpc-url "$RPC" 2>/dev/null)" = "31337" ] || fail "Anvil no arrancó"
ok "Anvil listo (chain 31337)"

log "2/6 · Despliegue completo del stack (genera eventos)"
( cd "$SC_DIR" && DEPLOYMENT_JSON="$DEPLOYMENT_REL" forge script script/DeployFullStack.s.sol:DeployFullStack \
    --rpc-url "$RPC" --private-key "$K0" --broadcast >"$TMP/deploy.log" 2>&1 ) \
    || { tail -25 "$TMP/deploy.log" >&2; fail "despliegue falló"; }
DEPLOYMENT_JSON="$SC_DIR/$DEPLOYMENT_REL"
[ -f "$DEPLOYMENT_JSON" ] || fail "no se generó el artefacto"
BLOCK="$(cast block-number --rpc-url "$RPC")"
TOKEN="$(jq -r '.token.address' "$DEPLOYMENT_JSON")"
ok "Stack desplegado en bloque $BLOCK · token=$TOKEN"

# --- 2. Esquema temporal -----------------------------------------------------
log "3/6 · Esquema PostgreSQL temporal '${SCHEMA}'"
psql "$DATABASE_URL" -q -v ON_ERROR_STOP=1 -c "DROP SCHEMA IF EXISTS $SCHEMA CASCADE" -c "CREATE SCHEMA $SCHEMA" \
    || fail "no se pudo crear el esquema temporal"
ok "Esquema temporal creado"

# --- 3. Indexer --------------------------------------------------------------
log "4/6 · Indexer --init --once --from 0"
(
    cd "$ROOT"
    RPC_URL="$RPC" DATABASE_URL="$DATABASE_URL" INDEXER_SCHEMA="$SCHEMA" INDEXER_CHAIN_ID=31337 \
    INDEXER_FROM_BLOCK=0 INDEXER_CONFIRMATIONS=0 INDEXER_CHUNK_SIZE=2000 \
    pnpm --filter @rwa/indexer start -- --once --init --from 0
) >"$TMP/indexer.log" 2>&1 || { tail -40 "$TMP/indexer.log" >&2; fail "el indexer falló"; }
tail -5 "$TMP/indexer.log"
ok "Indexer ejecutado"

# --- 4. Verificaciones -------------------------------------------------------
log "5/6 · Verificación de eventos indexados"
TOTAL="$(psql "$DATABASE_URL" -tAc "SELECT count(*) FROM $SCHEMA.chain_events")"
[ "$TOTAL" -gt 5 ] || fail "se esperaban >5 eventos indexados; hay $TOTAL"
EVENTS="$(psql "$DATABASE_URL" -tAc "SELECT string_agg(DISTINCT event_name, ',' ORDER BY event_name) FROM $SCHEMA.chain_events")"
echo "  eventos: $EVENTS"
for required in IdentityCreated IdentityRegistered TokenCreated TrustedIssuerAdded ClaimTopicAdded; do
    echo "$EVENTS" | grep -q "$required" || fail "falta el evento esperado $required"
done
# Decodificación correcta: algún evento tiene args con una dirección 0x...
ARGS_OK="$(psql "$DATABASE_URL" -tAc "SELECT count(*) FROM $SCHEMA.chain_events WHERE args::text ~ '0x[0-9a-f]{40}'")"
[ "$ARGS_OK" -gt 0 ] || fail "los args decodificados no contienen direcciones"
# Punto de control
STATE="$(psql "$DATABASE_URL" -tAc "SELECT last_block FROM $SCHEMA.indexer_state WHERE indexer_id='default'")"
[ -n "$STATE" ] || fail "indexer_state sin fila"
[ "$STATE" -ge "$BLOCK" ] || fail "last_block ($STATE) < bloque de despliegue ($BLOCK)"
ok "Eventos verificados: $TOTAL filas · last_block=$STATE · args decodificados"

log "6/6 · Idempotencia (segunda pasada desde 0 no duplica)"
(
    cd "$ROOT"
    RPC_URL="$RPC" DATABASE_URL="$DATABASE_URL" INDEXER_SCHEMA="$SCHEMA" INDEXER_CHAIN_ID=31337 \
    INDEXER_FROM_BLOCK=0 INDEXER_CONFIRMATIONS=0 INDEXER_CHUNK_SIZE=2000 \
    pnpm --filter @rwa/indexer start -- --once --from 0
) >"$TMP/indexer2.log" 2>&1 || { tail -30 "$TMP/indexer2.log" >&2; fail "la segunda pasada falló"; }
TOTAL2="$(psql "$DATABASE_URL" -tAc "SELECT count(*) FROM $SCHEMA.chain_events")"
[ "$TOTAL2" = "$TOTAL" ] || fail "idempotencia rota: $TOTAL → $TOTAL2 filas"
ok "Idempotente: $TOTAL2 filas tras reindexar desde 0"

ok "DRILL INDEXER (H-12/H-21) EN VERDE: esquema=$SCHEMA filas=$TOTAL last_block=$STATE"
