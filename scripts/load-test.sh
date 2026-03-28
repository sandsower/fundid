#!/usr/bin/env bash
# Load test for fundid — tests Supabase queries and storage
# Usage: ./scripts/load-test.sh [base_url] [concurrency] [requests]
#
# Requires: curl, jq
# Optional: hey (go install github.com/rakyll/hey@latest) for concurrent load

set -euo pipefail

BASE_URL="${1:-http://localhost:5173}"
CONCURRENCY="${2:-10}"
REQUESTS="${3:-100}"

# Colors
G='\033[0;32m' R='\033[0;31m' Y='\033[0;33m' B='\033[0;34m' NC='\033[0m'

echo -e "${B}=== Fundid Load Test ===${NC}"
echo "Target: $BASE_URL"
echo "Concurrency: $CONCURRENCY | Total requests: $REQUESTS"
echo ""

# --- 1. Health check ---
echo -e "${Y}[1/5] Health check${NC}"
health=$(curl -s -w '\n%{http_code} %{time_total}' "$BASE_URL/api/health" 2>/dev/null) || true
http_code=$(echo "$health" | tail -1 | awk '{print $1}')
time_total=$(echo "$health" | tail -1 | awk '{print $2}')
body=$(echo "$health" | head -n -1)

if [ "$http_code" = "200" ]; then
    echo -e "  ${G}OK${NC} (${time_total}s)"
    echo "$body" | jq -r '  "  DB: \(.checks.database.ms)ms | Storage: \(.checks.storage.ms)ms"' 2>/dev/null || true
else
    echo -e "  ${R}FAIL${NC} HTTP $http_code (${time_total}s)"
    echo "$body" | jq . 2>/dev/null || echo "$body"
fi
echo ""

# --- 2. Supabase REST API: list items ---
# Extract Supabase URL from .env or env
SUPABASE_URL="${PUBLIC_SUPABASE_URL:-}"
SUPABASE_KEY="${PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY:-}"

if [ -z "$SUPABASE_URL" ]; then
    if [ -f .env ]; then
        SUPABASE_URL=$(grep PUBLIC_SUPABASE_URL .env | cut -d= -f2- | tr -d '"' | tr -d "'")
        SUPABASE_KEY=$(grep PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY .env | cut -d= -f2- | tr -d '"' | tr -d "'")
    fi
fi

if [ -z "$SUPABASE_URL" ]; then
    echo -e "${R}No SUPABASE_URL found in env or .env — skipping API tests${NC}"
    exit 1
fi

echo -e "${Y}[2/5] Items listing query (single)${NC}"
items_start=$(date +%s%N)
items_resp=$(curl -s -w '\n%{http_code}' \
    "${SUPABASE_URL}/rest/v1/items?status=eq.active&order=created_at.desc&limit=50&select=id,type,category,title,description,image_url,latitude,longitude,location_name,date_occurred,status,contact_method,created_at,updated_at" \
    -H "apikey: ${SUPABASE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_KEY}")
items_code=$(echo "$items_resp" | tail -1)
items_ms=$(( ($(date +%s%N) - items_start) / 1000000 ))

if [ "$items_code" = "200" ]; then
    count=$(echo "$items_resp" | head -n -1 | jq 'length' 2>/dev/null || echo "?")
    echo -e "  ${G}OK${NC} ${items_ms}ms — returned ${count} items"
else
    echo -e "  ${R}FAIL${NC} HTTP $items_code (${items_ms}ms)"
fi
echo ""

# --- 3. PostGIS nearby_items RPC ---
echo -e "${Y}[3/5] PostGIS nearby_items RPC (single)${NC}"
geo_start=$(date +%s%N)
geo_resp=$(curl -s -w '\n%{http_code}' \
    "${SUPABASE_URL}/rest/v1/rpc/nearby_items" \
    -H "apikey: ${SUPABASE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_KEY}" \
    -H "Content-Type: application/json" \
    -d '{"lat": 64.1466, "lng": -21.9426, "radius_km": 10}')
geo_code=$(echo "$geo_resp" | tail -1)
geo_ms=$(( ($(date +%s%N) - geo_start) / 1000000 ))

if [ "$geo_code" = "200" ]; then
    geo_count=$(echo "$geo_resp" | head -n -1 | jq 'length' 2>/dev/null || echo "?")
    echo -e "  ${G}OK${NC} ${geo_ms}ms — ${geo_count} nearby items"
else
    echo -e "  ${R}FAIL${NC} HTTP $geo_code (${geo_ms}ms)"
    echo "$geo_resp" | head -n -1 | jq -r '.message // .' 2>/dev/null || true
