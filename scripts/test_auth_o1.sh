#!/usr/bin/env bash
# =============================================================================
# test_auth_o1.sh — Suite de autorización del ciclo O1 (O1.7)
# =============================================================================
# Uso:
#   pnpm -r --filter apps/identity --filter apps/issuer --filter apps/token build
#   ./scripts/test_auth_o1.sh
#
# Requiere las 3 apps construidas (usa `next start`). Levanta apps/identity (4111),
# apps/issuer (4112) y apps/token (4113) con el entorno real de GCP y:
#   1. Comprueba que TODA mutación/protección responde 401 sin cookie.
#   2. Comprueba que /api/test-* responde 404 sin ALLOW_DEBUG_ENDPOINTS=1 (RF-W-07).
#   3. Comprueba que el marketplace (GET /api/tokens) y /api/health siguen públicos.
#   4. Ejecuta el flujo SIWE completo firmando con `cast` y accede con la cookie.
#   5. Rechaza una cookie falsificada.
#
# Limpia al final las sesiones de la dirección de prueba para no ensuciar el esquema.
# =============================================================================
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# Secreto de prueba (solo para este script; producción usa Secret Manager).
export SIWE_SESSION_SECRET="test-o1-secret-0123456789abcdef0123456789abcdef"
export PATH="$HOME/.foundry/bin:$PATH"

# shellcheck disable=SC1091
source "$ROOT/scripts/gcp-env.sh" --tcp >/dev/null 2>&1

TEST_ADDRESS="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
TEST_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
NULL_UUID="00000000-0000-0000-0000-000000000000"
PORTS=(4111 4112 4113)
PIDS=()
FAIL=0

