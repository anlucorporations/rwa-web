#!/usr/bin/env bash
# =============================================================================
# test_review_o1.sh — E2E positivo de O1.2 (HW-01: aprobación de claims)
# =============================================================================
# Uso:
#   ./scripts/test_review_o1.sh
#
# Prueba, con firmas reales de `cast` y sesiones SIWE reales:
#   1. El solicitante crea una solicitud (sesión SIWE válida).
#   2. Un tercero NO puede resolverla (403).
#   3. El emisor destinatario no puede resolverla con la firma de otra wallet (403).
#   4. El emisor destinatario la resuelve con su propia firma (200 → approved).
#   5. Una segunda revisión se rechaza por idempotencia (409).
#   6. Limpia la solicitud y las sesiones de prueba (esquema limpio, D-099).
# =============================================================================
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

export SIWE_SESSION_SECRET="test-o1-secret-0123456789abcdef0123456789abcdef"
export PATH="$HOME/.foundry/bin:$PATH"
# shellcheck disable=SC1091
source "$ROOT/scripts/gcp-env.sh" --tcp >/dev/null 2>&1

PSQL="$(command -v psql || echo "$HOME/bin/psql")"
CONN="host=34.39.180.101 port=5432 dbname=truekeate user=app sslmode=disable connect_timeout=10"

REQUESTER="0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"   # Anvil #2
REQUESTER_KEY="0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a"
ISSUER="0x70997970C51812dc3A010C7d01b50e0d17dc79C8"      # Anvil #1
ISSUER_KEY="0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
THIRD="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"      # Anvil #0
THIRD_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"

ID=4111
REG=4112
PORTS=($ID $REG)
PIDS=()
FAIL=0
CLAIM_ID=""

free_port() {
  local port=$1 pid
  pid="$(ss -ltnp 2>/dev/null | grep ":${port} " | grep -oP 'pid=\K[0-9]+' | head -1)"
  [ -n "$pid" ] && kill -9 "$pid" 2>/dev/null || true
}
cleanup() {
  for pid in "${PIDS[@]:-}"; do [ -n "$pid" ] && kill "$pid" 2>/dev/null || true; done
  for port in "${PORTS[@]}"; do free_port "$port"; done
  if [ -n "$CLAIM_ID" ]; then
    "$PSQL" "$CONN" -Atc "DELETE FROM rwa.audit_log WHERE resource_id = '$CLAIM_ID';" >/dev/null 2>&1 || true
    "$PSQL" "$CONN" -Atc "DELETE FROM rwa.claim_requests WHERE id = '$CLAIM_ID';" >/dev/null 2>&1 || true
  fi
  "$PSQL" "$CONN" -Atc "DELETE FROM rwa.sessions WHERE address IN (lower('$REQUESTER'), lower('$ISSUER'), lower('$THIRD'));" >/dev/null 2>&1 || true
}
trap cleanup EXIT

start_app() { local app=$1 port=$2; free_port "$port"; ( cd "$ROOT/$app" && exec npx next start -p "$port" > "/tmp/review-o1-$app.log" 2>&1 ) & PIDS+=("$!"); }

code() { curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$@"; }
check() { if [ "$3" = "$2" ]; then echo "✓ $1 → HTTP $3"; else echo "✗ $1 → HTTP $3 (esperado $2)"; FAIL=$((FAIL + 1)); fi; }

# login <base> <address> <key> <jar>
login() {
  local base=$1 addr=$2 key=$3 jar=$4 nonce msg sig
  nonce="$(curl -s --max-time 15 -X POST "$base/api/auth/nonce" -H 'Content-Type: application/json' -d "{\"address\":\"$addr\"}")"
  msg="$(printf '%s' "$nonce" | jq -r '.data.message // empty')"
  [ -z "$msg" ] && { echo "✗ login: sin mensaje SIWE ($nonce)" >&2; return 1; }
  sig="$(cast wallet sign "$msg" --private-key "$key" 2>/dev/null)"
  curl -s -o /dev/null --max-time 15 -c "$jar" -X POST "$base/api/auth/verify" -H 'Content-Type: application/json' \
    -d "$(jq -nc --arg m "$msg" --arg s "$sig" '{message:$m,signature:$s}')"
}

echo "[test-review-o1] Levantando web-identity (4111) y web-registry-trusted (4112)…"
start_app web-identity $ID
start_app web-registry-trusted $REG
for _ in $(seq 1 40); do curl -s --max-time 2 -o /dev/null "http://localhost:$ID/api/health" && curl -s --max-time 2 -o /dev/null "http://localhost:$REG/api/health" && break; sleep 1; done

ID_BASE="http://localhost:$ID"
REG_BASE="http://localhost:$REG"

echo
echo "1) Sesión SIWE del solicitante y creación de la solicitud"
login "$ID_BASE" "$REQUESTER" "$REQUESTER_KEY" /tmp/jar_req.txt || FAIL=$((FAIL + 1))
CREATE_BODY="$(jq -nc --arg r "$REQUESTER" --arg i "$ISSUER" '{requesterAddress:$r,issuerAddress:$i,claimTopic:"1",message:"e2e O1.2",signedMessage:"requester-signed-message",signature:("0x" + ("22" * 65))}')"
CREATE_RESP="$(curl -s --max-time 20 -b /tmp/jar_req.txt -X POST "$ID_BASE/api/claim-requests" -H 'Content-Type: application/json' -d "$CREATE_BODY")"
CLAIM_ID="$(printf '%s' "$CREATE_RESP" | jq -r '.data._id // empty')"
if [ -n "$CLAIM_ID" ]; then echo "✓ solicitud creada: $CLAIM_ID"; else echo "✗ no se pudo crear la solicitud: $CREATE_RESP"; FAIL=$((FAIL + 1)); fi

echo
echo "2) Un tercero no puede resolverla (403)"
login "$REG_BASE" "$THIRD" "$THIRD_KEY" /tmp/jar_third.txt || FAIL=$((FAIL + 1))
THIRD_SIG="$(cast wallet sign "review by third" --private-key "$THIRD_KEY" 2>/dev/null)"
BODY_THIRD="$(jq -nc --arg id "$CLAIM_ID" --arg s "$THIRD_SIG" '{requestId:$id,status:"approved",issuerSignedMessage:"review by third",issuerSignature:$s}')"
check "POST /api/update-request (tercero)" 403 "$(code -b /tmp/jar_third.txt -X POST "$REG_BASE/api/update-request" -H 'Content-Type: application/json' -d "$BODY_THIRD")"

echo
echo "3) El emisor con la firma de otra wallet no puede resolverla (403)"
login "$REG_BASE" "$ISSUER" "$ISSUER_KEY" /tmp/jar_issuer.txt || FAIL=$((FAIL + 1))
WRONG_SIG="$(cast wallet sign "review wrong key" --private-key "$THIRD_KEY" 2>/dev/null)"
BODY_WRONG="$(jq -nc --arg id "$CLAIM_ID" --arg s "$WRONG_SIG" '{requestId:$id,status:"approved",issuerSignedMessage:"review wrong key",issuerSignature:$s}')"
check "POST /api/update-request (firma ajena)" 403 "$(code -b /tmp/jar_issuer.txt -X POST "$REG_BASE/api/update-request" -H 'Content-Type: application/json' -d "$BODY_WRONG")"

echo
echo "4) El emisor destinatario la resuelve con su firma (200)"
OK_SIG="$(cast wallet sign "review ok" --private-key "$ISSUER_KEY" 2>/dev/null)"
BODY_OK="$(jq -nc --arg id "$CLAIM_ID" --arg s "$OK_SIG" '{requestId:$id,status:"approved",reviewNote:"ok",issuerSignedMessage:"review ok",issuerSignature:$s}')"
RESP_OK="$(curl -s --max-time 20 -b /tmp/jar_issuer.txt -X POST "$REG_BASE/api/update-request" -H 'Content-Type: application/json' -d "$BODY_OK")"
echo "   respuesta: $(printf '%s' "$RESP_OK" | head -c 220)"
STATUS_OK="$(printf '%s' "$RESP_OK" | jq -r '.data.status // empty')"
REVIEWED_BY="$(printf '%s' "$RESP_OK" | jq -r '.data.reviewedBy // empty')"
if [ "$STATUS_OK" = "approved" ]; then echo "✓ estado = approved · reviewedBy = $REVIEWED_BY"; else echo "✗ estado inesperado: $RESP_OK"; FAIL=$((FAIL + 1)); fi

echo
echo "5) Segunda revisión (idempotencia, 409)"
check "POST /api/update-request (reintento)" 409 "$(code -b /tmp/jar_issuer.txt -X POST "$REG_BASE/api/update-request" -H 'Content-Type: application/json' -d "$BODY_OK")"

echo
if [ "$FAIL" -eq 0 ]; then echo "[test-review-o1] ✓ E2E de O1.2 en verde"; exit 0; fi
echo "[test-review-o1] ✗ ${FAIL} comprobación(es) fallaron"
exit 1
