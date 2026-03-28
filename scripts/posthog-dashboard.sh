#!/usr/bin/env bash
# Creates PostHog dashboard + insights via API
# Usage: POSTHOG_API_KEY=phx_... ./scripts/posthog-dashboard.sh [project_id]
#
# Requires: POSTHOG_API_KEY (personal API key from PostHog settings)
# The PUBLIC_POSTHOG_KEY (project key) is different — that's for the JS SDK.

set -euo pipefail

API_KEY="${POSTHOG_API_KEY:?Set POSTHOG_API_KEY (personal API key from PostHog > Settings > Personal API keys)}"
PROJECT_ID="${1:-}"
HOST="https://eu.posthog.com"

G='\033[0;32m' R='\033[0;31m' Y='\033[0;33m' B='\033[0;34m' NC='\033[0m'

api() {
    local method="$1" path="$2" data="${3:-}"
    local args=(-s -H "Authorization: Bearer ${API_KEY}" -H "Content-Type: application/json")
    [ -n "$data" ] && args+=(-d "$data")
    curl "${args[@]}" -X "$method" "${HOST}${path}"
}

# Auto-detect project ID if not provided
if [ -z "$PROJECT_ID" ]; then
    echo -e "${Y}Detecting project ID...${NC}"
    PROJECT_ID=$(api GET "/api/projects/" | jq -r '.results[0].id')
    if [ -z "$PROJECT_ID" ] || [ "$PROJECT_ID" = "null" ]; then
        echo -e "${R}Could not detect project ID. Pass it as argument.${NC}"
        exit 1
    fi
    echo -e "  Using project: ${PROJECT_ID}"
fi

BASE="/api/projects/${PROJECT_ID}"

echo -e "${B}=== Creating Fundid Dashboard ===${NC}"
echo ""

# Create the dashboard
echo -e "${Y}Creating dashboard...${NC}"
DASHBOARD=$(api POST "${BASE}/dashboards/" '{
    "name": "Fundid — Operations",
    "description": "Core metrics, health, and user activity for fundid.is",
    "creation_mode": "default"
}')
DASHBOARD_ID=$(echo "$DASHBOARD" | jq -r '.id')
echo -e "  ${G}Dashboard created${NC}: ID ${DASHBOARD_ID}"

# Helper to create an insight and add it to the dashboard
create_insight() {
    local name="$1" query="$2"
    local payload=$(jq -n --arg name "$name" --argjson query "$query" --argjson did "$DASHBOARD_ID" '{
        name: $name,
        query: $query,
        dashboards: [$did]
    }')
    local result=$(api POST "${BASE}/insights/" "$payload")
    local id=$(echo "$result" | jq -r '.id')
    echo -e "  ${G}+${NC} ${name} (insight ${id})"
}

echo ""
echo -e "${Y}Creating insights...${NC}"

# 1. Pageviews over time (trend)
create_insight "Pageviews (daily)" '{
    "kind": "TrendsQuery",
    "series": [{"event": "$pageview", "kind": "EventsNode"}],
    "interval": "day",
    "dateRange": {"date_from": "-30d"}
}'

# 2. Reports submitted (lost vs found)
create_insight "Reports submitted (lost vs found)" '{
    "kind": "TrendsQuery",
    "series": [
        {"event": "report_form_submitted", "kind": "EventsNode", "properties": [{"key": "type", "value": "lost", "type": "event"}], "custom_name": "Lost"},
        {"event": "report_form_submitted", "kind": "EventsNode", "properties": [{"key": "type", "value": "found", "type": "event"}], "custom_name": "Found"}
    ],
    "interval": "day",
    "dateRange": {"date_from": "-30d"}
}'

# 3. Contact messages sent
create_insight "Contact messages sent" '{
    "kind": "TrendsQuery",
    "series": [{"event": "contact_message_sent", "kind": "EventsNode"}],
    "interval": "day",
    "dateRange": {"date_from": "-30d"}
}'