free_port() {
  local port=$1 pid
  pid="$(ss -ltnp 2>/dev/null | grep ":${port} " | grep -oP 'pid=\K[0-9]+' | head -1)"
  [ -n "$pid" ] && kill -9 "$pid" 2>/dev/null || true
}
cleanup() {
  for pid in "${PIDS[@]:-}"; do [ -n "$pid" ] && kill "$pid" 2>/dev/null || true; done
  for port in "${PORTS[@]}"; do free_port "$port"; done
  if command -v psql >/dev/null 2>&1 || [ -x "$HOME/bin/psql" ]; then
    "$(command -v psql || echo "$HOME/bin/psql")" \
      "host=34.39.180.101 port=5432 dbname=truekeate user=app sslmode=disable connect_timeout=10" \
      -Atc "DELETE FROM rwa.sessions WHERE address = lower('$TEST_ADDRESS');" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

start_app() {
  local app=$1 port=$2
  free_port "$port"
  ( cd "$ROOT/$app" && exec npx next start -p "$port" > "/tmp/auth-o1-${app}.log" 2>&1 ) &
  PIDS+=("$!")
}

code() { curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$@"; }

check() { # nombre esperado real
  if [ "$3" = "$2" ]; then
    echo "✓ $1 → HTTP $3"
  else
    echo "✗ $1 → HTTP $3 (esperado $2)"
    FAIL=$((FAIL + 1))
  fi
}

echo "[test-auth-o1] Levantando las 3 apps…"
start_app apps/identity 4111
start_app apps/issuer 4112
start_app apps/token 4113

for _ in $(seq 1 40); do
  if curl -s --max-time 2 -o /dev/null http://localhost:4111/api/health \
     && curl -s --max-time 2 -o /dev/null http://localhost:4113/api/health; then
    break
  fi
  sleep 1
done

echo
echo "— Rutas públicas —"
check "GET /api/health (identity)" 200 "$(code http://localhost:4111/api/health)"
check "GET /api/health (issuer)" 200 "$(code http://localhost:4112/api/health)"
check "GET /api/health (token)" 200 "$(code http://localhost:4113/api/health)"
check "GET /api/tokens (marketplace público)" 200 "$(code http://localhost:4113/api/tokens)"

echo
echo "— apps/identity: rechazo anónimo (401) —"
check "GET /api/claim-requests" 401 "$(code http://localhost:4111/api/claim-requests)"
check "POST /api/claim-requests" 401 "$(code -X POST -H 'Content-Type: application/json' -d '{}' http://localhost:4111/api/claim-requests)"
check "POST /api/upload" 401 "$(code -X POST http://localhost:4111/api/upload)"
check "GET /api/download/[fileId]" 401 "$(code "http://localhost:4111/api/download/$NULL_UUID")"
check "POST /api/issuers/batch" 401 "$(code -X POST -H 'Content-Type: application/json' -d '{"addresses":[]}' http://localhost:4111/api/issuers/batch)"
check "GET /api/auth/session sin cookie" 401 "$(code http://localhost:4111/api/auth/session)"
check "GET /api/auth/session cookie falsificada" 401 "$(code -H 'Cookie: rwa_session=abc.def' http://localhost:4111/api/auth/session)"

echo
echo "— apps/issuer: rechazo anónimo (401) —"
check "GET /api/issuer-requests" 401 "$(code 'http://localhost:4112/api/issuer-requests?issuerAddress=0x0000000000000000000000000000000000000000')"
check "GET /api/issuers" 401 "$(code 'http://localhost:4112/api/issuers?address=0x0000000000000000000000000000000000000000')"
check "POST /api/issuers" 401 "$(code -X POST -H 'Content-Type: application/json' -d '{}' http://localhost:4112/api/issuers)"
check "POST /api/update-request" 401 "$(code -X POST -H 'Content-Type: application/json' -d '{}' http://localhost:4112/api/update-request)"
check "GET /api/download/[fileId]" 401 "$(code "http://localhost:4112/api/download/$NULL_UUID")"

echo
echo "— apps/token: rechazo anónimo (401) —"
check "POST /api/tokens" 401 "$(code -X POST -H 'Content-Type: application/json' -d '{}' http://localhost:4113/api/tokens)"
for sub in claims compliance modules price; do
  check "POST /api/tokens/[id]/$sub" 401 "$(code -X POST -H 'Content-Type: application/json' -d '{}' "http://localhost:4113/api/tokens/$NULL_UUID/$sub")"
done

echo
echo "— Endpoints de depuración (RF-W-07: 404 sin ALLOW_DEBUG_ENDPOINTS=1) —"
check "GET /api/test-gridfs" 404 "$(code http://localhost:4111/api/test-gridfs)"
check "GET /api/test-db" 404 "$(code http://localhost:4113/api/test-db)"

echo
echo "— Flujo SIWE positivo (firma real con cast) —"
if ! command -v cast >/dev/null 2>&1; then
  echo "⚠ cast no disponible: se omite la prueba positiva"
else
  NONCE_JSON="$(curl -s --max-time 15 -X POST http://localhost:4111/api/auth/nonce \
    -H 'Content-Type: application/json' -d "{\"address\":\"$TEST_ADDRESS\"}")"
  MESSAGE="$(printf '%s' "$NONCE_JSON" | jq -r '.data.message // empty')"
  if [ -z "$MESSAGE" ]; then
    echo "✗ POST /api/auth/nonce no devolvió mensaje: $NONCE_JSON"; FAIL=$((FAIL + 1))
  else
    SIGNATURE="$(cast wallet sign "$MESSAGE" --private-key "$TEST_KEY" 2>/dev/null)"
    VERIFY_CODE="$(code -c /tmp/auth-o1-cookies.txt -X POST http://localhost:4111/api/auth/verify \
      -H 'Content-Type: application/json' \
      -d "$(jq -nc --arg m "$MESSAGE" --arg s "$SIGNATURE" '{message:$m,signature:$s}')")"
    check "POST /api/auth/verify (firma válida)" 200 "$VERIFY_CODE"
    check "GET /api/auth/session con cookie" 200 "$(code -b /tmp/auth-o1-cookies.txt http://localhost:4111/api/auth/session)"
    check "GET /api/claim-requests con sesión" 200 "$(code -b /tmp/auth-o1-cookies.txt 'http://localhost:4111/api/claim-requests?requesterAddress='$TEST_ADDRESS)"
    check "GET /api/claim-requests de OTRA dirección" 403 "$(code -b /tmp/auth-o1-cookies.txt 'http://localhost:4111/api/claim-requests?requesterAddress=0x70997970C51812dc3A010C7d01b50e0d17dc79C8')"
    check "GET /api/download/[fileId] inexistente" 404 "$(code -b /tmp/auth-o1-cookies.txt "http://localhost:4111/api/download/$NULL_UUID")"
    check "POST /api/auth/logout" 200 "$(code -b /tmp/auth-o1-cookies.txt -X POST http://localhost:4111/api/auth/logout)"
    check "GET /api/auth/session tras logout" 401 "$(code -b /tmp/auth-o1-cookies.txt http://localhost:4111/api/auth/session)"
  fi
fi

echo
if [ "$FAIL" -eq 0 ]; then
  echo "[test-auth-o1] ✓ TODAS las comprobaciones en verde"
  exit 0
fi
echo "[test-auth-o1] ✗ ${FAIL} comprobación(es) fallaron"
exit 1
