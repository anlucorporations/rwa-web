#!/usr/bin/env bash
# =============================================================================
# smoke_app_o0.sh — Prueba de humo de APLICACIÓN del ciclo O0 (O0.7)
# =============================================================================
# Uso:
#   ./scripts/smoke_app_o0.sh
#
# Requiere que las apps estén construidas (`pnpm --filter <app> build`).
# Levanta web-identity y web-token con el entorno real de GCP y comprueba que
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

# probe <app-dir> <port> <path> <esperado-substring>
probe() {
  local app=$1 port=$2 path=$3 expected=$4
  local log="/tmp/${app}-${port}.log"
  if ! curl -s --max-time 10 "http://localhost:${port}/" -o /dev/null 2>/dev/null; then
    : # la raíz puede redirigir; el probe real es el de la API
  fi
  local body status
  body="$(curl -s --max-time 20 -w '\n%{http_code}' "http://localhost:${port}${path}" 2>/dev/null)"
  status="$(printf '%s' "$body" | tail -n1)"
  body="$(printf '%s' "$body" | sed '$d')"
  if [ "$status" = "200" ] && printf '%s' "$body" | grep -q "$expected"; then
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
  ( cd "$ROOT/$app" && exec npx next start -p "$port" > "/tmp/${app}-${port}.log" 2>&1 ) &
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

echo "[smoke-app-o0] Levantando web-identity (4101) y web-token (4103)…"
start_app web-identity 4101
start_app web-token 4103
sleep 3

probe web-identity 4101 /api/claim-requests '"success":true'
probe web-identity 4101 /api/test-gridfs '"success":true'
probe web-identity 4101 /api/health '"chainId":31337'
probe web-token 4103 /api/tokens '"success":true'
probe web-token 4103 /api/test-db '"database":"rwa"'
probe web-token 4103 /api/health '"database":"ok"'

echo
if [ "$fail" -eq 0 ]; then
  echo "[smoke-app-o0] ✓ 6/6 rutas en verde sobre PostgreSQL (incluye /api/health)"
  exit 0
fi
echo "[smoke-app-o0] ✗ ${fail} ruta(s) fallaron"
exit 1