fi
echo ""

# --- 4. Storage: list bucket ---
echo -e "${Y}[4/5] Storage bucket list (single)${NC}"
storage_start=$(date +%s%N)
storage_resp=$(curl -s -w '\n%{http_code}' \
    "${SUPABASE_URL}/storage/v1/object/list/item-images" \
    -H "apikey: ${SUPABASE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_KEY}" \
    -H "Content-Type: application/json" \
    -d '{"limit": 5, "prefix": ""}')
storage_code=$(echo "$storage_resp" | tail -1)
storage_ms=$(( ($(date +%s%N) - storage_start) / 1000000 ))

if [ "$storage_code" = "200" ]; then
    img_count=$(echo "$storage_resp" | head -n -1 | jq 'length' 2>/dev/null || echo "?")
    echo -e "  ${G}OK${NC} ${storage_ms}ms — ${img_count} objects listed"
else
    echo -e "  ${R}FAIL${NC} HTTP $storage_code (${storage_ms}ms)"
fi
echo ""

# --- 5. Concurrent load (requires 'hey') ---
echo -e "${Y}[5/5] Concurrent load test${NC}"
if command -v hey &>/dev/null; then
    echo "  Testing items listing: $CONCURRENCY concurrent, $REQUESTS total"
    hey -n "$REQUESTS" -c "$CONCURRENCY" -m GET \
        -H "apikey: ${SUPABASE_KEY}" \
        -H "Authorization: Bearer ${SUPABASE_KEY}" \
        "${SUPABASE_URL}/rest/v1/items?status=eq.active&order=created_at.desc&limit=50&select=id,type,title,latitude,longitude,location_name" \
        2>/dev/null | grep -E '(Requests/sec|Average|Fastest|Slowest|Status code)'

    echo ""
    echo "  Testing nearby_items RPC: $CONCURRENCY concurrent, $REQUESTS total"
    hey -n "$REQUESTS" -c "$CONCURRENCY" -m POST \
        -H "apikey: ${SUPABASE_KEY}" \
        -H "Authorization: Bearer ${SUPABASE_KEY}" \
        -H "Content-Type: application/json" \
        -d '{"lat": 64.1466, "lng": -21.9426, "radius_km": 10}' \
        "${SUPABASE_URL}/rest/v1/rpc/nearby_items" \
        2>/dev/null | grep -E '(Requests/sec|Average|Fastest|Slowest|Status code)'
else
    echo -e "  ${Y}SKIP${NC} — install 'hey' for concurrent testing:"
    echo "    go install github.com/rakyll/hey@latest"
    echo ""
    echo "  Running sequential burst instead (${CONCURRENCY} requests)..."
    success=0
    fail=0
    total_ms=0
    for i in $(seq 1 "$CONCURRENCY"); do
        req_start=$(date +%s%N)
        code=$(curl -s -o /dev/null -w '%{http_code}' \
            "${SUPABASE_URL}/rest/v1/items?status=eq.active&order=created_at.desc&limit=50&select=id,type,title" \
            -H "apikey: ${SUPABASE_KEY}" \
            -H "Authorization: Bearer ${SUPABASE_KEY}")
        req_ms=$(( ($(date +%s%N) - req_start) / 1000000 ))
        total_ms=$((total_ms + req_ms))
        if [ "$code" = "200" ]; then ((success++)); else ((fail++)); fi
    done
    avg=$((total_ms / CONCURRENCY))
    echo -e "  ${G}${success}/${CONCURRENCY} OK${NC} | avg ${avg}ms | total ${total_ms}ms"
    [ "$fail" -gt 0 ] && echo -e "  ${R}${fail} failures${NC}"
fi

echo ""
echo -e "${B}=== Summary ===${NC}"
echo "Health: $BASE_URL/api/health"
echo "Items query: ${items_ms}ms | Nearby RPC: ${geo_ms}ms | Storage: ${storage_ms}ms"
echo ""
echo -e "${Y}Capacity estimates (Supabase free tier):${NC}"
echo "  DB connections: 60 direct / 200 pooled (PgBouncer)"
echo "  Storage: 1GB (at ~200KB/image = ~5,000 images)"
echo "  Edge functions: 500k invocations/mo"
echo "  Bandwidth: 5GB/mo (images served via CDN)"
echo ""
echo -e "${Y}Capacity estimates (Supabase Pro \$25/mo):${NC}"
echo "  DB connections: 60 direct / 400 pooled"
echo "  Storage: 100GB (~500,000 images)"
echo "  Edge functions: 2M invocations/mo"
echo "  Bandwidth: 250GB/mo"
