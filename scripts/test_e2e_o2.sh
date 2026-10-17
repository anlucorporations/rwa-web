#!/usr/bin/env bash
# =============================================================================
# test_e2e_o2.sh — E2E del flujo completo contra el Anvil de GCP (O2.7)
# =============================================================================
# Uso:
#   pnpm --filter apps/identity --filter apps/issuer build
#   ./scripts/test_e2e_o2.sh
#
# Flujo real (sin mocks):
#   0. Setup on-chain (idempotente): identidad del inversor + issuer autorizado en el TIR.
#   1. El inversor crea la solicitud vía API con sesión SIWE.
#   2. El emisor firma el claim con EIP-712 (nonce leído on-chain) y lo envía a la API.
#   3. El inversor envía `addClaim` (7 args) a su identidad con esa firma.
#   4. Se verifica on-chain: `hasValidClaim(topic,issuer) == true` y el token demo
#      `isVerified(inversor) == true`.
#
# Limpia las filas off-chain de prueba (solicitud, auditoría y sesiones).
# NO revierte los cambios on-chain de setup (identidad y autorización del issuer) porque
# son estado de entorno de desarrollo; el script es idempotente en ellos.
# =============================================================================
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

export SIWE_SESSION_SECRET="test-e2e-o2-secret-0123456789abcdef0123456789abcdef"
export PATH="$HOME/.foundry/bin:$PATH"
# shellcheck disable=SC1091
source "$ROOT/scripts/gcp-env.sh" --tcp >/dev/null 2>&1

RPC="${O2_RPC_URL:-$RPC_URL}"
ARTIFACT="${O2_ARTIFACT:-$(ls "$ROOT"/../rwa-sc/sc/deployments/*.json | sort | tail -1)}"
PSQL="$(command -v psql || echo "$HOME/bin/psql")"
CONN="host=34.39.180.101 port=5432 dbname=truekeate user=app sslmode=disable connect_timeout=10"

FACTORY="$(jq -r '.contracts.IdentityCloneFactory' "$ARTIFACT")"
REGISTRY="$(jq -r '.contracts.IdentityRegistry' "$ARTIFACT")"
TIR="$(jq -r '.contracts.TrustedIssuersRegistry' "$ARTIFACT")"
TOKEN="$(jq -r '.token.address' "$ARTIFACT")"

ADMIN="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
ADMIN_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
ISSUER="0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
ISSUER_KEY="0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
REQUESTER="0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"
REQUESTER_KEY="0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a"

TOPIC=1
URI="rwa://e2e/o2"
DATA="0x1234"
ID_PORT=4111
REG_PORT=4112
PORTS=($ID_PORT $REG_PORT)
PIDS=()
FAIL=0
CLAIM_ID=""
IDENTITY=""

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
  "$PSQL" "$CONN" -Atc "DELETE FROM rwa.sessions WHERE address IN (lower('$REQUESTER'), lower('$ISSUER'), lower('$ADMIN'));" >/dev/null 2>&1 || true
}
trap cleanup EXIT