# 4. Items resolved
create_insight "Items resolved" '{
    "kind": "TrendsQuery",
    "series": [{"event": "resolve_completed", "kind": "EventsNode"}],
    "interval": "day",
    "dateRange": {"date_from": "-30d"}
}'

# 5. Report funnel: opened form → submitted
create_insight "Report funnel (open → submit)" '{
    "kind": "FunnelsQuery",
    "series": [
        {"event": "report_form_opened", "kind": "EventsNode"},
        {"event": "report_form_submitted", "kind": "EventsNode"}
    ],
    "funnelsFilter": {"funnelWindowInterval": 30, "funnelWindowIntervalUnit": "minute"},
    "dateRange": {"date_from": "-30d"}
}'

# 6. Contact funnel: card click → modal → message sent
create_insight "Contact funnel (click → open → send)" '{
    "kind": "FunnelsQuery",
    "series": [
        {"event": "item_card_clicked", "kind": "EventsNode"},
        {"event": "contact_modal_opened", "kind": "EventsNode"},
        {"event": "contact_message_sent", "kind": "EventsNode"}
    ],
    "funnelsFilter": {"funnelWindowInterval": 30, "funnelWindowIntervalUnit": "minute"},
    "dateRange": {"date_from": "-30d"}
}'

# 7. Resolve funnel: started → completed
create_insight "Resolve funnel (start → complete)" '{
    "kind": "FunnelsQuery",
    "series": [
        {"event": "resolve_started", "kind": "EventsNode"},
        {"event": "resolve_completed", "kind": "EventsNode"}
    ],
    "funnelsFilter": {"funnelWindowInterval": 10, "funnelWindowIntervalUnit": "minute"},
    "dateRange": {"date_from": "-30d"}
}'

# 8. Category breakdown
create_insight "Reports by category" '{
    "kind": "TrendsQuery",
    "series": [{"event": "report_form_submitted", "kind": "EventsNode"}],
    "breakdownFilter": {"breakdowns": [{"property": "category", "type": "event"}]},
    "interval": "day",
    "dateRange": {"date_from": "-30d"}
}'

# 9. Language usage
create_insight "Language distribution" '{
    "kind": "TrendsQuery",
    "series": [{"event": "language_changed", "kind": "EventsNode"}],
    "breakdownFilter": {"breakdowns": [{"property": "to", "type": "event"}]},
    "interval": "week",
    "dateRange": {"date_from": "-30d"}
}'

# 10. Map vs list view preference
create_insight "View toggle (map vs list)" '{
    "kind": "TrendsQuery",
    "series": [{"event": "view_toggled", "kind": "EventsNode"}],
    "breakdownFilter": {"breakdowns": [{"property": "view", "type": "event"}]},
    "interval": "week",
    "dateRange": {"date_from": "-30d"}
}'

# 11. Photo usage in reports
create_insight "Reports with photo %" '{
    "kind": "TrendsQuery",
    "series": [
        {"event": "report_form_submitted", "kind": "EventsNode", "properties": [{"key": "has_photo", "value": true, "type": "event"}], "custom_name": "With photo"},
        {"event": "report_form_submitted", "kind": "EventsNode", "properties": [{"key": "has_photo", "value": false, "type": "event"}], "custom_name": "Without photo"}
    ],
    "interval": "week",
    "dateRange": {"date_from": "-30d"}
}'

echo ""
echo -e "${G}=== Done ===${NC}"
echo -e "Dashboard URL: ${HOST}/project/${PROJECT_ID}/dashboard/${DASHBOARD_ID}"
echo ""
echo -e "${Y}Next steps:${NC}"
echo "  1. Set PUBLIC_POSTHOG_KEY in Cloudflare Pages env vars"
echo "  2. Run this script once after PostHog project is created"
echo "  3. Dashboard auto-populates as events flow in"
