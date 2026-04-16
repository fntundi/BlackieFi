#!/usr/bin/env bash
# smoke-test.sh — Post-deployment health verification
# Usage: ./jenkins/scripts/smoke-test.sh <base-url>
set -euo pipefail

BASE_URL="${1:?Usage: smoke-test.sh <base-url>}"
PASS=0
FAIL=0

check() {
  local name="$1" url="$2" expect="$3"
  local status body
  status=$(curl -sf -o /dev/null -w '%{http_code}' --max-time 10 "${url}" 2>/dev/null) || status="000"
  if [[ "$status" == "$expect" ]]; then
    echo "  PASS  ${name} (HTTP ${status})"
    ((PASS++))
  else
    echo "  FAIL  ${name} — expected ${expect}, got ${status}"
    ((FAIL++))
  fi
}

echo "=== BlackieFi Smoke Test ==="
echo "    Target: ${BASE_URL}"
echo ""

check "Nginx /health"            "${BASE_URL}/health"              "200"
check "Frontend /"               "${BASE_URL}/"                    "200"
check "Gateway /api/health"      "${BASE_URL}/api/health"          "200"
check "Auth /api/auth/health"    "${BASE_URL}/api/auth/health"     "200"
check "Currency /api/currency/rates" "${BASE_URL}/api/currency/rates" "200"

echo ""
echo "=== Results: ${PASS} passed, ${FAIL} failed ==="

if [[ $FAIL -gt 0 ]]; then
  echo "SMOKE TEST FAILED"
  exit 1
fi
echo "ALL CHECKS PASSED"
