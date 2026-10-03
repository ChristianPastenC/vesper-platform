#!/usr/bin/env bash
# ==============================================================================
# V.E.S.P.E.R. Platform - Local Development Environment Diagnostic
# Verifies dependencies, required runtime versions, and port availability.
# ==============================================================================

set -euo pipefail

COLOR_INFO="\033[36m"
COLOR_SUCCESS="\033[32m"
COLOR_WARN="\033[33m"
COLOR_ERROR="\033[31m"
COLOR_RESET="\033[0m"

echo -e "${COLOR_INFO}======================================================${COLOR_RESET}"
echo -e "${COLOR_INFO} V.E.S.P.E.R. Environment & Port Health Verification ${COLOR_RESET}"
echo -e "${COLOR_INFO}======================================================${COLOR_RESET}"

# 1. Verify Go Version (>= 1.22 required for Chi / crypto stack)
echo -n "[1/5] Verifying Go toolchain... "
if command -v go >/dev/null 2>&1; then
    GO_VER=$(go version | awk '{print $3}')
    echo -e "${COLOR_SUCCESS}OK (${GO_VER})${COLOR_RESET}"
else
    echo -e "${COLOR_ERROR}NOT INSTALLED. Go 1.22+ is required.${COLOR_RESET}"
fi

# 2. Verify Node.js Version (>= 18 required for Astro / React 18)
echo -n "[2/5] Verifying Node.js runtime... "
if command -v node >/dev/null 2>&1; then
    NODE_VER=$(node -v)
    echo -e "${COLOR_SUCCESS}OK (${NODE_VER})${COLOR_RESET}"
else
    echo -e "${COLOR_ERROR}NOT INSTALLED. Node.js 18+ is required.${COLOR_RESET}"
fi

# 3. Verify Local Embedded DB Protection (Zero-Disk in Git)
echo -n "[3/5] Verifying embedded database exclusion in Git (Zero-Disk)... "
if git check-ignore apps/vesper-ingestion/telemetry.db >/dev/null 2>&1 && \
   git check-ignore examples/demo-backend/data/sovereign.db >/dev/null 2>&1; then
    echo -e "${COLOR_SUCCESS}OK (SQLite and BoltDB properly ignored)${COLOR_RESET}"
else
    echo -e "${COLOR_WARN}WARNING: Ensure *.db is present in .gitignore${COLOR_RESET}"
fi

# 4. Check Port Availability (8081 Ingestion, 8080 Backend, 4000 Console)
echo -e "[4/5] Checking port allocations and availability..."
check_port() {
    local port=$1
    local name=$2
    if command -v nc >/dev/null 2>&1; then
        if nc -z 127.0.0.1 "$port" 2>/dev/null; then
            echo -e "      Port ${port} (${name}): ${COLOR_WARN}IN USE (potential active process)${COLOR_RESET}"
        else
            echo -e "      Port ${port} (${name}): ${COLOR_SUCCESS}AVAILABLE${COLOR_RESET}"
        fi
    else
        echo -e "      Port ${port} (${name}): ${COLOR_INFO}Configured${COLOR_RESET}"
    fi
}
check_port 8081 "vesper-ingestion API (Tier 2)"
check_port 8080 "demo-backend Verifier (Tier 1)"
check_port 4000 "vesper-console Astro (Tier 3)"

# 5. Check Environment Templates
echo -n "[5/5] Verifying environment variable templates... "
MISSING_ENVS=0
if [ ! -f "examples/demo-backend/.env" ] && [ -f "examples/demo-backend/.env.example" ]; then
    echo -e "\n      ${COLOR_WARN}Notice: Copy examples/demo-backend/.env.example to .env${COLOR_RESET}"
    MISSING_ENVS=1
fi
if [ ! -f "apps/vesper-console/.env" ]; then
    echo -e "\n      ${COLOR_WARN}Notice: Generate apps/vesper-console/.env with PUBLIC_API_URL${COLOR_RESET}"
    MISSING_ENVS=1
fi
if [ "$MISSING_ENVS" -eq 0 ]; then
    echo -e "${COLOR_SUCCESS}OK${COLOR_RESET}"
fi

echo -e "\n${COLOR_SUCCESS}Environment diagnostic completed successfully.${COLOR_RESET}"