start_app() { local app=$1 port=$2; free_port "$port"; ( cd "$ROOT/$app" && exec npx next start -p "$port" > "/tmp/e2e-o2-${app//\//-}.log" 2>&1 ) & PIDS+=("$!"); }
code() { curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$@"; }
check() { if [ "$3" = "$2" ]; then echo "✓ $1 → $3"; else echo "✗ $1 → $3 (esperado $2)"; FAIL=$((FAIL + 1)); fi; }

login() { # base address key jar
  local base=$1 addr=$2 key=$3 jar=$4 nonce msg sig
  nonce="$(curl -s --max-time 15 -X POST "$base/api/auth/nonce" -H 'Content-Type: application/json' -d "{\"address\":\"$addr\"}")"
  msg="$(printf '%s' "$nonce" | jq -r '.data.message // empty')"
  [ -z "$msg" ] && return 1
  sig="$(cast wallet sign "$msg" --private-key "$key" 2>/dev/null)"
  curl -s -o /dev/null --max-time 15 -c "$jar" -X POST "$base/api/auth/verify" -H 'Content-Type: application/json' \
    -d "$(jq -nc --arg m "$msg" --arg s "$sig" '{message:$m,signature:$s}')"
}

echo "════════ O2.7 · E2E del flujo de claim contra el Anvil de GCP (chain 31337) ════════"
echo "[setup] identidad del inversor y autorización del emisor (idempotente)"
IDENTITY="$(cast call "$REGISTRY" 'getIdentity(address)(address)' "$REQUESTER" --rpc-url "$RPC")"
if [ "$IDENTITY" = "0x0000000000000000000000000000000000000000" ]; then
  cast send "$FACTORY" 'createIdentity(address)' "$REQUESTER" --private-key "$ADMIN_KEY" --rpc-url "$RPC" >/dev/null 2>&1 || { echo "✗ createIdentity falló"; exit 1; }
  IDENTITY="$(cast call "$FACTORY" 'userIdentities(address,uint256)(address)' "$REQUESTER" 0 --rpc-url "$RPC")"
  cast send "$REGISTRY" 'registerIdentity(address,address)' "$REQUESTER" "$IDENTITY" --private-key "$ADMIN_KEY" --rpc-url "$RPC" >/dev/null 2>&1 || { echo "✗ registerIdentity falló"; exit 1; }
  echo "  ✓ identidad creada y registrada: $IDENTITY"
else
  echo "  ✓ identidad ya existente: $IDENTITY"
fi
if [ "$(cast call "$TIR" 'hasClaimTopic(address,uint256)(bool)' "$ISSUER" "$TOPIC" --rpc-url "$RPC")" = "false" ]; then
  if [ "$(cast call "$TIR" 'isTrustedIssuer(address)(bool)' "$ISSUER" --rpc-url "$RPC")" = "false" ]; then
    cast send "$TIR" 'addTrustedIssuer(address,uint256[])' "$ISSUER" "[$TOPIC]" --private-key "$ADMIN_KEY" --rpc-url "$RPC" >/dev/null 2>&1 || { echo "✗ addTrustedIssuer falló"; exit 1; }
  else
    EXISTING="$(cast call "$TIR" 'getIssuerClaimTopics(address)(uint256[])' "$ISSUER" --rpc-url "$RPC")"
    NEW_TOPICS="$(printf '%s' "$EXISTING" | tr -d '[]')"
    NEW_TOPICS="${NEW_TOPICS:+$NEW_TOPICS,}$TOPIC"
    cast send "$TIR" 'updateIssuerClaimTopics(address,uint256[])' "$ISSUER" "[$NEW_TOPICS]" --private-key "$ADMIN_KEY" --rpc-url "$RPC" >/dev/null 2>&1 || { echo "✗ updateIssuerClaimTopics falló"; exit 1; }
  fi
  echo "  ✓ issuer autorizado para el topic $TOPIC"
else
  echo "  ✓ issuer ya autorizado para el topic $TOPIC"
fi

echo
echo "[0] Diagnóstico de la implementación desplegada (debe incluir uriHash, D-083)"
EXPECTED_TYPEHASH="$(cast keccak 'Claim(address walletOwner,uint256 topic,uint256 scheme,bytes32 dataHash,uint256 expiresAt,uint256 nonce,bytes32 uriHash)')"
ONCHAIN_TYPEHASH="$(cast call "$IDENTITY" 'CLAIM_TYPEHASH()(bytes32)' --rpc-url "$RPC")"
if [ "$ONCHAIN_TYPEHASH" != "$EXPECTED_TYPEHASH" ]; then
  echo "✗ El Anvil de GCP ejecuta un build ANTERIOR a D-083 (digest sin uriHash)."
  echo "  CLAIM_TYPEHASH esperado (código actual): $EXPECTED_TYPEHASH"
  echo "  CLAIM_TYPEHASH on-chain (desplegado):    $ONCHAIN_TYPEHASH"
  echo "  => El E2E on-chain no puede pasar hasta redesplegar el stack canónico desde rwa-sc."
  echo "     (Redesplegar está fuera del alcance D-088 de @web.)"
  exit 2
fi
echo "  ✓ CLAIM_TYPEHASH on-chain alineado con el código (uriHash incluido)"

echo
echo "[1] El inversor crea la solicitud (sesión SIWE + API)"
start_app apps/identity $ID_PORT
start_app apps/issuer $REG_PORT
for _ in $(seq 1 40); do curl -s --max-time 2 -o /dev/null "http://localhost:$ID_PORT/api/health" && curl -s --max-time 2 -o /dev/null "http://localhost:$REG_PORT/api/health" && break; sleep 1; done
login "http://localhost:$ID_PORT" "$REQUESTER" "$REQUESTER_KEY" /tmp/e2e_jar_req.txt || { echo "✗ login inversor"; exit 1; }
CREATE="$(curl -s --max-time 20 -b /tmp/e2e_jar_req.txt -X POST "http://localhost:$ID_PORT/api/claim-requests" -H 'Content-Type: application/json' \
  -d "$(jq -nc --arg r "$REQUESTER" --arg i "$ISSUER" '{requesterAddress:$r,issuerAddress:$i,claimTopic:"1",message:"E2E O2.7",signedMessage:"requester-signed",signature:"0x"}')")"
