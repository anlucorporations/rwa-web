#!/bin/bash
# =============================================================================
# start-all.sh — arranca las 3 apps del monorepo en desarrollo (O5.3)
#
#   ./start-all.sh            # identity 4001 · issuer 4002 · token 4003
#
# Logs en logs/<app>.log y PIDs en .pids/<app>.pid.
# =============================================================================

set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

APP_ROLES=("identity" "issuer" "token")
APP_PORTS=("4001" "4002" "4003")
APP_LABELS=("identity (inversor)" "issuer (emisor)" "token (mercado)")

mkdir -p logs .pids

echo -e "${BLUE}🚀 RWA Web — arranque de las 3 apps${NC}"
echo -e "${BLUE}===================================${NC}\n"

for i in "${!APP_PORTS[@]}"; do
  port="${APP_PORTS[$i]}"
  if lsof -ti:"${port}" >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Puerto ${port} ocupado: matando proceso${NC}"
    lsof -ti:"${port}" | xargs kill -9 2>/dev/null || true
  fi
done

sleep 1

for i in "${!APP_ROLES[@]}"; do
  app="${APP_ROLES[$i]}"
  port="${APP_PORTS[$i]}"
  echo -e "${GREEN}▶ @rwa/${app} en :${port}${NC}"
  nohup pnpm "dev:${app}" >"logs/${app}.log" 2>&1 &
  echo $! >".pids/${app}.pid"
  echo -e "${GREEN}   PID $(cat ".pids/${app}.pid")${NC}"
done

echo -e "\n${BLUE}⏳ Esperando a que respondan /api/health...${NC}"
for i in "${!APP_PORTS[@]}"; do
  port="${APP_PORTS[$i]}"
  ready=0
  for _ in $(seq 1 30); do
    if curl -fsS "http://127.0.0.1:${port}/api/health" >/dev/null 2>&1; then
      echo -e "${GREEN}✅ ${APP_LABELS[$i]} (:${port}) sana${NC}"
      ready=1
      break
    fi
    sleep 2
  done
  if [ "${ready}" -eq 0 ]; then
    echo -e "${YELLOW}⚠️  ${APP_LABELS[$i]} (:${port}) no respondió; revisa logs/${APP_ROLES[$i]}.log${NC}"
  fi
done

echo -e "\n${BLUE}📋 Resumen${NC}"
for i in "${!APP_PORTS[@]}"; do
  echo -e "   ${APP_LABELS[$i]}: http://127.0.0.1:${APP_PORTS[$i]}"
done
echo -e "\n   Logs: tail -f logs/<identity|issuer|token>.log"
echo -e "   Parar: ./stop-all.sh\n"
