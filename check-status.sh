#!/bin/bash

# Script to check status of all RWA services

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔍 RWA Platform Status Check${NC}"
echo -e "${BLUE}=============================${NC}\n"

# Check MongoDB
echo -e "${YELLOW}📊 MongoDB Status:${NC}"
if mongosh --eval "db.serverStatus().ok" --quiet > /dev/null 2>&1; then
    echo -e "${GREEN}✅ MongoDB is running${NC}"
    COLLECTIONS=$(mongosh --eval "use rwa; db.getCollectionNames()" --quiet 2>/dev/null | grep -v "switched" || echo "[]")
    echo -e "${BLUE}   Collections: ${COLLECTIONS}${NC}"
else
    echo -e "${RED}❌ MongoDB is not running${NC}"
    echo -e "${YELLOW}   Start with: brew services start mongodb-community${NC}"
fi

echo ""

# Check Anvil
echo -e "${YELLOW}⛓️  Anvil Status:${NC}"
if lsof -ti:8545 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Anvil is running on port 8545${NC}"
else
    echo -e "${RED}❌ Anvil is not running${NC}"
    echo -e "${YELLOW}   Start with: anvil${NC}"
fi

echo ""

# Check Web Applications
echo -e "${YELLOW}🌐 Web Applications:${NC}"

check_app() {
    local port=$1
    local name=$2
    
    if lsof -ti:${port} > /dev/null 2>&1; then
        echo -e "${GREEN}✅ ${name} is running on port ${port}${NC}"
        echo -e "${BLUE}   http://localhost:${port}${NC}"
    else
        echo -e "${RED}❌ ${name} is not running on port ${port}${NC}"
    fi
}

check_app 4001 "web-identity        "
check_app 4002 "web-registry-trusted"
check_app 4003 "web-token           "

echo ""

# Summary
echo -e "${BLUE}=============================${NC}"
echo -e "${BLUE}📋 Summary:${NC}\n"

RUNNING_COUNT=0
if mongosh --eval "db.serverStatus().ok" --quiet > /dev/null 2>&1; then
    ((RUNNING_COUNT++))
fi
if lsof -ti:8545 > /dev/null 2>&1; then
    ((RUNNING_COUNT++))
fi
if lsof -ti:4001 > /dev/null 2>&1; then
    ((RUNNING_COUNT++))
fi
if lsof -ti:4002 > /dev/null 2>&1; then
    ((RUNNING_COUNT++))
fi
if lsof -ti:4003 > /dev/null 2>&1; then
    ((RUNNING_COUNT++))
fi

echo -e "   Services running: ${RUNNING_COUNT}/5"

if [ $RUNNING_COUNT -eq 5 ]; then
    echo -e "${GREEN}   🎉 All systems operational!${NC}"
elif [ $RUNNING_COUNT -eq 0 ]; then
    echo -e "${RED}   ⚠️  Nothing is running${NC}"
    echo -e "${YELLOW}   Run: ./start-all.sh${NC}"
else
    echo -e "${YELLOW}   ⚠️  Some services are not running${NC}"
fi

echo ""