CLAIM_ID="$(printf '%s' "$CREATE" | jq -r '.data._id // empty')"
[ -n "$CLAIM_ID" ] && echo "  ✓ solicitud: $CLAIM_ID" || { echo "✗ no se creó la solicitud: $CREATE"; exit 1; }

echo
echo "[2] El emisor firma el claim EIP-712 (nonce on-chain) y la API lo valida"
NONCE="$(cast call "$IDENTITY" 'claimNonce(uint256,address)(uint256)' "$TOPIC" "$ISSUER" --rpc-url "$RPC")"
DATA_HASH="$(cast keccak "$DATA")"
URI_HASH="$(cast keccak "$URI")"
typed_data() {
  jq -nc --arg dh "$DATA_HASH" --arg uh "$URI_HASH" --arg idm "$IDENTITY" --arg w "$REQUESTER" --arg n "$NONCE" '
    {types:{EIP712Domain:[{name:"name",type:"string"},{name:"version",type:"string"},{name:"chainId",type:"uint256"},{name:"verifyingContract",type:"address"}],
            Claim:[{name:"walletOwner",type:"address"},{name:"topic",type:"uint256"},{name:"scheme",type:"uint256"},{name:"dataHash",type:"bytes32"},{name:"expiresAt",type:"uint256"},{name:"nonce",type:"uint256"},{name:"uriHash",type:"bytes32"}]},
     primaryType:"Claim",
     domain:{name:"RWA-Identity",version:"1",chainId:31337,verifyingContract:$idm},
     message:{walletOwner:$w,topic:"1",scheme:"1",dataHash:$dh,expiresAt:"0",nonce:$n,uriHash:$uh}}'
}
CLAIM_SIG="$(cast wallet sign --data "$(typed_data)" --private-key "$ISSUER_KEY" 2>/dev/null)"
CLAIM_PAYLOAD="$(jq -nc --arg idm "$IDENTITY" --arg w "$REQUESTER" --arg n "$NONCE" --arg d "$DATA" --arg u "$URI" \
  '{chainId:31337,identityAddress:$idm,walletOwner:$w,topic:"1",scheme:1,data:$d,uri:$u,expiresAt:"0",nonce:$n}')"
login "http://localhost:$REG_PORT" "$ISSUER" "$ISSUER_KEY" /tmp/e2e_jar_iss.txt || { echo "✗ login emisor"; exit 1; }
REVIEW_CODE="$(code -b /tmp/e2e_jar_iss.txt -X POST "http://localhost:$REG_PORT/api/update-request" -H 'Content-Type: application/json' \
  -d "$(jq -nc --arg id "$CLAIM_ID" --arg s "$CLAIM_SIG" --argjson claim "$CLAIM_PAYLOAD" '{requestId:$id,status:"approved",reviewNote:"E2E",claim:$claim,claimSignature:$s}')")"
check "POST /api/update-request (EIP-712)" 200 "$REVIEW_CODE"
[ "$REVIEW_CODE" = "200" ] || { echo "✗ abortando: sin claim aprobado"; exit 1; }

echo
echo "[3] El inversor envía addClaim (7 args) a su identidad"
TX_OUT="$(cast send "$IDENTITY" 'addClaim(uint256,uint256,address,bytes,bytes,string,uint256)' \
  "$TOPIC" 1 "$ISSUER" "$CLAIM_SIG" "$DATA" "$URI" 0 --private-key "$REQUESTER_KEY" --rpc-url "$RPC" 2>&1)"
if printf '%s' "$TX_OUT" | grep -q 'status.*1 (success)'; then
  echo "  ✓ addClaim confirmado on-chain"
else
  echo "  ✗ addClaim falló:"; printf '%s\n' "$TX_OUT" | tail -5; FAIL=$((FAIL + 1))
fi

echo
echo "[4] Verificación on-chain"
HAS_VALID="$(cast call "$IDENTITY" 'hasValidClaim(uint256,address)(bool)' "$TOPIC" "$ISSUER" --rpc-url "$RPC")"
check "identidad.hasValidClaim($TOPIC, issuer)" true "$HAS_VALID"
IS_VERIFIED="$(cast call "$TOKEN" 'isVerified(address)(bool)' "$REQUESTER" --rpc-url "$RPC")"
check "token.isVerified(inversor)" true "$IS_VERIFIED"

echo
if [ "$FAIL" -eq 0 ]; then
  echo "[test-e2e-o2] ✓ E2E COMPLETO EN VERDE contra el Anvil de GCP"
  exit 0
fi
echo "[test-e2e-o2] ✗ ${FAIL} comprobación(es) fallaron"
exit 1
