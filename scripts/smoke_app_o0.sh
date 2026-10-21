#!/usr/bin/env bash
# =============================================================================
# smoke_app_o0.sh — Prueba de humo de APLICACIÓN del ciclo O0 (O0.7)
# =============================================================================
# Uso:
#   ./scripts/smoke_app_o0.sh
#
# Requiere que las apps estén construidas (`pnpm --filter <app> build`).
# Levanta apps/identity y apps/token con el entorno real de GCP y comprueba que
# sus rutas de API responden 200 sirviendo datos desde PostgreSQL (nada de Mongo).
# =============================================================================
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# shellcheck disable=SC1091
source "$ROOT/scripts/gcp-env.sh" --tcp

PIDS=()
PORTS=(4101 4103)

# Libera un puerto matando el proceso que lo escucha (next-server sobrevive a `kill` del wrapper).
free_port() {
  local port=$1 pid
  pid="$(ss -ltnp 2>/dev/null | grep ":${port} " | grep -oP 'pid=\K[0-9]+' | head -1)"
  if [ -n "$pid" ]; then kill -9 "$pid" 2>/dev/null || true; fi
}

cleanup() {
  for pid in "${PIDS[@]:-}"; do
    [ -n "$pid" ] && kill "$pid" 2>/dev/null || true
  done
  for port in "${PORTS[@]}"; do free_port "$port"; done
}
trap cleanup EXIT

fail=0

# probe <app-dir> <port> <path> <status-esperado> <substring-esperada>
probe() {
  local app=$1 port=$2 path=$3 expected_status=$4 expected=$5
  local log="/tmp/${app//\//-}-${port}.log"
  local body status
  body="$(curl -s --max-time 20 -w '\n%{http_code}' "http://localhost:${port}${path}" 2>/dev/null)"
  status="$(printf '%s' "$body" | tail -n1)"
  body="$(printf '%s' "$body" | sed '$d')"
  local body_ok=1
  if [ "$expected_status" = "200" ]; then
    printf '%s' "$body" | grep -q "$expected" || body_ok=0
  fi
  if [ "$status" = "$expected_status" ] && [ "$body_ok" -eq 1 ]; then
    echo "✓ ${app} GET ${path} → HTTP ${status} · ${body:0:120}"
  else
    echo "✗ ${app} GET ${path} → HTTP ${status} · ${body:0:200}"
    fail=$((fail + 1))
  fi
  echo "  (log: ${log})"
}

start_app() {
  local app=$1 port=$2
  free_port "$port"
  ( cd "$ROOT/$app" && exec npx next start -p "$port" > "/tmp/${app//\//-}-${port}.log" 2>&1 ) &
  PIDS+=("$!")
  # espera activa a que el puerto responda (máx. 30 s)
  for _ in $(seq 1 30); do
    if curl -s --max-time 2 -o /dev/null "http://localhost:${port}/api/claim-requests" \
       || curl -s --max-time 2 -o /dev/null "http://localhost:${port}/api/tokens"; then
      return 0
    fi
    sleep 1
  done
  return 0
}

echo "[smoke-app-o0] Levantando apps/identity (4101) y apps/token (4103)…"
start_app apps/identity 4101
start_app apps/token 4103
sleep 3

# Rutas protegidas sin sesión → 401; endpoints de depuración retirados → 404.
probe apps/identity 4101 /api/claim-requests 401 'UNAUTHORIZED'
probe apps/identity 4101 /api/test-gridfs 404 'NOT_FOUND'
probe apps/identity 4101 /api/health 200 '"chainId":31337'
probe apps/token 4103 /api/tokens 200 '"success":true'
probe apps/token 4103 /api/test-db 404 'NOT_FOUND'
probe apps/token 4103 /api/health 200 '"database":"ok"'

echo
if [ "$fail" -eq 0 ]; then
  echo "[smoke-app-o0] ✓ 6/6 rutas en verde sobre PostgreSQL (auth + depuración retirada + /api/health)"
  exit 0
fi
echo "[smoke-app-o0] ✗ ${fail} ruta(s) fallaron"
exit 1
