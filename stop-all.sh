#!/bin/bash

# Script to stop all RWA web applications

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${RED}🛑 Stopping RWA Web Applications${NC}"
echo -e "${RED}================================${NC}\n"

# Function to kill process on a port
kill_port() {
    local port=$1
    local name=$2
    
    echo -e "${YELLOW}Stopping ${name} on port ${port}...${NC}"
    
    if lsof -ti:${port} > /dev/null 2>&1; then
        lsof -ti:${port} | xargs kill -9 2>/dev/null || true
        sleep 1
        echo -e "${GREEN}✅ ${name} stopped${NC}"
    else
        echo -e "${BLUE}ℹ️  ${name} was not running${NC}"
    fi
}

# Kill all applications
kill_port 4001 "web-identity"
kill_port 4002 "web-registry-trusted"
kill_port 4003 "web-token"

# Clean up PID files
rm -f .pids/*.pid 2>/dev/null || true

echo -e "\n${GREEN}✅ All applications stopped${NC}\n"

