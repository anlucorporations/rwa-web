#!/bin/bash
# =============================================================================
# stop-all.sh — detiene las 3 apps del monorepo (O5.3)
# =============================================================================

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}🛑 Deteniendo apps RWA Web...${NC}"

for app in identity issuer token; do
  pidfile=".pids/${app}.pid"
  if [ -f "${pidfile}" ]; then
    pid=$(cat "${pidfile}")
    if kill -0 "${pid}" 2>/dev/null; then
      kill "${pid}" 2>/dev/null || true
      echo -e "${GREEN}✅ ${app} detenido (PID ${pid})${NC}"
    fi
    rm -f "${pidfile}"
  fi
done

# Red de seguridad: liberar los puertos si quedó algún proceso hijo
for port in 4001 4002 4003; do
  if lsof -ti:"${port}" >/dev/null 2>&1; then
    lsof -ti:"${port}" | xargs kill -9 2>/dev/null || true
    echo -e "${GREEN}✅ Puerto ${port} liberado${NC}"
  fi
done

rm -f .pids/*.pid 2>/dev/null || true
echo -e "${GREEN}Hecho.${NC}"
