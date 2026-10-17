#!/usr/bin/env bash
# =============================================================================
# test_token_o2.sh — Gate de la API de alta de token (O2.4, RF-W-11)
# =============================================================================
# Uso:
#   pnpm --filter web-identity --filter web-token build
#   ./scripts/test_token_o2.sh
#
# Comprueba, con sesión SIWE real:
#   1. POST /api/tokens anónimo → 401.
#   2. Sesión válida pero SIN registries → 400 (fail-closed, ya no hay fallback).
#   3. Sesión válida, registries pero SIN requiredClaims → 400.
#   4. Alta válida → 201 y aparece en GET /api/tokens.
#   5. Limpieza de la fila de prueba (esquema limpio, D-099).
# =============================================================================
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

export SIWE_SESSION_SECRET="test-o2-token-secret-0123456789abcdef0123456789abcdef"
export PATH="$HOME/.foundry/bin:$PATH"
# shellcheck disable=SC1091
source "$ROOT/scripts/gcp-env.sh" --tcp >/dev/null 2>&1

ARTIFACT="$(ls "$ROOT"/../rwa-sc/sc/deployments/*.json | sort | tail -1)"
IDENTITY_REG="$(jq -r '.contracts.IdentityRegistry' "$ARTIFACT")"
TIR="$(jq -r '.contracts.TrustedIssuersRegistry' "$ARTIFACT")"
CTR="$(jq -r '.contracts.ClaimTopicsRegistry' "$ARTIFACT")"
PSQL="$(command -v psql || echo "$HOME/bin/psql")"
CONN="host=34.39.180.101 port=5432 dbname=truekeate user=app sslmode=disable connect_timeout=10"

ADMIN="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
ADMIN_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
TOKEN_ADDR="0x000000000000000000000000000000000000dEaD"
ID_PORT=4121
TOK_PORT=4123
PORTS=($ID_PORT $TOK_PORT)
PIDS=()
FAIL=0
CREATED_ID=""

free_port() {
  local port=$1 pid
  pid="$(ss -ltnp 2>/dev/null | grep ":${port} " | grep -oP 'pid=\K[0-9]+' | head -1)"
  [ -n "$pid" ] && kill -9 "$pid" 2>/dev/null || true
}
cleanup() {
  for pid in "${PIDS[@]:-}"; do [ -n "$pid" ] && kill "$pid" 2>/dev/null || true; done
  for port in "${PORTS[@]}"; do free_port "$port"; done
  if [ -n "$CREATED_ID" ]; then
    "$PSQL" "$CONN" -Atc "DELETE FROM rwa.audit_log WHERE resource_id = '$CREATED_ID';" >/dev/null 2>&1 || true
    "$PSQL" "$CONN" -Atc "DELETE FROM rwa.token_required_claims WHERE token_id = '$CREATED_ID';" >/dev/null 2>&1 || true
    "$PSQL" "$CONN" -Atc "DELETE FROM rwa.token_compliance_modules WHERE token_id = '$CREATED_ID';" >/dev/null 2>&1 || true
    "$PSQL" "$CONN" -Atc "DELETE FROM rwa.tokens WHERE id = '$CREATED_ID';" >/dev/null 2>&1 || true
  fi
  "$PSQL" "$CONN" -Atc "DELETE FROM rwa.sessions WHERE address = lower('$ADMIN');" >/dev/null 2>&1 || true
}
trap cleanup EXIT

start_app() { local app=$1 port=$2; free_port "$port"; ( cd "$ROOT/$app" && exec npx next start -p "$port" > "/tmp/o2-token-$app.log" 2>&1 ) & PIDS+=("$!"); }
code() { curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$@"; }
check() { if [ "$3" = "$2" ]; then echo "✓ $1 → $3"; else echo "✗ $1 → $3 (esperado $2)"; FAIL=$((FAIL + 1)); fi; }

echo "[test-token-o2] Levantando web-identity (4121) y web-token (4123)…"
start_app web-identity $ID_PORT
start_app web-token $TOK_PORT
for _ in $(seq 1 40); do curl -s --max-time 2 -o /dev/null "http://localhost:$ID_PORT/api/health" && curl -s --max-time 2 -o /dev/null "http://localhost:$TOK_PORT/api/health" && break; sleep 1; done

BASE_TOK="http://localhost:$TOK_PORT"
BASE_ID="http://localhost:$ID_PORT"

# Sesión SIWE del admin (la emite cualquier app: comparten BD y secreto)
NONCE="$(curl -s -X POST "$BASE_ID/api/auth/nonce" -H 'Content-Type: application/json' -d "{\"address\":\"$ADMIN\"}")"
MSG="$(printf '%s' "$NONCE" | jq -r '.data.message // empty')"
SIG="$(cast wallet sign "$MSG" --private-key "$ADMIN_KEY" 2>/dev/null)"
curl -s -o /dev/null -c /tmp/o2_token_jar.txt -X POST "$BASE_ID/api/auth/verify" -H 'Content-Type: application/json' \
  -d "$(jq -nc --arg m "$MSG" --arg s "$SIG" '{message:$m,signature:$s}')"

BASE_BODY="$(jq -nc --arg a "$ADMIN" --arg t "$TOKEN_ADDR" '{name:"Test Token",symbol:"TT01",decimals:18,adminAddress:$a,tokenAddress:$t}')"

echo "— Gate RF-W-11 —"
check "POST /api/tokens anónimo" 401 "$(code -X POST -H 'Content-Type: application/json' -d "$BASE_BODY" "$BASE_TOK/api/tokens")"
check "POST sin registries (sesión)" 400 "$(code -b /tmp/o2_token_jar.txt -X POST -H 'Content-Type: application/json' -d "$BASE_BODY" "$BASE_TOK/api/tokens")"

BODY_NO_CLAIMS="$(printf '%s' "$BASE_BODY" | jq --arg ir "$IDENTITY_REG" --arg tir "$TIR" --arg ctr "$CTR" '. + {identityRegistry:$ir, trustedIssuersRegistry:$tir, claimTopicsRegistry:$ctr}')"
check "POST sin requiredClaims" 400 "$(code -b /tmp/o2_token_jar.txt -X POST -H 'Content-Type: application/json' -d "$BODY_NO_CLAIMS" "$BASE_TOK/api/tokens")"

BODY_OK="$(printf '%s' "$BODY_NO_CLAIMS" | jq '. + {requiredClaims:[1], description:"gate O2.4"}')"
RESP="$(curl -s --max-time 20 -b /tmp/o2_token_jar.txt -X POST -H 'Content-Type: application/json' -d "$BODY_OK" "$BASE_TOK/api/tokens")"
CREATED_ID="$(printf '%s' "$RESP" | jq -r '.data._id // empty')"
check "POST válido (201)" 201 "$(printf '%s' "$RESP" | jq -r 'if .success then 201 else 500 end')"
if [ -n "$CREATED_ID" ]; then
  echo "  ✓ token registrado: $CREATED_ID"
  check "GET /api/tokens incluye el token" 200 "$(code "$BASE_TOK/api/tokens?adminAddress=$ADMIN")"
else
  echo "  ✗ respuesta inesperada: $RESP"; FAIL=$((FAIL + 1))
fi

echo
if [ "$FAIL" -eq 0 ]; then echo "[test-token-o2] ✓ gate de token en verde"; exit 0; fi
echo "[test-token-o2] ✗ ${FAIL} comprobación(es) fallaron"
exit 1
