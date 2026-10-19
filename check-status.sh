#!/bin/bash
# =============================================================================
# check-status.sh — estado de las 3 apps y de las dependencias (O5.3/O5.8)
#
#   ./check-status.sh
#
# Comprueba /api/health de cada app (incluye comprobación de PostgreSQL y RPC en
# la propia ruta), el RPC canónico y el puerto de PostgreSQL local.
# =============================================================================

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

FAIL=0

echo -e "${BLUE}🔍 RWA Web — estado del entorno${NC}"
echo -e "${BLUE}===============================${NC}\n"

echo -e "${YELLOW}🌐 Aplicaciones (/api/health):${NC}"
for spec in "4001:identity" "4002:issuer" "4003:token"; do
  port="${spec%%:*}"
  name="${spec##*:}"
  body=$(curl -fsS --max-time 5 "http://127.0.0.1:${port}/api/health" 2>/dev/null || true)
  if [ -n "${body}" ]; then
    echo -e "${GREEN}✅ ${name} (:${port}) — ${body}${NC}"
  else
    echo -e "${RED}❌ ${name} (:${port}) no responde${NC}"
    echo -e "${YELLOW}   arranca con: ./start-all.sh${NC}"
    FAIL=$((FAIL + 1))
  fi
done

echo -e "\n${YELLOW}⛓️  RPC canónico:${NC}"
if [ -n "${NEXT_PUBLIC_RPC_URL:-}" ]; then
  if curl -fsS --max-time 5 -X POST -H 'Content-Type: application/json' \
    --data '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}' \
    "${NEXT_PUBLIC_RPC_URL}" >/dev/null 2>&1; then
    echo -e "${GREEN}✅ RPC responde (${NEXT_PUBLIC_RPC_URL})${NC}"
  else
    echo -e "${RED}❌ RPC no responde (${NEXT_PUBLIC_RPC_URL})${NC}"
    FAIL=$((FAIL + 1))
  fi
else
  echo -e "${YELLOW}⚠️  NEXT_PUBLIC_RPC_URL no definida (source scripts/gcp-env.sh --tcp)${NC}"
fi

echo -e "\n${YELLOW}📊 PostgreSQL local (:5432):${NC}"
if lsof -ti:5432 >/dev/null 2>&1; then
  echo -e "${GREEN}✅ PostgreSQL escuchando en :5432${NC}"
else
  echo -e "${YELLOW}ℹ️  Sin PostgreSQL local (usa DATABASE_URL de Cloud SQL o docker compose)${NC}"
fi

echo -e "\n${BLUE}===============================${NC}"
if [ "${FAIL}" -eq 0 ]; then
  echo -e "${GREEN}✅ 3/3 apps sanas${NC}"
  exit 0
fi
echo -e "${YELLOW}⚠️  ${FAIL} comprobación(es) fallida(s)${NC}"
exit 1
